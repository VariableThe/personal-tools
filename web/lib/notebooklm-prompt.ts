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

Focus on actually explaining and teaching the concepts clearly rather than simply summarizing or transcribing the slides. Preserve important theoretical explanations, terminology, algorithms, equations, examples, and other examinable details. Use the textbooks only as light supporting reference where they help clarify the lecture material; do not expand beyond the syllabus covered by the lecture sources.

Organize the notes logically by topic and give concepts enough explanation to be properly understood. Include important formulas, algorithms, numerical procedures, examples, comparisons, and exam-relevant points where appropriate. Do not unnecessarily compress important material or add irrelevant information.

Output ONLY the notes as raw Markdown suitable for directly copying into Obsidian.

Formatting requirements:
- Use \`#\`, \`##\`, \`###\` headings
- Use bullets and numbered lists where appropriate
- Use \`**bold**\` for important terms
- Use Markdown tables when useful
- Use \`$...$\` for inline mathematics
- Use \`$$...$$\` for block mathematics
- Do not use Unicode math instead of LaTeX
- Do not write LaTeX outside math delimiters
- Keep block equations on separate lines
- Do not use HTML or ASCII-art diagrams

The final result should be comprehensive enough to serve as primary revision notes while remaining clear, readable, and well organized.`;
