# Exoplanet Discovery Engine

Interactive 3D galactic atlas of real confirmed exoplanets from the NASA Exoplanet Archive. Full spec: docs/poc.md.

## Commands

- `npm run dev` — start dev server
- `npm test` — run all tests (Vitest)
- `npm run build` — production build
- `npm run refresh-data` — re-pull the NASA snapshot into public/data/exoplanets.json

## Rules

1. **No comments.** Never write code comments in any file, in any language.
2. **File change log.** At the end of every response, list every file created, modified, or deleted during that response. Deleted files get a ❌ prefix; created and modified files get no marker. Every entry must be a clickable markdown link (relative path from workspace root) so the user can jump to any file.
3. **Test-driven.** Write tests first, then the implementation. Every piece of logic lives in a plain module covered by tests; views stay thin shells over tested logic.
