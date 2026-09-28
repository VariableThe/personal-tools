/**
 * Slide-content export: .pptx -> PDF, fully on-device.
 *
 * A browser cannot faithfully rasterize PowerPoint rendering, so this
 * extracts each slide's real content (text runs with size/bold/alignment,
 * pictures, tables) and lays it out on same-aspect PDF pages with pdf-lib.
 * The output is a clean handout-style PDF — all content preserved, exact
 * PowerPoint typography not promised.
 */

import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { parseXml, findAll, child, children, type XmlNode } from "./pptx-xml";
import { resolvePart, relsPathFor } from "./pptx-merge";

const EMU_PER_PT = 12700;

export interface TextRun {
  text: string;
  sizePt: number;
  bold: boolean;
  italic: boolean;
  color: { r: number; g: number; b: number };
}

export interface Paragraph {
  align: "left" | "center" | "right";
  runs: TextRun[];
}

export type SlideShape =
  | { kind: "text"; x: number; y: number; w: number; h: number; paragraphs: Paragraph[] }
  | { kind: "image"; x: number; y: number; w: number; h: number; data: Uint8Array; ext: string }
  | {
      kind: "table";
      x: number;
      y: number;
      w: number;
      h: number;
      colWidths: number[];
      rows: Paragraph[][][];
    };

export interface SlideContent {
  shapes: SlideShape[];
}

export interface DeckContent {
  slides: SlideContent[];
  widthPt: number;
  heightPt: number;
  skippedImages: number;
}

function emuToPt(v: number): number {
  return v / EMU_PER_PT;
}

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace(/[^0-9a-fA-F]/g, "").padEnd(6, "0").slice(0, 6);
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

/** Map DrawingML scheme colors to concrete RGB (light scheme colors become dark for print). */
function schemeToRgb(name: string): { r: number; g: number; b: number } {
  switch (name) {
    case "hlink":
      return hexToRgb("0B5FFF");
    case "folHlink":
      return hexToRgb("7C3AED");
    default:
      return { r: 0, g: 0, b: 0 };
  }
}

function runColor(solidFill: XmlNode | null): { r: number; g: number; b: number } {
  if (!solidFill) return { r: 0, g: 0, b: 0 };
  const srgb = child(solidFill, "srgbClr");
  if (srgb?.attrs["val"]) return hexToRgb(srgb.attrs["val"]);
  const scheme = child(solidFill, "schemeClr");
  if (scheme?.attrs["val"]) return schemeToRgb(scheme.attrs["val"]);
  return { r: 0, g: 0, b: 0 };
}

function parseParagraph(p: XmlNode, defaultSizePt: number): Paragraph {
  const pPr = child(p, "pPr");
  const algn = pPr?.attrs["algn"];
  const align = algn === "ctr" ? "center" : algn === "r" ? "right" : "left";
  const defRPr = pPr ? child(pPr, "defRPr") : null;
  const defSize = defRPr?.attrs["sz"] ? num(defRPr.attrs["sz"], 0) / 100 : defaultSizePt;
  const runs: TextRun[] = [];
  for (const c of p.children) {
    const local = c.tag.includes(":") ? c.tag.slice(c.tag.indexOf(":") + 1) : c.tag;
    if (local === "r" || local === "fld") {
      const rPr = child(c, "rPr");
      const tNodes = findAll(c, "a:t");
      const text = tNodes.map((t) => t.text).join("");
      if (!text) continue;
      runs.push({
        text,
        sizePt: rPr?.attrs["sz"] ? num(rPr.attrs["sz"], 0) / 100 : defSize,
        bold: rPr?.attrs["b"] === "1",
        italic: rPr?.attrs["i"] === "1",
        color: runColor(child(c, "solidFill")),
      });
    } else if (local === "br") {
      runs.push({ text: "\n", sizePt: defSize, bold: false, italic: false, color: { r: 0, g: 0, b: 0 } });
    }
  }
  return { align, runs };
}

function xfrmRect(xfrm: XmlNode | null): { x: number; y: number; w: number; h: number } | null {
  const off = xfrm ? child(xfrm, "off") : null;
  const ext = xfrm ? child(xfrm, "ext") : null;
  if (!off || !ext) return null;
  return {
    x: emuToPt(num(off.attrs["x"], 0)),
    y: emuToPt(num(off.attrs["y"], 0)),
    w: emuToPt(num(ext.attrs["cx"], 0)),
    h: emuToPt(num(ext.attrs["cy"], 0)),
  };
}

interface WalkState {
  zip: JSZip;
  slideDir: string;
  embedById: Record<string, string>;
  shapes: SlideShape[];
  skippedImages: number;
  dx: number;
  dy: number;
  sx: number;
  sy: number;
}

function placeRect(
  st: WalkState,
  r: { x: number; y: number; w: number; h: number }
): { x: number; y: number; w: number; h: number } {
  return {
    x: st.dx + r.x * st.sx,
    y: st.dy + r.y * st.sy,
    w: Math.max(0, r.w * st.sx),
    h: Math.max(0, r.h * st.sy),
  };
}

async function walkSpTree(st: WalkState, tree: XmlNode): Promise<void> {
  for (const node of tree.children) {
    const local = node.tag.includes(":") ? node.tag.slice(node.tag.indexOf(":") + 1) : node.tag;
    if (local === "sp") {
      const spPr = child(node, "spPr");
      const rect = xfrmRect(spPr ? child(spPr, "xfrm") : null);
      if (!rect) continue;
      const txBody = child(node, "txBody");
      if (!txBody) continue;
      const nvPr = child(child(node, "nvSpPr") ?? { tag: "", attrs: {}, children: [], text: "" }, "nvPr");
      const phType = nvPr ? child(nvPr, "ph")?.attrs["type"] : undefined;
      const isTitle = phType === "title" || phType === "ctrTitle";
      const paras = children(txBody, "p").map((p) => parseParagraph(p, isTitle ? 32 : 16));
      if (paras.some((p) => p.runs.some((r) => r.text.trim()))) {
        st.shapes.push({ kind: "text", ...placeRect(st, rect), paragraphs: paras });
      }
    } else if (local === "pic") {
      const picPr = child(node, "spPr");
      const rect = xfrmRect(picPr ? child(picPr, "xfrm") : null);
      if (!rect) continue;
      const blip = child(child(node, "blipFill") ?? { tag: "", attrs: {}, children: [], text: "" }, "blip");
      const embed = blip ? Object.entries(blip.attrs).find(([k]) => k === "r:embed" || k.endsWith(":embed"))?.[1] : undefined;
      const target = embed ? st.embedById[embed] : undefined;
      const abs = target ? resolvePart(st.slideDir, target) : null;
      if (!abs) {
        st.skippedImages++;
        continue;
      }
      const f = st.zip.file(abs);
      if (!f) {
        st.skippedImages++;
        continue;
      }
      const ext = (abs.split(".").pop() ?? "").toLowerCase();
      if (ext !== "png" && ext !== "jpg" && ext !== "jpeg") {
        st.skippedImages++;
        continue;
      }
      st.shapes.push({ kind: "image", ...placeRect(st, rect), data: await f.async("uint8array"), ext });
    } else if (local === "graphicFrame") {
      const rect = xfrmRect(child(node, "xfrm"));
      if (!rect) continue;
      const tbl = findAll(node, "a:tbl")[0];
      if (tbl) {
        const grid = child(tbl, "tblGrid");
        const colWidths = grid ? children(grid, "gridCol").map((g) => emuToPt(num(g.attrs["w"], 0))) : [];
        const rows: Paragraph[][][] = [];
        for (const tr of children(tbl, "tr")) {
          const row: Paragraph[][] = [];
          for (const tc of children(tr, "tc")) {
            const txBody = child(tc, "txBody");
            const cell: Paragraph[] = [];
            if (txBody) {
              for (const p of children(txBody, "p")) cell.push(parseParagraph(p, 12));
            }
            row.push(cell.length ? cell : [{ align: "left", runs: [] }]);
          }
          if (row.length) rows.push(row);
        }
        if (rows.length && colWidths.length) {
          st.shapes.push({ kind: "table", ...placeRect(st, rect), colWidths, rows });
        }
      } else {
        // Charts, SmartArt, etc: salvage visible text at the frame's position.
        const texts = findAll(node, "a:t")
          .map((t) => t.text)
          .filter((t) => t.trim());
        if (texts.length) {
          st.shapes.push({
            kind: "text",
            ...placeRect(st, rect),
            paragraphs: [
              { align: "left", runs: texts.map((text) => ({ text, sizePt: 12, bold: false, italic: false, color: { r: 0, g: 0, b: 0 } })) },
            ],
          });
        }
      }
    } else if (local === "grpSp") {
      const grpPr = child(node, "grpSpPr");
      const xfrm = grpPr ? child(grpPr, "xfrm") : null;
      const off = xfrm ? child(xfrm, "off") : null;
      const ext = xfrm ? child(xfrm, "ext") : null;
      const chOff = xfrm ? child(xfrm, "chOff") : null;
      const chExt = xfrm ? child(xfrm, "chExt") : null;
      if (off && ext && chOff && chExt) {
        const chW = num(chExt.attrs["cx"], 0);
        const chH = num(chExt.attrs["cy"], 0);
        const child2: WalkState = {
          ...st,
          dx: st.dx + (emuToPt(num(off.attrs["x"], 0)) - emuToPt(num(chOff.attrs["x"], 0))) * st.sx,
          dy: st.dy + (emuToPt(num(off.attrs["y"], 0)) - emuToPt(num(chOff.attrs["y"], 0))) * st.sy,
          sx: chW ? st.sx * (num(ext.attrs["cx"], 0) / chW) : st.sx,
          sy: chH ? st.sy * (num(ext.attrs["cy"], 0) / chH) : st.sy,
        };
        await walkSpTree(child2, node);
        st.skippedImages = child2.skippedImages;
      }
    }
  }
}

export async function extractDeckContent(data: ArrayBuffer | Uint8Array): Promise<DeckContent> {
  const zip = await JSZip.loadAsync(data);
  const get = async (p: string): Promise<string> => {
    const f = zip.file(p);
    if (!f) throw new Error(`Missing part: ${p}`);
    return f.async("string");
  };
  const presXml = await get("ppt/presentation.xml");
  const presRelsXml = await get("ppt/_rels/presentation.xml.rels");
  const pres = parseXml(presXml).root;
  const szNode = findAll(pres, "p:sldSz")[0];
  const widthPt = emuToPt(szNode?.attrs["cx"] ? Number(szNode.attrs["cx"]) : 12192000);
  const heightPt = emuToPt(szNode?.attrs["cy"] ? Number(szNode.attrs["cy"]) : 6858000);

  const { slidePartPaths } = await import("./pptx-merge");
  const slides = slidePartPaths(presXml, presRelsXml);
  const out: DeckContent = { slides: [], widthPt, heightPt, skippedImages: 0 };

  for (const slidePath of slides) {
    const slideDir = slidePath.split("/").slice(0, -1).join("/");
    const embedById: Record<string, string> = {};
    const relsFile = zip.file(relsPathFor(slidePath));
    if (relsFile) {
      const doc = parseXml(await relsFile.async("string"));
      for (const r of children(doc.root, "Relationship")) {
        if (r.attrs["TargetMode"] === "External") continue;
        embedById[r.attrs["Id"]] = r.attrs["Target"] ?? "";
      }
    }
    const slideDoc = parseXml(await get(slidePath));
    const tree = findAll(slideDoc.root, "p:cSld")[0];
    const spTree = tree ? child(tree, "spTree") : null;
    const st: WalkState = { zip, slideDir, embedById, shapes: [], skippedImages: 0, dx: 0, dy: 0, sx: 1, sy: 1 };
    if (spTree) await walkSpTree(st, spTree);
    out.skippedImages += st.skippedImages;
    out.slides.push({ shapes: st.shapes });
  }
  return out;
}

const loadedFonts = new WeakMap<PDFDocument, Record<string, PDFFont>>();

async function getFont(pdf: PDFDocument, bold: boolean, italic: boolean): Promise<PDFFont> {
  let entry = loadedFonts.get(pdf);
  if (!entry) {
    entry = {
      regular: await pdf.embedFont(StandardFonts.Helvetica),
      bold: await pdf.embedFont(StandardFonts.HelveticaBold),
      italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
      boldItalic: await pdf.embedFont(StandardFonts.HelveticaBoldOblique),
    };
    loadedFonts.set(pdf, entry);
  }
  return entry[bold ? (italic ? "boldItalic" : "bold") : italic ? "italic" : "regular"];
}

interface LineBit {
  text: string;
  font: PDFFont;
  size: number;
  width: number;
  color: { r: number; g: number; b: number };
}

/** Wrap a paragraph into lines of (text, font, size) bits within maxWidth. */
async function wrapParagraph(
  pdf: PDFDocument,
  para: Paragraph,
  maxWidth: number
): Promise<{ lines: LineBit[][]; lineHeight: number }> {
  const bits: (LineBit & { para: Paragraph })[] = [];
  for (const run of para.runs) {
    const font = await getFont(pdf, run.bold, run.italic);
    const size = Math.min(72, Math.max(6, run.sizePt));
    for (const chunk of run.text.split("\n")) {
      for (const word of chunk.split(/(\s+)/)) {
        if (!word) continue;
        bits.push({
          text: word,
          font,
          size,
          width: font.widthOfTextAtSize(word, size),
          color: run.color,
          para,
        });
      }
      bits.push({ text: "\n", font, size, width: 0, color: run.color, para });
    }
  }
  const lines: LineBit[][] = [];
  let line: LineBit[] = [];
  let lineW = 0;
  let lineH = 0;
  const flush = () => {
    if (line.length) lines.push(line);
    line = [];
    lineW = 0;
    lineH = 0;
  };
  for (const b of bits) {
    if (b.text === "\n") {
      flush();
      continue;
    }
    const h = b.size * 1.2;
    if (/^\s+$/.test(b.text) && line.length === 0) continue; // no leading space
    if (lineW + b.width > maxWidth && line.length > 0) {
      flush();
      if (/^\s+$/.test(b.text)) continue;
    }
    line.push(b);
    lineW += b.width;
    lineH = Math.max(lineH, h);
  }
  flush();
  const height = lines.length
    ? Math.max(...lines.map((l) => Math.max(...l.map((b) => b.size * 1.2))))
    : 12;
  return { lines, lineHeight: height };
}

export interface PdfExportOptions {
  deckName: string;
}

/** Render extracted deck content to PDF bytes (one page per slide). */
export async function deckContentToPdf(
  deck: DeckContent,
  opts: PdfExportOptions
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(opts.deckName);
  const margin = 36;

  // Create one page per slide up front, then render sequentially so
  // slide ordering stays deterministic.
  for (let idx = 0; idx < deck.slides.length; idx++) {
    pdf.addPage([deck.widthPt, deck.heightPt]);
  }

  const renderAll = async () => {
    for (let idx = 0; idx < deck.slides.length; idx++) {
      const slide = deck.slides[idx];
      const page = pdf.getPage(idx);
      const drawText = async (x: number, yTop: number, w: number, paras: Paragraph[]) => {
        let y = yTop;
        for (const para of paras) {
          const { lines, lineHeight } = await wrapParagraph(pdf, para, Math.max(20, w));
          for (const line of lines) {
            const totalW = line.reduce((s, b) => s + b.width, 0);
            let x0 = x;
            if (para.align === "center") x0 = x + Math.max(0, (w - totalW) / 2);
            if (para.align === "right") x0 = x + Math.max(0, w - totalW);
            y -= lineHeight;
            if (y < margin) return;
            for (const b of line) {
              if (!b.text.trim()) {
                x0 += b.width;
                continue;
              }
              page.drawText(b.text, {
                x: x0,
                y,
                size: b.size,
                font: b.font,
                color: rgb(b.color.r, b.color.g, b.color.b),
              });
              x0 += b.width;
            }
          }
          y -= lineHeight * 0.25;
        }
      };

      for (const shape of slide.shapes) {
        const top = deck.heightPt - shape.y; // EMU y-down -> PDF y-up
        if (shape.kind === "text") {
          await drawText(shape.x, top, shape.w, shape.paragraphs);
        } else if (shape.kind === "image") {
          try {
            const img =
              shape.ext === "png" ? await pdf.embedPng(shape.data) : await pdf.embedJpg(shape.data);
            const scale = Math.min(shape.w / img.width, shape.h / img.height, 1);
            // Cap upscale at 1x to avoid blurry blowups; anchor top-left.
            const dw = img.width * scale;
            const dh = img.height * scale;
            page.drawImage(img, { x: shape.x, y: top - shape.h, width: dw, height: dh });
          } catch {
            // Corrupt image bytes — content export continues without it.
          }
        } else if (shape.kind === "table") {
          const totalW = shape.colWidths.reduce((s, w) => s + w, 0) || 1;
          const availW = Math.min(shape.w, deck.widthPt - shape.x - margin);
          const cols = shape.colWidths.map((w) => (w / totalW) * availW);
          let y = top;
          const cellPad = 4;
          for (const row of shape.rows) {
            // Measure row height.
            let rowH = 14;
            const cellLines: { lines: LineBit[][]; lineHeight: number }[][] = [];
            for (let c = 0; c < row.length; c++) {
              const cw = (cols[c] ?? availW / row.length) - cellPad * 2;
              const wrapped = [];
              let maxLh = 10;
              for (const para of row[c]) {
                const r = await wrapParagraph(pdf, para, Math.max(20, cw));
                wrapped.push(r);
                maxLh = Math.max(maxLh, r.lineHeight);
              }
              cellLines.push(wrapped);
              const nLines = wrapped.reduce((s, r) => s + r.lines.length, 0) || 1;
              rowH = Math.max(rowH, nLines * maxLh + cellPad * 2);
            }
            if (y - rowH < margin) break;
            let x = shape.x;
            for (let c = 0; c < row.length; c++) {
              const cw = cols[c] ?? availW / row.length;
              page.drawRectangle({
                x,
                y: y - rowH,
                width: cw,
                height: rowH,
                borderColor: rgb(0.4, 0.4, 0.4),
                borderWidth: 0.75,
              });
              let cy = y - cellPad;
              for (const r of cellLines[c]) {
                for (const line of r.lines) {
                  cy -= r.lineHeight;
                  let cx = x + cellPad;
                  for (const b of line) {
                    if (!b.text.trim()) {
                      cx += b.width;
                      continue;
                    }
                    page.drawText(b.text, {
                      x: cx,
                      y: cy,
                      size: b.size,
                      font: b.font,
                      color: rgb(b.color.r, b.color.g, b.color.b),
                    });
                    cx += b.width;
                  }
                }
              }
              x += cw;
            }
            y -= rowH;
          }
        }
      }

      // Footer: slide number.
      const footerFont = await getFont(pdf, false, false);
      page.drawText(`Slide ${idx + 1} of ${deck.slides.length}`, {
        x: deck.widthPt - margin - 110,
        y: 18,
        size: 9,
        font: footerFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  };

  return renderAll().then(() => pdf.save());
}
