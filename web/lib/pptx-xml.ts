/**
 * Minimal XML parser/serializer for Office Open XML parts.
 *
 * Why not DOMParser? This module must run identically in the browser and
 * in bun/node (for offline verification), where no DOM exists. It also
 * preserves namespace prefixes byte-for-byte on round-trip, which matters
 * when PowerPoint re-opens merged decks.
 *
 * Scope: well-formed XML with elements, attributes, comments, a single
 * XML declaration, and standard entities. No DTDs, no mixed tricky
 * content — sufficient for .pptx parts.
 */

export interface XmlNode {
  tag: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  /** Text directly inside this element (entity-decoded). */
  text: string;
}

export interface XmlDoc {
  decl: string | null;
  root: XmlNode;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseAttrs(s: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    attrs[m[1]] = decodeEntities(m[3] !== undefined ? m[3] : m[4]);
  }
  return attrs;
}

export function parseXml(xml: string): XmlDoc {
  let decl: string | null = null;
  const declMatch = xml.match(/^\s*(<\?xml[^?]*\?>)/);
  if (declMatch) decl = declMatch[1];

  const root: XmlNode = { tag: "", attrs: {}, children: [], text: "" };
  const stack: XmlNode[] = [root];
  let pos = declMatch ? declMatch[0].length : 0;

  while (pos < xml.length) {
    const lt = xml.indexOf("<", pos);
    if (lt === -1) {
      stack[stack.length - 1].text += decodeEntities(xml.slice(pos));
      break;
    }
    if (lt > pos) {
      stack[stack.length - 1].text += decodeEntities(xml.slice(pos, lt));
    }
    // Comment
    if (xml.startsWith("<!--", lt)) {
      const end = xml.indexOf("-->", lt + 4);
      if (end === -1) throw new Error("Unterminated XML comment");
      pos = end + 3;
      continue;
    }
    // Processing instruction (non-decl) — skip
    if (xml.startsWith("<?", lt)) {
      const end = xml.indexOf("?>", lt + 2);
      if (end === -1) throw new Error("Unterminated processing instruction");
      pos = end + 2;
      continue;
    }
    const gt = xml.indexOf(">", lt + 1);
    if (gt === -1) throw new Error("Unterminated XML tag");
    const inner = xml.slice(lt + 1, gt).trim();
    pos = gt + 1;

    if (inner.startsWith("/")) {
      // Close tag
      const name = inner.slice(1).trim().split(/\s+/)[0];
      const node = stack.pop();
      if (!node || node.tag !== name) {
        throw new Error(`Mismatched close tag: expected </${node?.tag}> got </${name}>`);
      }
      continue;
    }
    const selfClosing = inner.endsWith("/");
    const body = selfClosing ? inner.slice(0, -1).trim() : inner;
    const spaceIdx = body.search(/\s/);
    const name = spaceIdx === -1 ? body : body.slice(0, spaceIdx);
    const attrs = spaceIdx === -1 ? {} : parseAttrs(body.slice(spaceIdx + 1));
    const node: XmlNode = { tag: name, attrs, children: [], text: "" };
    stack[stack.length - 1].children.push(node);
    if (!selfClosing) stack.push(node);
  }
  if (stack.length !== 1) throw new Error("Unterminated XML element");
  const realRoots = root.children;
  if (realRoots.length !== 1) throw new Error(`Expected 1 root element, found ${realRoots.length}`);
  return { decl, root: realRoots[0] };
}

export function serializeNode(node: XmlNode): string {
  const attrStr = Object.entries(node.attrs)
    .map(([k, v]) => ` ${k}="${escapeXml(v)}"`)
    .join("");
  const hasKids = node.children.length > 0;
  const hasText = node.text.length > 0;
  if (!hasKids && !hasText) return `<${node.tag}${attrStr}/>`;
  const inner =
    (hasText ? escapeXml(node.text) : "") + node.children.map(serializeNode).join("");
  return `<${node.tag}${attrStr}>${inner}</${node.tag}>`;
}

export function serializeXml(doc: XmlDoc): string {
  return (doc.decl ? doc.decl : "") + serializeNode(doc.root);
}

/** Depth-first search for elements whose tag equals `tag` (prefix-aware exact match). */
export function findAll(node: XmlNode, tag: string): XmlNode[] {
  const out: XmlNode[] = [];
  const visit = (n: XmlNode) => {
    if (n.tag === tag) out.push(n);
    for (const c of n.children) visit(c);
  };
  visit(node);
  return out;
}

/** Local name without namespace prefix, e.g. "p:sp" -> "sp". */
export function localName(tag: string): string {
  const i = tag.indexOf(":");
  return i === -1 ? tag : tag.slice(i + 1);
}

/** First direct child with the given local name (any prefix). */
export function child(node: XmlNode, local: string): XmlNode | null {
  return node.children.find((c) => localName(c.tag) === local) ?? null;
}

/** All direct children with the given local name (any prefix). */
export function children(node: XmlNode, local: string): XmlNode[] {
  return node.children.filter((c) => localName(c.tag) === local);
}
