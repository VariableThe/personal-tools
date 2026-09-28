/**
 * Merge multiple .pptx decks into one, fully on-device.
 *
 * Approach: OPC-level merge with JSZip. The first deck is the base; every
 * slide of every other deck is copied over together with its layout /
 * master / theme chain and referenced media, remapping part names on
 * collision. Because masters travel with their slides, formatting is
 * preserved exactly — no re-rendering involved.
 *
 * Pure logic + JSZip only (no DOM), so this also runs under bun/node
 * for offline verification.
 */

import JSZip from "jszip";
import { parseXml, serializeXml, findAll, child, children, type XmlNode } from "./pptx-xml";

export interface PptxDeckInfo {
  valid: boolean;
  slideCount: number;
  widthEmu: number;
  heightEmu: number;
  error?: string;
}

const DEFAULT_SLIDE_CX = 12192000; // 13.33in in EMUs
const DEFAULT_SLIDE_CY = 6858000; // 7.5in in EMUs

const OFFICE_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function dirName(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? "" : p.slice(0, i);
}

function baseName(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? p : p.slice(i + 1);
}

/** Resolve a relationship Target (relative or package-absolute) against a part's directory. */
export function resolvePart(baseDir: string, target: string): string | null {
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)) return null; // absolute URI
  const parts: string[] = target.startsWith("/") ? [] : baseDir.split("/").filter(Boolean);
  for (const seg of target.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}

/** Relative path from one package directory to an absolute package path. */
export function relPath(fromDir: string, toAbs: string): string {
  const f = fromDir ? fromDir.split("/").filter(Boolean) : [];
  const t = toAbs.split("/").filter(Boolean);
  let i = 0;
  while (i < f.length && i < t.length && f[i] === t[i]) i++;
  return [...Array<string>(f.length - i).fill(".."), ...t.slice(i)].join("/");
}

/** The .rels path for a given part path. */
export function relsPathFor(partPath: string): string {
  const d = dirName(partPath);
  return (d ? d + "/" : "") + "_rels/" + baseName(partPath) + ".rels";
}

async function zipText(zip: JSZip, path: string): Promise<string> {
  const f = zip.file(path);
  if (!f) throw new Error(`Missing part: ${path}`);
  return f.async("string");
}

function prefixOf(tag: string): string {
  const i = tag.indexOf(":");
  return i === -1 ? "" : tag.slice(0, i);
}

/** Ordered slide part paths from a deck's presentation.xml + presentation rels. */
export function slidePartPaths(presentationXml: string, presRelsXml: string): string[] {
  const pres = parseXml(presentationXml).root;
  const rels = parseXml(presRelsXml).root;
  const targetById: Record<string, string> = {};
  for (const r of children(rels, "Relationship")) {
    if (r.attrs["TargetMode"] === "External") continue;
    // Rel Targets resolve against the owner part (ppt/presentation.xml), not the .rels file.
    const abs = resolvePart("ppt", r.attrs["Target"] ?? "");
    if (abs) targetById[r.attrs["Id"]] = abs;
  }
  const out: string[] = [];
  for (const lst of findAll(pres, "p:sldIdLst")) {
    for (const sldId of children(lst, "sldId")) {
      const rid = Object.entries(sldId.attrs).find(([k]) => k === "r:id" || k.endsWith(":id"))?.[1];
      if (rid && targetById[rid]) out.push(targetById[rid]);
    }
  }
  return out;
}

export async function readPptxInfo(data: ArrayBuffer | Uint8Array): Promise<PptxDeckInfo> {
  try {
    const zip = await JSZip.loadAsync(data);
    if (!zip.file("[Content_Types].xml")) throw new Error("Not a valid .pptx (no [Content_Types].xml)");
    const presXml = await zipText(zip, "ppt/presentation.xml");
    const presRels = await zipText(zip, "ppt/_rels/presentation.xml.rels");
    const pres = parseXml(presXml).root;
    const szNode = findAll(pres, "p:sldSz")[0];
    const slides = slidePartPaths(presXml, presRels);
    return {
      valid: true,
      slideCount: slides.length,
      widthEmu: szNode?.attrs["cx"] ? Number(szNode.attrs["cx"]) : DEFAULT_SLIDE_CX,
      heightEmu: szNode?.attrs["cy"] ? Number(szNode.attrs["cy"]) : DEFAULT_SLIDE_CY,
    };
  } catch (err) {
    return {
      valid: false,
      slideCount: 0,
      widthEmu: DEFAULT_SLIDE_CX,
      heightEmu: DEFAULT_SLIDE_CY,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

interface MergeCtx {
  target: JSZip;
  used: Set<string>;
  /** source absolute path -> target absolute path (per merge run). */
  copied: Map<string, string>;
  srcTypes: XmlNode; // source [Content_Types] Types element
  dstTypes: XmlNode; // target [Content_Types] Types element
  nextRid: number;
  nextSldId: number;
  presDoc: { decl: string | null; root: XmlNode };
  presRelsDoc: { decl: string | null; root: XmlNode };
  presPrefix: string;
  relPrefix: string; // prefix bound to office relationships ns in presentation.xml
  sldIdLst: XmlNode;
  masterIdLst: XmlNode | null;
}

function uniqueName(ctx: MergeCtx, path: string): string {
  if (!ctx.used.has(path)) return path;
  const d = dirName(path);
  const b = baseName(path);
  const dot = b.lastIndexOf(".");
  const stem = dot === -1 ? b : b.slice(0, dot);
  const ext = dot === -1 ? "" : b.slice(dot);
  let k = 2;
  while (ctx.used.has(`${d ? d + "/" : ""}${stem}_m${k}${ext}`)) k++;
  return `${d ? d + "/" : ""}${stem}_m${k}${ext}`;
}

function guessContentType(path: string): string | null {
  if (path.endsWith(".xml")) return "application/xml";
  if (path.endsWith(".rels"))
    return "application/vnd.openxmlformats-package.relationships+xml";
  return null;
}

/** Ensure [Content_Types] covers `dstPath`, using the source type for `srcPath` when known. */
function ensureContentType(ctx: MergeCtx, srcPath: string, dstPath: string): void {
  const ext = baseName(dstPath).split(".").pop()?.toLowerCase() ?? "";
  for (const o of children(ctx.dstTypes, "Override")) {
    if (o.attrs["PartName"] === "/" + dstPath) return;
  }
  for (const d of children(ctx.dstTypes, "Default")) {
    if ((d.attrs["Extension"] ?? "").toLowerCase() === ext) return;
  }
  // Copy the source's own declaration.
  let contentType: string | null = null;
  for (const o of children(ctx.srcTypes, "Override")) {
    if (o.attrs["PartName"] === "/" + srcPath) contentType = o.attrs["ContentType"];
  }
  if (!contentType) {
    for (const d of children(ctx.srcTypes, "Default")) {
      if ((d.attrs["Extension"] ?? "").toLowerCase() === ext) {
        ctx.dstTypes.children.push({ tag: "Default", attrs: { ...d.attrs }, children: [], text: "" });
        return;
      }
    }
    contentType = guessContentType(dstPath);
  }
  if (contentType) {
    ctx.dstTypes.children.push({
      tag: "Override",
      attrs: { PartName: "/" + dstPath, ContentType: contentType },
      children: [],
      text: "",
    });
  }
}

/** Copy a part (bytes) from src zip into the target, remapping on collision. */
async function copyPart(ctx: MergeCtx, src: JSZip, srcPath: string): Promise<string> {
  const hit = ctx.copied.get(srcPath);
  if (hit) return hit;
  const f = src.file(srcPath);
  if (!f) throw new Error(`Missing part in source deck: ${srcPath}`);
  const dstPath = uniqueName(ctx, srcPath);
  ctx.target.file(dstPath, await f.async("uint8array"));
  ctx.used.add(dstPath);
  ctx.copied.set(srcPath, dstPath);
  ensureContentType(ctx, srcPath, dstPath);
  // Recurse into its relationships.
  const srcRels = relsPathFor(srcPath);
  if (src.file(srcRels)) {
    await copyRels(ctx, src, srcPath, dstPath, await zipText(src, srcRels));
  }
  return dstPath;
}

/** Copy a .rels file, remapping every internal target (copying those parts too). */
async function copyRels(
  ctx: MergeCtx,
  src: JSZip,
  srcPartPath: string,
  dstPartPath: string,
  relsXml: string
): Promise<void> {
  const doc = parseXml(relsXml);
  const srcDir = dirName(srcPartPath);
  const dstDir = dirName(dstPartPath);
  for (const r of children(doc.root, "Relationship")) {
    if (r.attrs["TargetMode"] === "External") continue;
    const abs = resolvePart(srcDir, r.attrs["Target"] ?? "");
    if (!abs) continue;
    const newAbs = await copyPart(ctx, src, abs);
    r.attrs["Target"] = relPath(dstDir, newAbs);
  }
  const dstRels = relsPathFor(dstPartPath);
  ctx.target.file(dstRels, serializeXml(doc));
  ctx.used.add(dstRels);
  ensureContentType(ctx, relsPathFor(srcPartPath), dstRels);
}

/** Copy a slide layout plus its master/theme chain; returns the new layout path. */
async function copyLayoutChain(ctx: MergeCtx, src: JSZip, layoutPath: string): Promise<string> {
  const existing = ctx.copied.get(layoutPath);
  if (existing) return existing;
  // Master first, so the layout's rel rewrite resolves to the copied master.
  const layoutRelsPath = relsPathFor(layoutPath);
  if (src.file(layoutRelsPath)) {
    const doc = parseXml(await zipText(src, layoutRelsPath));
    const layoutDir = dirName(layoutPath);
    for (const r of children(doc.root, "Relationship")) {
      if (r.attrs["TargetMode"] === "External") continue;
      if ((r.attrs["Type"] ?? "").endsWith("/slideMaster")) {
        const abs = resolvePart(layoutDir, r.attrs["Target"] ?? "");
        if (abs) await copyMasterChain(ctx, src, abs);
      }
    }
  }
  return copyPart(ctx, src, layoutPath);
}

/** Copy a slide master: its themes, sibling layouts, and any other internal refs. */
async function copyMasterChain(ctx: MergeCtx, src: JSZip, masterPath: string): Promise<string> {
  const existing = ctx.copied.get(masterPath);
  if (existing) return existing;
  const newMasterPath = uniqueName(ctx, masterPath);
  // Pre-register so self-references resolve.
  ctx.copied.set(masterPath, newMasterPath);
  const f = src.file(masterPath);
  if (!f) throw new Error(`Missing part in source deck: ${masterPath}`);
  ctx.target.file(newMasterPath, await f.async("uint8array"));
  ctx.used.add(newMasterPath);
  ensureContentType(ctx, masterPath, newMasterPath);
  // Append to sldMasterIdLst + presentation rels.
  const rid = `rId${ctx.nextRid++}`;
  if (ctx.masterIdLst) {
    ctx.masterIdLst.children.push({
      tag: `${ctx.presPrefix}:sldMasterId`,
      attrs: { [`${ctx.relPrefix}:id`]: rid },
      children: [],
      text: "",
    });
  }
  ctx.presRelsDoc.root.children.push({
    tag: "Relationship",
    attrs: {
      Id: rid,
      Type: `${OFFICE_REL}/slideMaster`,
      Target: relPath("ppt", newMasterPath),
    },
    children: [],
    text: "",
  });
  const masterRels = relsPathFor(masterPath);
  if (src.file(masterRels)) {
    await copyRels(ctx, src, masterPath, newMasterPath, await zipText(src, masterRels));
  }
  return newMasterPath;
}

/**
 * Merge decks (first = base) into a single .pptx.
 * @returns raw bytes of the combined deck.
 */
export async function mergePptx(decks: (ArrayBuffer | Uint8Array)[]): Promise<Uint8Array> {
  if (decks.length === 0) throw new Error("No decks to merge");
  const target = await JSZip.loadAsync(decks[0]);
  const used = new Set(Object.keys(target.files).filter((k) => !k.endsWith("/")));

  const presXml = await zipText(target, "ppt/presentation.xml");
  const presRelsXml = await zipText(target, "ppt/_rels/presentation.xml.rels");
  const presDoc = parseXml(presXml);
  const presRelsDoc = parseXml(presRelsXml);
  const typesDoc = parseXml(await zipText(target, "[Content_Types].xml"));

  const presPrefix = prefixOf(presDoc.root.tag) || "p";
  const relNsAttr = Object.keys(presDoc.root.attrs).find(
    (k) => k === "xmlns:r" || presDoc.root.attrs[k] === OFFICE_REL
  );
  const relPrefix = relNsAttr
    ? relNsAttr.includes(":")
      ? relNsAttr.split(":")[1]
      : "r"
    : "r";

  let sldIdLst = child(presDoc.root, "sldIdLst");
  if (!sldIdLst) {
    sldIdLst = { tag: `${presPrefix}:sldIdLst`, attrs: {}, children: [], text: "" };
    presDoc.root.children.push(sldIdLst);
  }
  const masterIdLst = child(presDoc.root, "sldMasterIdLst");

  const existingRids = children(presRelsDoc.root, "Relationship")
    .map((r) => /^rId(\d+)$/.exec(r.attrs["Id"] ?? "")?.[1])
    .filter((v): v is string => v !== undefined)
    .map(Number);
  const sldIds = findAll(presDoc.root, `${presPrefix}:sldId`).map((n) => Number(n.attrs["id"]));

  const ctx: MergeCtx = {
    target,
    used,
    copied: new Map(),
    srcTypes: typesDoc.root,
    dstTypes: typesDoc.root,
    nextRid: (existingRids.length ? Math.max(...existingRids) : 0) + 1,
    nextSldId: Math.max(255, ...(sldIds.length ? sldIds : [255])) + 1,
    presDoc,
    presRelsDoc,
    presPrefix,
    relPrefix,
    sldIdLst,
    masterIdLst,
  };

  for (let d = 1; d < decks.length; d++) {
    const src = await JSZip.loadAsync(decks[d]);
    // Dedup map is per source deck: identical part paths in different
    // decks are different parts and must each be copied.
    ctx.copied = new Map();
    ctx.srcTypes = parseXml(await zipText(src, "[Content_Types].xml")).root;
    const slides = slidePartPaths(
      await zipText(src, "ppt/presentation.xml"),
      await zipText(src, "ppt/_rels/presentation.xml.rels")
    );
    for (const slidePath of slides) {
      // Layout chain first (masters travel with their slides).
      const slideRelsPath = relsPathFor(slidePath);
      let layoutPath: string | null = null;
      if (src.file(slideRelsPath)) {
        const doc = parseXml(await zipText(src, slideRelsPath));
        const slideDir = dirName(slidePath);
        for (const r of children(doc.root, "Relationship")) {
          if (r.attrs["TargetMode"] === "External") continue;
          if ((r.attrs["Type"] ?? "").endsWith("/slideLayout")) {
            layoutPath = resolvePart(slideDir, r.attrs["Target"] ?? "");
          }
        }
      }
      if (layoutPath) await copyLayoutChain(ctx, src, layoutPath);
      const newSlidePath = await copyPart(ctx, src, slidePath);
      const rid = `rId${ctx.nextRid++}`;
      ctx.sldIdLst.children.push({
        tag: `${ctx.presPrefix}:sldId`,
        attrs: { id: String(ctx.nextSldId++), [`${ctx.relPrefix}:id`]: rid },
        children: [],
        text: "",
      });
      ctx.presRelsDoc.root.children.push({
        tag: "Relationship",
        attrs: {
          Id: rid,
          Type: `${OFFICE_REL}/slide`,
          Target: relPath("ppt", newSlidePath),
        },
        children: [],
        text: "",
      });
    }
  }

  target.file("ppt/presentation.xml", serializeXml(ctx.presDoc));
  target.file("ppt/_rels/presentation.xml.rels", serializeXml(ctx.presRelsDoc));
  target.file("[Content_Types].xml", serializeXml(typesDoc));

  // Best-effort docProps: slide count + title entries (viewers tolerate mismatch).
  try {
    if (target.file("docProps/app.xml")) {
      const appDoc = parseXml(await zipText(target, "docProps/app.xml"));
      const total = slidePartPaths(
        await zipText(target, "ppt/presentation.xml"),
        await zipText(target, "ppt/_rels/presentation.xml.rels")
      ).length;
      for (const s of findAll(appDoc.root, "Slides")) s.text = String(total);
      for (const vec of findAll(appDoc.root, "vt:vector")) {
        const parts = children(vec, "lpstr");
        if (parts.length > 0) {
          while (parts.length < total) {
            const el: XmlNode = { tag: "vt:lpstr", attrs: {}, children: [], text: "" };
            vec.children.push(el);
            parts.push(el);
          }
          vec.attrs["size"] = String(Math.max(Number(vec.attrs["size"] ?? "0"), total));
        }
      }
      target.file("docProps/app.xml", serializeXml(appDoc));
    }
  } catch {
    // docProps are advisory; never fail the merge over them.
  }

  return target.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
