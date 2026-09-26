## 2026-08-08T17:29:47-06:00
Implement Milestone 1: Local SEO HTML Optimizer (R1).
1. Create `src/seo/parser.ts` using `cheerio` with `{ decodeEntities: false }` to parse HTML, preserving Spanish UTF-8 formatting and original structure.
2. Implement tag transformations:
   - `<title>` tag with `| Aguamarina Joyería` suffix.
   - Meta description tag (150-160 characters) from context/paragraph.
   - Meta viewport tag (`width=device-width, initial-scale=1.0`).
   - OpenGraph (`og:*`) and Twitter card (`twitter:*`) tags.
   - Heading hierarchy normalizer (`<h1>`-`<h6>` structure, single `<h1>`).
   - Image `alt` attribute contextual injection (filename, caption, section).
3. Implement `src/seo/index.ts` with `optimizeFile()` and `optimizeDirectory()` functions returning detailed JSON audit reports.
4. Implement CLI executable `bin/seo-optimizer.ts` supporting `--dir`, `--recursive`, `--dry-run`, `--report` flags.
5. Implement unit tests in `tests/unit/seo.test.ts` covering all tag transformations, Spanish UTF-8 preservation, edge cases (missing head, multiple h1s, empty files), and CLI output.
6. Run build and tests (`npm test`). Write your handoff report to `handoff.md` in your working directory and send a message to caller.
