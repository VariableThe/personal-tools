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
  "Copy the prompt, paste into NotebookLM alongside your sources, then paste its Markdown output into this converter.";

export const NOTEBOOKLM_PROMPT_TEMPLATE = `Using the uploaded lecture notes/slides as the primary source, create comprehensive and well-structured exam revision notes for the given subject and scope.

Focus on actually explaining and teaching the concepts clearly rather than simply summarizing or transcribing the slides. Preserve important theory, terminology, algorithms, equations, examples, and examinable details. Use textbooks only as light supporting reference where they help clarify the lecture material.

Organize the notes in a logical learning flow. Generally, move from:
**concept/definition → intuition and purpose → detailed explanation → working/process → equations or algorithms where relevant → examples/numericals → important observations or exam points.**

Do not force this structure when it does not make sense for a particular topic. Give more explanation to important or difficult concepts and avoid unnecessary detail for simple ones.

Also examine the uploaded sources for **previous-year question papers (PYQs)** and use them to understand the style, depth, and types of questions asked.

At the end, include a **Questions for Practice** section:
- If PYQs are available, include relevant questions directly from the PYQs and clearly identify them as previous-year questions.
- Then create additional original questions following similar concepts, difficulty, style, and reasoning patterns.
- If no PYQs are available, create original exam-style questions based on the lecture material.
- Include conceptual, theoretical, algorithmic, and numerical questions where appropriate.
- Never present an original question as a PYQ.

Output ONLY the notes as raw Markdown suitable for directly copying into Obsidian.

Formatting:
- Use \`#\`, \`##\`, \`###\` headings
- Use bullets and numbered lists appropriately
- Use \`**bold**\` for important terms
- Use Markdown tables where useful
- Use \`$...$\` for inline mathematics
- Use \`$$...$$\` for block mathematics
- Do not use Unicode math instead of LaTeX
- Do not write LaTeX outside math delimiters
- Keep block equations on separate lines
- Do not use HTML or ASCII-art diagrams

The final notes should be comprehensive, conceptually clear, logically organized, and useful as primary revision material rather than an overly compressed summary.`;
