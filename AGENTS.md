# Repository Guidelines

## Project Structure & Module Organization
- Rooted static web app for QQ Map (TMap) with no build step.
- Key files: `index.html` (entry), `main.js` (map logic, labels, search), `style.css` (styles), `preload_labels.js` (seed data), `manifest.json` (PWA), additional views like `compass.html`, `import.html`, `old.html`, `test.html`.
- Assets live in root (e.g., `favicon.ico`, `current-location.svg`, `arrow-right.png`). LocalStorage keys: `mapMarks`, `selectedPosition`.

## Develop, Run, and Build
- Run locally (no install needed):
  - Simple server: `python3 -m http.server 5173` then open `http://localhost:5173/index.html`.
  - Or open `index.html` directly in a modern browser (recommended to use a server for geolocation and fetch).
- There is no build pipeline; edit files in place. If you add tooling later, keep the static entry at `index.html`.

## Coding Style & Naming Conventions
- JavaScript: 2‑space indent, semicolons, double quotes; prefer `const`/`let` over `var`.
- Constants in `UPPER_SNAKE_CASE` (e.g., `TEXTMARKSIZE`), functions/variables in `camelCase`.
- Keep functions small; avoid global leakage—attach only intentional globals.
- HTML/CSS files use kebab-case; keep ids/classes descriptive (e.g., `#moreButton`, `#searchPanel`).

## Testing Guidelines
- Manual smoke tests via browser:
  - Location: verify center-on-current and marker rotation with device orientation (iOS may require tapping “Enable Sensors”).
  - Labels: add, edit, delete; confirm persistence in LocalStorage and export JSON.
  - Search: try nearby queries and map centering on selection.
- Lightweight files: `test.html`/`test.js` exist for quick checks. No unit framework; do not add heavy test deps without discussion.

## Commit & Pull Request Guidelines
- Commits: short, imperative, scoped (e.g., `fix compass heading`, `implement search`). Keep subject ≤50 chars; optional body for rationale.
- PRs must include: clear summary, before/after screenshots for UI changes, reproduction or test steps, and linked issues if applicable.

## Security & Configuration Tips
- API keys: the QQ Map key appears in `main.js`. Do not commit personal/production keys; prefer placeholders and document how to inject locally.
- Network: a CORS proxy is referenced; keep endpoints configurable and fail-safe.
- PWA: `manifest.json` is shipped; ensure edits keep it valid JSON.
