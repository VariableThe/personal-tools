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

At the end, include a **PYQ-Based Practice Questions** section as follows.

First, filter by syllabus: the PYQs may cover a larger syllabus than the current one, so use the uploaded lecture material / current syllabus as the authority. Only extract actual PYQ questions relevant to the current syllabus and ignore questions from portions not currently included. If a PYQ has multiple parts and only some belong to the current syllabus, extract only the relevant parts. Do not include out-of-syllabus questions merely because they appear frequently in the PYQs.

Then analyze the relevant PYQs to identify:
- Recurring topics and concepts
- Types and formats of questions asked
- The level of conceptual understanding expected
- Common numerical or algorithmic problem patterns
- The way questions are phrased and structured

Finally, write the section with two parts:

1. **Relevant Previous-Year Questions**
   - Include the actual questions from the PYQs that fall within the current syllabus.
   - Preserve their original meaning and wording as much as possible.
   - Identify the year/paper when available.

2. **Generated Practice Questions**
   - Create new questions based on the patterns found in the relevant PYQs.
   - Keep them within the current syllabus only.
   - Match the style, difficulty, concepts, and reasoning required by the existing PYQs.
   - Include a reasonable mix of conceptual, theoretical, algorithmic, and numerical questions where appropriate.
   - Do not simply reword the PYQs; create genuinely new but comparable questions.
   - If no PYQs are available, create original exam-style questions based on the lecture material.
   - Clearly distinguish actual PYQs from generated questions. Never present a generated question as a PYQ.

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
