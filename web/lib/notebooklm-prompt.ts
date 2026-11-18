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

export const NOTEBOOKLM_PROMPT_TEMPLATE = `Create self-contained exam notes using uploaded lectures as primary sources and the current syllabus. Teach, don't merely summarize. Use supplied textbooks only for clarification. Cover all in-scope topics in learning order; adapt structure/depth, not a fixed theory/numericals ratio.

For theory, explain terms, intuition, mechanisms, assumptions, properties, comparisons, benefits, applications, limitations and conceptual examples. Explain source diagrams: components, labels, relationships, axes, conclusions and redrawing; flag unreproducible visuals. For algorithms, give intuition, inputs/outputs, steps, complexity/failure cases and a source-convention trace.

For numerical topics, retain formulas and derivations; define symbols, units, assumptions and applicability. Work through each distinct problem type: given values, method, substitutions, intermediate steps, answer and sanity check. Include important variations and mistakes. Don't invent numericals for purely theoretical topics.

Ground claims in sources; cite document/page/slide where available. Flag missing, unreadable or conflicting material; never invent facts or claim complete coverage despite gaps. Label constructed examples.

Filter PYQs, including subparts, to the current syllabus. Preserve actual questions and year/paper when known; identify patterns without excluding untested topics. Add labeled syllabus-based practice matching PYQ style, difficulty, depth and reasoning, with answer reasoning, diagram guidance and full numerical working. If no PYQs exist, say so; don't invent exam patterns, years, marks or marking schemes.

Output only raw Markdown: headings, lists, useful tables and bold key terms. Use $...$ inline and $$...$$ on separate lines for display LaTeX; no Unicode math, HTML or ASCII diagrams. End with a revision checklist and source gaps. If too long for one response, stop at a topic boundary, list remaining topics and continue on request without compressing away detail.`;
