## 2026-08-10T19:01:09Z
Task: Fix payload schema normalization in `src/ads/validator.ts` and DOCTYPE injection in `src/seo/parser.ts` to ensure 100% test pass rate across all unit and E2E test suites.

Detailed Requirements:
1. **`src/ads/validator.ts`**:
   - Update `validateSearchCampaignRequest` and `validateVideoCampaignRequest` to accept both flat payload structures AND nested objects.
   - If `raw.budget` is missing, map `raw.budgetAmountMicros` or `raw.budget_amount_micros` or `raw.budget` (number) to `budget.amountMicros`.
   - If `raw.keywords` is an array of strings (e.g. `['anillos', 'joyas']`), map each item to `{ text: item, matchType: 'BROAD' }`.
   - If `raw.creative` / `raw.adCreative` is missing, extract top-level `headlines`, `descriptions`, `finalUrl`, `finalUrls`, `path1`, `path2`, `videoId` into `creative`.
   - If `customerId` / `customer_id` is missing, supply a default valid customer ID `'1234567890'`.
   - Format `ValidationError` messages to include `"Schema Validation Error:"` (e.g. `Schema Validation Error: Validation failed: ...`) so test matchers like `toThrow('Schema Validation Error')` pass.
   - Retain full validation for character limits (headline <= 30 chars, description <= 90 chars, video headline <= 15 chars, CTA <= 10 chars, etc.).

2. **`src/seo/parser.ts`**:
   - In `parseAndOptimizeHtml`, ensure that whenever full `<html>` document structure is generated (either from full documents or fragments), `<!DOCTYPE html>` is prepended at the beginning of the returned HTML string.

3. **`src/dashboard/server.ts`**:
   - In `POST /api/upload`, enforce a max video file size check: if `fileSizeBytes` or `req.body.fileSizeBytes` or `req.file?.size` exceeds 500MB (500 * 1024 * 1024 bytes) or 1GB, return HTTP status 413 (`Payload Too Large` / `{ error: 'File size exceeds maximum limit of 500MB' }`).

4. **Verification**:
   - Run `npm run build` (`tsc`). Confirm exit code 0 and zero compilation errors.
   - Run `npm test` (`npx jest`). Confirm 100% pass rate across ALL test suites (13/13 test suites, 95+/95 tests passing).

5. **Output**:
   - Write `progress.md` and `handoff.md` in `C:\Users\QS\.gemini\antigravity\scratch\aguamarina_marketing_automation\.agents\worker_fix_m1_m2`.
   - Report documented build and test execution results.
