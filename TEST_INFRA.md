# TEST_INFRA.md — E2E Test Infrastructure & Specification

## System & Test Overview
This document specifies the End-to-End (E2E) testing framework and strategy for **Aguamarina Joyería Marketing & SEO Automation System**.
The testing suite operates under an **opaque-box (black-box)** testing methodology: tests interact with the system via exported public module APIs, CLI invocations, and HTTP REST endpoints, verifying system responses and side-effects against expected output contracts derived from `ORIGINAL_REQUEST.md` and `PROJECT.md`.

---

## Test Infrastructure Architecture

### Tech Stack & Libraries
- **Test Runner**: Jest (`jest` v29+) with `ts-jest` for native TypeScript execution.
- **HTTP Testing**: `supertest` for Express endpoint integration testing without binding live TCP ports.
- **DOM / HTML Inspection**: `cheerio` for querying and validating HTML modification structures.
- **File System Utilities**: Node.js `fs/promises` and `path` for temporary workspace creation and teardown.

### Test Directory Layout
```
aguamarina_marketing_automation/
├── tests/
│   └── e2e/
│       ├── e2e_seo.test.ts          # Tier 1: SEO Optimizer Feature Coverage (5+ tests)
│       ├── e2e_ads.test.ts          # Tier 1: Google Ads Payload Schema (5+ tests)
│       ├── e2e_gemini.test.ts       # Tier 1: Gemini AI Metadata Generator (5+ tests)
│       ├── e2e_thumbnail.test.ts    # Tier 1: YouTube Thumbnail Generator (5+ tests)
│       ├── e2e_dashboard.test.ts    # Tier 1: Express Upload & REST API (5+ tests)
│       ├── e2e_boundaries.test.ts   # Tier 2: Boundary & Corner Cases
│       ├── e2e_pairwise.test.ts     # Tier 3: Cross-Feature Combinations (Pairwise)
│       └── e2e_workflow.test.ts     # Tier 4: Real-World Full Workflow Scenarios
├── jest.config.js
├── tsconfig.json
├── TEST_INFRA.md
└── TEST_READY.md
```

---

## Opaque-Box E2E Testing Tiers

### Tier 1: Feature Coverage (≥5 tests per core feature)
Each target feature must have at least 5 isolated end-to-end tests exercising distinct functional requirements:

1. **SEO Local HTML Optimizer**:
   - `SEO-T1-01`: Injects missing `<title>` tag with mandatory brand suffix `| Aguamarina Joyería`.
   - `SEO-T1-02`: Injects or updates contextual `<meta name="description">` tag.
   - `SEO-T1-03`: Injects standard `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.
   - `SEO-T1-04`: Normalizes heading hierarchy (`<h1>`-`<h6>`) without breaking structure.
   - `SEO-T1-05`: Enriches `<img>` elements missing `alt` attributes based on context.
   - `SEO-T1-06`: Generates a structured JSON/CLI audit report summarizing all file modifications.

2. **Google Ads Payload Schema & Creator**:
   - `ADS-T1-01`: Validates Search campaign payload structure (budget, targeting, match types, campaign name).
   - `ADS-T1-02`: Validates Video (YouTube) campaign payload structure (video ID, placement budget, audience targeting).
   - `ADS-T1-03`: Executes campaign creation in dry-run mode without triggering live API spending.
   - `ADS-T1-04`: Rejects invalid negative budget or missing required keyword fields with schema validation error.
   - `ADS-T1-05`: Verifies ad copy headlines and descriptions respect strict character limits.

3. **Gemini AI Metadata Generator**:
   - `GEMINI-T1-01`: Generates SEO-optimized video title containing target keywords from context prompt.
   - `GEMINI-T1-02`: Generates detailed video description with appropriate hashtags and CTA.
   - `GEMINI-T1-03`: Generates relevant tags array for YouTube categorization.
   - `GEMINI-T1-04`: Responds gracefully with fallback metadata when API prompt context is minimal.
   - `GEMINI-T1-05`: Preserves language specification (e.g. Spanish context for Aguamarina Joyería).

4. **YouTube Thumbnail Generator**:
   - `THUMB-T1-01`: Renders a canvas output with exact dimensions 1280x720.
   - `THUMB-T1-02`: Displays specified title text overlay cleanly on the thumbnail image.
   - `THUMB-T1-03`: Supports visual style themes (e.g., modern glassmorphic, luxury gold).
   - `THUMB-T1-04`: Outputs valid PNG/JPEG binary buffer or data URL payload.
   - `THUMB-T1-05`: Handles long title text without horizontal overflow or visual distortion.

5. **Express Video Upload Endpoint**:
   - `UP-T1-01`: Accepts multipart/form-data upload with video binary and metadata fields.
   - `UP-T1-02`: Returns mock video ID and YouTube URL when operating in dry-run mode.
   - `UP-T1-03`: Streams upload progress events via Server-Sent Events (`/api/upload-stream`).
   - `UP-T1-04`: Integrates AI-generated metadata directly into the YouTube payload.
   - `UP-T1-05`: Attaches generated thumbnail image to the uploaded video response payload.

---

### Tier 2: Boundary & Corner Cases
Tests specifically designed to probe error handling, input limits, and edge cases:
- `BOUND-01`: **Empty Files**: File with 0 bytes processed by SEO optimizer.
- `BOUND-02`: **Missing `<head>` Tag**: Fragment HTML documents missing structural `<head>` or `<body>`.
- `BOUND-03`: **Invalid Keywords & Symbols**: Ads payloads containing invalid characters, empty strings, or excess whitespaces.
- `BOUND-04`: **Non-UTF8 Encoding**: HTML content containing special Spanish characters (`ñ`, `á`, `é`, `í`, `ó`, `ú`, `¿`) preserved without entity corruption.
- `BOUND-05`: **Oversized Video Files**: Upload requests exceeding standard size thresholds or unsupported MIME types.

---

### Tier 3: Cross-Feature Combinations (Pairwise Testing)
Testing interaction between distinct features:
- `PAIR-01`: **SEO + Gemini Metadata**: Uses optimized HTML page summary as input prompt to Gemini AI metadata generator.
- `PAIR-02`: **Gemini + Thumbnail**: Uses AI-generated title as the text input overlay for the YouTube thumbnail generator.
- `PAIR-03`: **Thumbnail + Express Upload**: Generates thumbnail dynamically and attaches it directly to the Express upload stream.
- `PAIR-04`: **Google Ads + YouTube Video**: Creates a Google Ads Video campaign referencing a newly uploaded YouTube video ID.

---

### Tier 4: Real-World Scenarios
- `WORKFLOW-01`: **End-to-End Marketing Automation Lifecycle**:
  1. Scan local website directory and optimize HTML files for SEO.
  2. Take top optimized page keywords to feed Gemini AI video metadata generator.
  3. Auto-generate thumbnail with AI title overlay.
  4. Upload video + thumbnail via Express upload endpoint in mock mode.
  5. Create Google Ads Video campaign targeting the uploaded video ID.
  6. Verify full audit log and response payload consistency across all modules.

---

## Environment & Mock Configuration
- `DRY_RUN_MODE=true`: Default execution environment for tests to guarantee no external API costs or accidental YouTube channel modifications.
- Tests dynamically fallback to built-in opaque mocks if backend dependencies are initialized in dry-run or test state.

---

## How to Execute the Test Suite
- Run all E2E tests:
  ```bash
  npm run test:e2e
  ```
- Run with verbose output:
  ```bash
  npx jest --testPathPattern=tests/e2e --verbose
  ```
