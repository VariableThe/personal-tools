/**
 * Normalization + validation for raw NotebookLM Markdown/LaTeX output.
 *
 * Scope is strictly syntax/format normalization — headings, math
 * delimiters, common LaTeX typos. Academic content/wording is never
 * rewritten.
 */

export interface NormalizeResult {
  /** Normalized markdown, ready for preview/PDF rendering. */
  markdown: string;
  /** Non-blocking notices shown to the user (repairs applied, etc.). */
  warnings: string[];
  /** Blocking problems (unbalanced delimiters, bad LaTeX). */
  errors: string[];
  /** Counts used for the stats row. */
  mathCounts: { inline: number; display: number };
  /** True when a ```mermaid block was found (previewed as code only). */
  hasMermaid: boolean;
}

/** Code spans/blocks are extracted before any math processing so we never touch them. */
const CODE_PH = "@@NLMCODE";
const MATH_PH = "@@NLMMATH";

const GREEK_NAMES = [
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "varepsilon",
  "zeta",
  "eta",
  "theta",
  "vartheta",
  "iota",
  "kappa",
  "lambda",
  "mu",
  "nu",
  "xi",
  "pi",
  "varpi",
  "rho",
  "varrho",
  "sigma",
  "varsigma",
  "tau",
  "upsilon",
  "phi",
  "varphi",
  "chi",
  "psi",
  "omega",
  "Gamma",
  "Delta",
  "Theta",
  "Lambda",
  "Xi",
  "Pi",
  "Sigma",
  "Upsilon",
  "Phi",
  "Psi",
  "Omega",
];

function extractCodeSegments(input: string): { text: string; blocks: string[] } {
  const blocks: string[] = [];
  // Fenced blocks first (``` or ~~~), then inline `code`.
  let text = input.replace(/```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)/g, (m) => {
    blocks.push(m);
    return `\n\n${CODE_PH}${blocks.length - 1}@\n\n`;
  });
  text = text.replace(/`[^`\n]+`/g, (m) => {
    blocks.push(m);
    return `${CODE_PH}${blocks.length - 1}@`;
  });
  return { text, blocks };
}

function restoreCodeSegments(input: string, blocks: string[]): string {
  return input.replace(new RegExp(`${CODE_PH}(\\d+)@`, "g"), (_, i) => blocks[Number(i)] ?? "");
}

/** Repair LaTeX *inside* a single math segment. Conservative by design. */
function repairMathSegment(tex: string, warnings: string[], seen: Set<string>): string {
  let out = tex;

  // \(...\) / \[...\] remnants (should already be delimiters, but be safe).
  out = out.replace(/^\\\(|\\\)$/g, "").replace(/^\\\[|\\\]$/g, "");

  // \frac a b  -> \frac{a}{b} (single-token args only).
  out = out.replace(/\\frac\s+([A-Za-z0-9])\s+([A-Za-z0-9])/g, (_, a, b) => {
    seen.add("frac");
    return `\\frac{${a}}{${b}}`;
  });

  // \sqrt2 -> \sqrt{2}
  out = out.replace(/\\sqrt(?![{\[])([A-Za-z0-9])/g, (_, a) => {
    seen.add("sqrt");
    return `\\sqrt{${a}}`;
  });

  // Bare multi-char sub/superscripts: x_ij -> x_{ij}, e^x+y -> e^{x}+y
  out = out.replace(/([_^])([A-Za-z0-9]{2,})(?![A-Za-z0-9}])/g, (m, op, chars) => {
    // Skip when part of a command name (preceded by backslash+letters).
    seen.add("braces");
    return `${op}{${chars}}`;
  });

  // Merge accidental double sub/superscripts from the step above:
  // w_ij_new -> w_{ij}_{new} (invalid: "double subscript") -> w_{ij\_new}.
  out = out.replace(/([_^])\{([^{}]*)\}\1\{([^{}]*)\}/g, (_, op, a, b) => {
    seen.add("braces");
    return `${op}{${a}\\_{${b}}}`;
  });

  // Bare Greek names inside math: " alpha " -> " \alpha " (NotebookLM often drops the backslash).
  out = out.replace(/(^|[^\\A-Za-z])([A-Za-z]+)(?![A-Za-z{(])/g, (m, pre, word) => {
    if (GREEK_NAMES.includes(word)) {
      seen.add("greek");
      return `${pre}\\${word}`;
    }
    return m;
  });

  // Bare function/operator names inside math: "sum_i" -> "\sum_i".
  // Only when followed by whitespace, _, ^ or { so variables like "signal" are untouched.
  const BARE_FUNCS = [
    "sum",
    "prod",
    "int",
    "lim",
    "frac",
    "sqrt",
    "sin",
    "cos",
    "tan",
    "log",
    "ln",
    "exp",
  ];
  out = out.replace(/(^|[^\\A-Za-z])([A-Za-z]+)(?=[\s_^{])/g, (m, pre, word) => {
    if (BARE_FUNCS.includes(word)) {
      seen.add("funcs");
      return `${pre}\\${word}`;
    }
    return m;
  });

  // Unicode operators/symbols -> LaTeX commands (KaTeX-safe, keeps semantics).
  const uni: Array<[RegExp, string, string]> = [
    [/×/g, "\\times ", "times"],
    [/÷/g, "\\div ", "div"],
    [/≤/g, "\\leq ", "leq"],
    [/≥/g, "\\geq ", "geq"],
    [/≠/g, "\\neq ", "neq"],
    [/≈/g, "\\approx ", "approx"],
    [/∞/g, "\\infty ", "infty"],
    [/→/g, "\\to ", "to"],
    [/∂/g, "\\partial ", "partial"],
    [/⋅/g, "\\cdot ", "cdot"],
    [/±/g, "\\pm ", "pm"],
    [/∈/g, "\\in ", "in"],
    [/∀/g, "\\forall ", "forall"],
    [/∃/g, "\\exists ", "exists"],
  ];
  for (const [re, rep, key] of uni) {
    if (re.test(out)) {
      out = out.replace(re, rep);
      seen.add(key);
    }
  }

  void warnings;
  return out;
}

/** Check braces balance and \begin/\end pairing; returns error strings.
 * Unknown-command detection is deliberately NOT done here: the render
 * step trial-renders every equation with real KaTeX (throwOnError) and
 * reports genuine failures, while any hand-maintained allowlist
 * (e.g. missing \ge, \implies, \operatorname) produces false positives. */
function validateMathSegment(tex: string, index: number, display: boolean): string[] {
  const errs: string[] = [];
  const label = display ? `display equation #${index + 1}` : `inline equation #${index + 1}`;
  let depth = 0;
  for (const ch of tex) {
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth < 0) break;
  }
  if (depth !== 0) {
    errs.push(`Unbalanced braces in ${label}: "${truncate(tex, 60)}". Check { and } pairs.`);
  }
  // \begin without \end
  const begins = (tex.match(/\\begin\{/g) || []).length;
  const ends = (tex.match(/\\end\{/g) || []).length;
  if (begins !== ends) {
    errs.push(`Mismatched \\begin / \\end in ${label} (${begins} vs ${ends}).`);
  }
  return errs;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export function normalizeNotebookLmMarkdown(raw: string): NormalizeResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const repairs = new Set<string>();

  if (!raw || !raw.trim()) {
    return { markdown: "", warnings: [], errors: [], mathCounts: { inline: 0, display: 0 }, hasMermaid: false };
  }

  // 1. Baseline cleanup (whitespace only — never touches wording).
  let text = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  // Collapse 3+ blank lines to max 2.
  if (/\n{4,}/.test(text)) text = text.replace(/\n{4,}/g, "\n\n\n");
  // Headings missing the space: "##Title" -> "## Title".
  text = text.replace(/^(#{1,6})([^\s#])/gm, "$1 $2");
  // Trailing whitespace per line.
  text = text.replace(/[ \t]+$/gm, "");

  const hasMermaid = /```\s*mermaid/i.test(text);

  // 2. Pull code out of the way.
  const { text: noCode, blocks } = extractCodeSegments(text);

  // 3. Normalize math delimiters: \[...\] -> $$...$$, \(...\) -> $...$.
  // NOTE: NotebookLM output frequently arrives with DOUBLED backslashes
  // (\\( ... \\) and \\[ ... \\]) from chat-UI escaping. Those MUST be
  // handled before the single-backslash forms — otherwise the inner regex
  // matches the second backslash and leaves a stray "\" inside the math,
  // which makes KaTeX fail on hundreds of equations at once.
  // ("\\" line-breaks inside matrices are untouched: they are never
  // directly followed by "(" or "[" in valid LaTeX.)
  let work = noCode;

  work = work.replace(/\\\\\[([\s\S]*?)\\\\\]/g, (_, inner) => {
    return `\n\n$$${inner}$$\n\n`;
  });
  work = work.replace(/\\\\\(([\s\S]*?)\\\\\)/g, (_, inner) => {
    return `$${inner}$`;
  });
  work = work.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => {
    return `\n\n$$${inner}$$\n\n`;
  });
  work = work.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => {
    return `$${inner}$`;
  });

  // 4. Extract display math ($$...$$), repair inside, restore as canonical $$.
  const displaySegs: string[] = [];
  work = work.replace(/\$\$([\s\S]*?)\$\$/g, (m, inner) => {
    const repaired = repairMathSegment(inner.trim(), warnings, repairs);
    displaySegs.push(repaired);
    return `\n\n${MATH_PH}D${displaySegs.length - 1}@\n\n`;
  });

  // 5. Extract inline math ($...$), repair inside.
  // An escaped "\$" is a literal dollar, never a delimiter.
  const inlineSegs: string[] = [];
  // Avoid matching $$ remnants or $ prices: require non-space adjacency on open.
  work = work.replace(/(?<!\$)(?<!\\)\$(?!\$|\s)([^$\n]*?)(?<!\s)(?<!\\)\$(?!\$|\d)/g, (m, inner) => {
    const repaired = repairMathSegment(inner, warnings, repairs);
    inlineSegs.push(repaired);
    return `${MATH_PH}I${inlineSegs.length - 1}@`;
  });

  // 6. Count dangling delimiters (ignoring escaped "\$" literals).
  const leftoverDisplay = (work.match(/(?<!\\)\$\$/g) || []).length;
  const leftoverSingle = (work.match(/(?<!\$)(?<!\\)\$(?!\$)/g) || []).length;
  const restoredDisplayPlaceholders = displaySegs.length;
  const restoredInlinePlaceholders = inlineSegs.length;
  if (leftoverDisplay > 0) {
    errors.push(
      `Found ${leftoverDisplay} unmatched "$$" delimiter${leftoverDisplay === 1 ? "" : "s"}. Each display equation needs an opening and closing $$ on its own lines.`
    );
  }
  if (leftoverSingle > 0) {
    errors.push(
      `Found ${leftoverSingle} unmatched "$" delimiter${leftoverSingle === 1 ? "" : "s"}. Inline math needs matching $...$ pairs (a lone $ for currency can trigger this — wrap it in backticks like \`$\`).`
    );
  }

  // 7. Validate each math segment.
  displaySegs.forEach((tex, i) => errors.push(...validateMathSegment(tex, i, true)));
  inlineSegs.forEach((tex, i) => errors.push(...validateMathSegment(tex, i, false)));

  // 8. Restore math placeholders in canonical form.
  work = work.replace(new RegExp(`${MATH_PH}D(\\d+)@`, "g"), (_, i) => {
    const tex = displaySegs[Number(i)] ?? "";
    return `\n\n$$${tex}$$\n\n`;
  });
  work = work.replace(new RegExp(`${MATH_PH}I(\\d+)@`, "g"), (_, i) => {
    const tex = inlineSegs[Number(i)] ?? "";
    return `$${tex}$`;
  });

  // 9. Tidy: collapse accidental 3+ blank lines introduced above.
  work = work.replace(/\n{4,}/g, "\n\n\n");

  // 10. Restore code.
  const markdown = restoreCodeSegments(work, blocks).trim() + "\n";

  // 11. Repair summary warnings (one line per repair family, no content edits).
  if (repairs.has("frac")) warnings.push("Repaired bare \\frac arguments → \\frac{a}{b} form.");
  if (repairs.has("sqrt")) warnings.push("Repaired bare \\sqrt arguments → \\sqrt{x} form.");
  if (repairs.has("braces"))
    warnings.push("Added braces to multi-character sub/superscripts (x_ij → x_{ij}).");
  if (repairs.has("greek")) warnings.push("Restored missing backslashes on Greek letters inside math.");
  if (repairs.has("funcs"))
    warnings.push("Restored missing backslashes on functions/operators inside math (sum, sin, frac, …).");
  const uniKeys = ["times", "div", "leq", "geq", "neq", "approx", "infty", "to", "partial", "cdot", "pm", "in", "forall", "exists"];
  if (uniKeys.some((k) => repairs.has(k)))
    warnings.push("Converted Unicode math symbols (×, ≤, →, …) to LaTeX commands for reliable rendering.");
  if (hasMermaid)
    warnings.push(
      "A mermaid ```diagram block was detected. It is preserved as a code block in the preview/PDF — vector diagram rendering is not supported."
    );
  if (/^\s*#{1,6}[^\s#]/m.test(raw)) warnings.push("Fixed headings missing a space after # characters.");
  if (/\\\[|\\\(/.test(raw)) warnings.push("Converted \\[ \\] / \\( \\) math delimiters to $$ / $ form.");

  return {
    markdown,
    warnings,
    errors,
    mathCounts: { inline: restoredInlinePlaceholders, display: restoredDisplayPlaceholders },
    hasMermaid,
  };
}

export { MATH_PH };
