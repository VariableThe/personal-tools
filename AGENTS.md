# Project instructions for OpenCode

## General rules

- Be concise, factual, and direct. Focus on problem-solving without superlatives or emotional validation.
- Verify solutions by execution whenever reasonable: run code, write/run tests, and sanity-check outputs.
- Base output on verified evidence: inspect relevant files before answering. If findings contradict a prior claim, state the discrepancy.
- Prefer editing an existing file over creating a new one. Never create files unless needed for the goal.
- For `web/` (Next.js) TypeScript changes, run `bun run typecheck` from `web/` and fix errors before finishing.
- Preserve the 100% on-device privacy guarantee: browser-local processing only, no file uploads to servers.
- Use dedicated file tools (`read`, `edit`, `write`) over shell equivalents (`cat`, `sed`) for file operations.

## GitHub repository setup

- If the current project has no git repository, or has a git repository with no GitHub remote, ask the user whether they want to create a GitHub repository (e.g. offer to run `gh repo create`, public vs. private).
- Do not create a GitHub repository without the user's explicit confirmation.

## Pull-request workflow

- All additions and changes must be made using pull requests, after confirming with the user.
- Never push directly to `main`/`master`. The workflow is:
  1. Confirm the plan and scope with the user before writing code.
  2. Create a feature branch (`git checkout -b <type>/<short-description>`).
  3. Commit the change and confirm the diff with the user.
  4. Push the branch and open a PR (e.g. `gh pr create --fill` or with an explicit title/body).
- Do not merge a PR without the user's explicit approval.
