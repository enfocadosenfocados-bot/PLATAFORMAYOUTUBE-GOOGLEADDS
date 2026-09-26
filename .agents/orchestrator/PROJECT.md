# Project: Aguamarina Joyería Marketing & SEO Automation System

## Architecture
- **Tech Stack**: Node.js (v18+/v20+), TypeScript / ES Modules, Express.js.
- **HTML Parsing & SEO**: `cheerio` (with `{ decodeEntities: false }` for UTF-8 Spanish preservation), Node.js `fs/promises`.
- **Google Ads Integration**: Official `@google-ads/google-ads-api`, with built-in `MockAdsEngine` for dry-run execution.
- **AI & Video Services**: `@google/genai` (Gemini API for SEO titles/descriptions/tags), `@napi-rs/canvas` or `canvas` (1280x720 thumbnail generator), `googleapis` (YouTube Data API v3 resumable video/thumbnail upload).
- **Web Dashboard**: Express REST backend + Server-Sent Events (SSE) progress logging + modern glassmorphic HTML5/CSS3 frontend.
- **Testing & QA**: `jest`, `ts-jest`, `supertest` for unit, integration, and API testing.

## Feature Inventory & Milestone Mapping

| # | Feature | Scope / Description | Milestone | Source |
|---|---------|---------------------|-----------|--------|
| F-01 | Directory Scanner | Recursive `.html` file discovery | M1 | R1 |
| F-02 | Title Tag Injector | Inject/optimize `<title>` with brand suffix | M1 | R1 |
| F-03 | Meta Description | Inject/optimize meta description from context | M1 | R1 |
| F-04 | Meta Viewport | Inject mobile viewport meta tag | M1 | R1 |
| F-05 | OpenGraph & Twitter | Inject `og:*` and `twitter:*` tags | M1 | R1 |
| F-06 | Header Normalizer | Normalize `<h1>`-`<h6>` structure | M1 | R1 |
| F-07 | Image Alt Enricher | Contextual `alt` attribute injection | M1 | R1 |
| F-08 | HTML Formatter | Preserve structure & UTF-8 encoding | M1 | R1 |
| F-09 | Audit Reporter | Output JSON & CLI modification report | M1 | R1 & AC-1,2 |
| F-10 | Dry-Run Engine | Intercept API calls & return mock payloads | M2 | R2 & AC-3 |
| F-11 | Search Campaign | Google Ads Search campaign creator | M2 | R2 |
| F-12 | Video Campaign | Google Ads Video campaign creator | M2 | R2 |
| F-13 | Schema Validator | Validate budgets, match types, character limits | M2 | R2 |
| F-14 | Web Server | Express REST & static asset server | M3 | R3 & AC-4 |
| F-15 | Video Dropzone UI | Drag-and-drop file upload frontend | M3 | R3 |
| F-16 | Gemini AI Metadata | Generate title/desc/tags via Gemini API | M3 | R3 & AC-5 |
| F-17 | Auto Thumbnail | 1280x720 canvas thumbnail generator | M3 | R3 |
| F-18 | Resumable Upload | YouTube Data API video/thumbnail upload | M3 | R3 & AC-6 |
| F-19 | Progress Stream | SSE real-time upload progress log | M3 | R3 |
| F-20 | Config Manager | Centralized `.env` Zod validation | M4 | R4 & AC-7 |
| F-21 | Credential Docs | Step-by-step setup guides (`README.md`, `CREDENTIALS_GUIDE.md`) | M4 | R4 & AC-8 |

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Test infra, Tier 1-4 test cases, `TEST_READY.md` | Initial Setup | DONE |
| M1 | SEO Optimizer | HTML parser, CLI tool, report generator | None | DONE |
| M2 | Google Ads Integration | Search/Video campaigns, dry-run engine, schema validator | None | DONE |
| M3 | YouTube Dashboard & AI Metadata | Express server, Gemini API, thumbnail canvas, YouTube upload | M1, M2 | DONE |
| M4 | Credentials & Documentation | Centralized Zod config, `.env.example`, setup guides | None | DONE |
| M5 | Final E2E Verification & Hardening | Pass 100% E2E tests + Tier 5 adversarial testing | E2E, M1-M4 | DONE |

## Interface Contracts

### 1. SEO Optimizer Module (`src/seo/index.ts`)
```typescript
export interface SeoOptimizeOptions {
  directoryPath: string;
  recursive?: boolean;
  brandName?: string;
  dryRun?: boolean;
  outputReportPath?: string;
}
export function optimizeFile(filePath: string, options?: Partial<SeoOptimizeOptions>): FileOptimizationResult;
export function optimizeDirectory(options: SeoOptimizeOptions): Promise<SeoAuditReport>;
```

### 2. Google Ads Campaign Service (`src/ads/index.ts`)
```typescript
export class GoogleAdsCampaignService {
  constructor(config?: { dryRun?: boolean });
  createSearchCampaign(request: SearchCampaignRequest): Promise<CampaignCreationResponse>;
  createVideoCampaign(request: VideoCampaignRequest): Promise<CampaignCreationResponse>;
}
```

### 3. YouTube Upload REST API (`src/dashboard/server.ts`)
- `POST /api/generate-metadata`: `{ contextPrompt, category, targetAudience, language }` -> `{ success, metadata: { title, description, tags } }`
- `POST /api/generate-thumbnail`: `{ titleText, styleTheme }` -> `{ success, thumbnailUrl }`
- `POST /api/upload`: multipart/form-data video, title, description, tags, thumbnail -> `{ success, isMock, videoId, youtubeUrl }`
- `GET /api/upload-stream`: Server-Sent Events stream for upload progress.

### 4. Configuration Schema (`src/config/index.ts`)
- Environment variables parsed with Zod schema (`PORT`, `DRY_RUN_MODE`, `GOOGLE_ADS_*`, `YOUTUBE_*`, `GEMINI_*`).

## Code Layout
```
aguamarina_marketing_automation/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
├── docs/
│   └── CREDENTIALS_GUIDE.md
├── src/
│   ├── config/
│   │   └── index.ts
│   ├── seo/
│   │   ├── index.ts
│   │   ├── parser.ts
│   │   └── cli.ts
│   ├── ads/
│   │   ├── index.ts
│   │   ├── mockEngine.ts
│   │   └── validator.ts
│   └── dashboard/
│       ├── server.ts
│       ├── geminiService.ts
│       ├── thumbnailService.ts
│       ├── youtubeUploader.ts
│       └── public/
│           ├── index.html
│           ├── style.css
│           └── app.js
├── tests/
│   ├── unit/
│   │   ├── seo.test.ts
│   │   ├── ads.test.ts
│   │   ├── gemini.test.ts
│   │   └── config.test.ts
│   └── e2e/
│       ├── e2e_seo.test.ts
│       ├── e2e_ads.test.ts
│       └── e2e_dashboard.test.ts
└── .agents/
```
