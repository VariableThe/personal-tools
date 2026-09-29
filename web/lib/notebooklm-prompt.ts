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

export const NOTEBOOKLM_PROMPT_TEMPLATE = `Using the uploaded lecture notes/slides as the **primary source**, create comprehensive, well-structured **exam revision notes** for the given subject and syllabus scope.

Focus on **teaching and explaining the concepts**, not simply summarizing or transcribing the slides. Preserve important theory, terminology, algorithms, equations, examples, derivations, and other examinable details. Use textbooks only as light supporting references when they help clarify the lecture material.

Organize the notes in a **logical learning flow**, but **do not force every topic into the same structure**. Adapt the structure to the nature of the topic. For example, a theoretical topic may need a detailed conceptual explanation, while an algorithm may need steps, intuition, complexity, and an example, and a numerical topic may need formulas and worked problems.

Use concepts such as:

* Definitions and terminology
* Intuition and purpose
* Detailed theory and explanations
* Processes, mechanisms, or algorithms
* Equations, derivations, and numericals
* Examples and applications
* Comparisons, properties, assumptions, advantages, limitations, and exam points

These are **guidelines, not a mandatory template**. Give difficult or important concepts enough depth, and keep simple material concise. **Do not omit important details just because they don't fit a particular structure.** The notes should be detailed enough to study from without constantly referring back to the slides.

## PYQ Analysis

Examine the uploaded sources for **previous-year question papers** and use them to understand the style, depth, and types of questions asked.

First filter the PYQs according to the **current syllabus**, using the lecture material/current syllabus as the authority. Ignore out-of-syllabus questions. If only part of a multi-part question is relevant, include only that part.

Analyze the relevant PYQs for:

* Recurring topics and concepts
* Question formats and phrasing
* Expected conceptual depth
* Numerical/algorithmic patterns
* Common reasoning or problem-solving requirements

## PYQ-Based Practice Questions

### 1. Relevant Previous-Year Questions

Include the **actual PYQ questions** that fall within the current syllabus. Preserve their wording and meaning as closely as possible and identify the year/paper when available.

### 2. Generated Practice Questions

Create **new questions** based on the patterns found in the relevant PYQs. Keep them strictly within the current syllabus and match their style, difficulty, depth, and reasoning requirements. Include an appropriate mix of conceptual, theoretical, algorithmic, and numerical questions where relevant.

Clearly distinguish actual PYQs from generated questions. **Never present a generated question as a PYQ.**

## Formatting

* Use \`#\`, \`##\`, \`###\` headings
* Use bullets and numbered lists appropriately
* Use \`**bold**\` for important terms
* Use Markdown tables where useful
* Use \`$...$\` for inline mathematics
* Use \`$$...$$\` for block mathematics
* Keep block equations on separate lines
* Do not use Unicode math instead of LaTeX
* Do not use HTML or ASCII-art diagrams

**Prioritize clarity, completeness, and conceptual understanding over rigid structure or excessive summarization.**

Output **only the notes as raw Markdown suitable for directly copying into Obsidian**.`;
