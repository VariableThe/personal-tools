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

export const NOTEBOOKLM_PROMPT_TEMPLATE = `Create thorough exam revision notes from the uploaded lecture notes/slides and current syllabus. Teach, don't merely summarize. Use supplied textbooks only for clarification. Follow the syllabus/lecture order; cover every in-scope topic, adapting depth to its nature, not a fixed theory/numericals ratio.

For theory, explain meaning, intuition, mechanisms, assumptions, properties, comparisons, applications and limitations. Explain important source diagrams: labels, relationships, axes and how to redraw them. For algorithms, give intuition, inputs/outputs, steps, complexity or failure cases, and a useful trace.

For numerical topics, retain formulas and derivations; define symbols, units and assumptions. Work through each distinct problem type: given values, method, substitutions, intermediate steps, answer and sanity check. Include important variations and mistakes. Don't invent numericals for purely theoretical topics.

Ground claims in sources; cite document/page/slide where available. Flag missing, unreadable or conflicting material; never invent facts or claim complete coverage despite gaps. Label constructed examples.

Filter uploaded PYQs to the current syllabus. Preserve actual questions and year/paper when known; identify patterns without excluding untested topics. Add clearly labeled syllabus-based practice with answer outlines and full numerical working. If no PYQs exist, say so; don't invent exam patterns, years, marks or marking schemes.

Output only raw Markdown: headings, lists, useful tables and bold key terms. Use $...$ inline and $$...$$ on separate lines for display LaTeX; no Unicode math, HTML or ASCII diagrams. End with a revision checklist and source gaps. If too long for one response, stop at a topic boundary, list remaining topics and continue on request without compressing away detail.`;
