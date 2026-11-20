import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { deckContentToPdf, extractDeckContent } from "../lib/pptx-pdf";

const slideXml = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
  <p:cSld><p:spTree><p:nvGrpSpPr/><p:grpSpPr/>${body}</p:spTree></p:cSld>
</p:sld>`;

const textShape = (text: string) => `<p:sp>
  <p:nvSpPr><p:cNvPr id="1" name="Text"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
  <p:spPr><a:xfrm><a:off x="914400" y="914400"/><a:ext cx="9144000" cy="914400"/></a:xfrm></p:spPr>
  <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr sz="1800"/><a:t>${text}</a:t></a:r></a:p></p:txBody>
</p:sp>`;

const chartFrame = `<p:graphicFrame>
  <p:nvGraphicFramePr><p:cNvPr id="2" name="Chart"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr>
  <p:xfrm><a:off x="914400" y="914400"/><a:ext cx="9144000" cy="4572000"/></p:xfrm>
  <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart/></a:graphicData></a:graphic>
</p:graphicFrame>`;

const connectorShape = `<p:cxnSp>
  <p:nvCxnSpPr><p:cNvPr id="3" name="Connector"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr>
  <p:spPr><a:xfrm><a:off x="914400" y="914400"/><a:ext cx="9144000" cy="4572000"/></a:xfrm></p:spPr>
</p:cxnSp>`;

const imageWithoutGeometry = `<p:pic>
  <p:nvPicPr><p:cNvPr id="4" name="Image"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
  <p:blipFill><a:blip r:embed="rIdImage"/></p:blipFill><p:spPr/>
</p:pic>`;

async function fixtureSlide(slide: string): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    "ppt/presentation.xml",
    `<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldSz cx="12192000" cy="6858000"/><p:sldIdLst><p:sldId id="1" r:id="rId1"/></p:sldIdLst></p:presentation>`
  );
  zip.file(
    "ppt/_rels/presentation.xml.rels",
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>`
  );
  zip.file("ppt/slides/slide1.xml", slide);
  return zip.generateAsync({ type: "uint8array" });
}

async function fixture(body: string): Promise<Uint8Array> {
  return fixtureSlide(slideXml(body));
}

const fontRoot = join(process.cwd(), "public");
globalThis.fetch = async (input: string | URL | Request) => {
  const path = typeof input === "string" ? input : input.toString();
  const bytes = await readFile(join(fontRoot, path.replace(/^\//, "")));
  return new Response(bytes, { status: 200 });
};

const unicodeDeck = await extractDeckContent(await fixture(textShape("Résumé — café — 😀")));
assert.equal(unicodeDeck.unsupported.length, 0);
const unicodePdf = await deckContentToPdf(unicodeDeck, { deckName: "unicode-fixture" });
assert.equal((await PDFDocument.load(unicodePdf)).getPageCount(), 1);
if (process.env.PPTX_PDF_ARTIFACT) await writeFile(process.env.PPTX_PDF_ARTIFACT, unicodePdf);

const chartDeck = await extractDeckContent(await fixture(chartFrame));
assert.deepEqual(chartDeck.unsupported, [{ slide: 1, kinds: ["chart"] }]);
await assert.rejects(
  () => deckContentToPdf(chartDeck, { deckName: "chart-fixture" }),
  /unsupported visual content.*slide 1: chart/
);

const japaneseDeck = await extractDeckContent(await fixture(textShape("日本語")));
await assert.rejects(
  () => deckContentToPdf(japaneseDeck, { deckName: "japanese-fixture" }),
  /embedded font cannot render these characters: 日/
);

const connectorDeck = await extractDeckContent(await fixture(connectorShape));
assert.deepEqual(connectorDeck.unsupported, [{ slide: 1, kinds: ["cxnSp shape"] }]);
await assert.rejects(
  () => deckContentToPdf(connectorDeck, { deckName: "connector-fixture" }),
  /unsupported visual content.*slide 1: cxnSp shape/
);

const missingTreeDeck = await extractDeckContent(
  await fixtureSlide(
    `<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld/></p:sld>`
  )
);
assert.deepEqual(missingTreeDeck.unsupported, [{ slide: 1, kinds: ["slide missing shape tree"] }]);
await assert.rejects(
  () => deckContentToPdf(missingTreeDeck, { deckName: "missing-tree-fixture" }),
  /unsupported visual content.*slide 1: slide missing shape tree/
);

const malformedImageDeck = await extractDeckContent(await fixture(imageWithoutGeometry));
assert.deepEqual(malformedImageDeck.unsupported, [{ slide: 1, kinds: ["image without geometry"] }]);
await assert.rejects(
  () => deckContentToPdf(malformedImageDeck, { deckName: "malformed-image-fixture" }),
  /unsupported visual content.*slide 1: image without geometry/
);

console.log("pptx-pdf regression fixtures passed");
