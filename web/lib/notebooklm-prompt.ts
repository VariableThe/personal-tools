/**
 * Recommended NotebookLM prompt template.
 *
 * EDIT THIS FILE to change the prompt shown in the "NotebookLM Prompt"
 * section of the NotebookLM → PDF tool. Nothing else needs to change —
 * the tool UI reads everything from these constants.
 *
 * Placeholders the user fills in before pasting into NotebookLM are
 * written as [BRACKETS].
 */

export const NOTEBOOKLM_PROMPT_TITLE = "Exam revision notes prompt for NotebookLM";

export const NOTEBOOKLM_PROMPT_HINT =
  "Fill in the [BRACKETS], paste into NotebookLM alongside your sources, then paste its Markdown output into this converter.";

export const NOTEBOOKLM_PROMPT_TEMPLATE = `Using ALL uploaded sources, respond with comprehensive exam revision notes for [SUBJECT], covering [SCOPE — e.g. Module 1 up to and including Topic X].

This is NOT a report. Do NOT use a report/document format. I want the actual notes directly in your response as raw Markdown that I can copy-paste into Obsidian.

Cover the full content of the sources without excessively compressing it. Remove repetition and fluff, but retain important concepts, terminology, architectures, algorithms, equations, examples and examinable details.

Give particular attention to these numerical and algorithmic topics:
- [PRIORITY TOPIC 1]
- [PRIORITY TOPIC 2]
- [PRIORITY TOPIC 3]

For each topic, include:
- Concepts and terminology
- Working / architecture
- Algorithms
- Important equations
- Numerical-solving procedure
- Relevant examples
- Important exam points and common mistakes

[OPTIONAL: Use my handwritten / extra notes (e.g. "[NOTEBOOK NAME]") as a source too.]

At the end, include:
1. Formula book
2. Algorithm cheat sheet
3. Important exam questions with answers
4. Numerical practice with solutions
5. Last-minute cheat sheet
6. Final exam checklist

### CRITICAL FORMATTING REQUIREMENTS

Output ONLY the Markdown notes. No introduction, explanation, preamble, or closing commentary.

Use proper Obsidian-compatible Markdown:
- \`#\`, \`##\`, \`###\` headings
- \`-\` / \`*\` bullet lists
- numbered lists
- Markdown tables where useful
- \`**bold**\` for important terms
- \`>\` for important notes/warnings
- \`$...$\` for ALL inline mathematical expressions
- \`$$...$$\` for ALL displayed/block equations

Do NOT use Unicode math in place of LaTeX.
Do NOT write LaTeX outside \`$...$\` or \`$$...$$\`.
Keep equations in standard MathJax/LaTeX syntax compatible with Obsidian.
Use \\frac{a}{b} for fractions and braces for multi-character sub/superscripts (x_{ij}).
Put each display equation on its own line, surrounded by blank lines.
Tables MUST use valid GitHub-Flavored Markdown with a header row and | --- | separator row.
Do not use HTML tags or ASCII-art diagrams.

Preserve the terminology and approach used in the uploaded lecture material. Do not add unrelated textbook material or invent information not supported by the sources.

The goal is not to produce the shortest possible summary. The goal is to produce proper, comprehensive study notes that can serve as my primary revision material.`;
