# Technical Analysis Report: R2 (Google/YouTube Ads Creator) & R3 (YouTube Auto-Upload Dashboard)

**Author:** `explorer_2`  
**Date:** 2026-08-08  
**Project:** Aguamarina Joyería Marketing & SEO Automation  
**Target Directory:** `C:\Users\QS\.gemini\antigravity\scratch\aguamarina_marketing_automation`  

---

## 1. Executive Summary & Scope

This technical analysis covers the design, architecture, tech stack, data contracts, and verification strategy for two core automation components of Aguamarina Joyería:
1. **R2: Google Ads & YouTube Ads Campaign Creator** — A modular Node.js client service capable of programmatically creating Google Search campaigns and YouTube Video ad campaigns using the official Google Ads API client. Features budget management, targeting, keyword criteria, responsive ad creatives, and a complete dry-run / mock mode for credential-free development and automated testing.
2. **R3: YouTube Auto-Upload Web Dashboard** — A modern web application featuring an Express backend and responsive HTML/JS frontend. It provides drag-and-drop video uploads, Gemini API LLM-driven metadata generation (SEO title, description, tags), a professional HTML5 Canvas / Sharp thumbnail generator tailored to Aguamarina Joyería branding, YouTube Data API v3 resumable video and thumbnail uploading, and real-time upload progress streaming via Server-Sent Events (SSE).

---

## 2. Tech Stack & Dependency Selection

| Component | Library / Package | Role & Rationale |
|---|---|---|
| **Google Ads Integration** | `google-ads-api` | Official high-level Node.js client library for Google Ads API (REST/gRPC wrapper). Provides typed gRPC entity builders and mutate operation mapping. |
| **Authentication** | `google-auth-library` | Handles OAuth2 refresh tokens, client IDs, client secrets, and access token generation for both Google Ads API and YouTube Data API. |
| **YouTube Data API** | `googleapis` (v3) | Official Google API client library for YouTube `videos.insert` and `thumbnails.set` endpoints with resumable stream support. |
| **AI Metadata Generation** | `@google/genai` (or `@google/generative-ai`) | Official Google Gen AI SDK utilizing `gemini-2.5-flash` or `gemini-1.5-flash` with JSON response schema enforcement for SEO titles, descriptions, and tags. |
| **Thumbnail Generation** | `@napi-rs/canvas` or `canvas` + `sharp` | Fast, zero-dependency pre-compiled Canvas bindings for Node.js. Renders 1280x720 YouTube thumbnails with custom typography, brand gradients (`#004b5a`, `#d4af37`), watermarks, and badge graphics. |
| **Backend Web Framework** | `express` | Lightweight Node.js server serving frontend static assets, handling multipart file uploads, rendering progress streams, and exposing API endpoints. |
| **FileUpload Handling** | `multer` | Middleware for handling `multipart/form-data` video uploads stored in a temporary upload directory (`tmp/uploads`). |
| **Testing Framework** | `jest`, `supertest` | Fast unit testing for metadata prompts, campaign object builders, canvas generation, and HTTP endpoint assertion. |

---

## 3. R2 Architecture: Google Ads & YouTube Ads Campaign Creator

### 3.1 Architecture Overview

The Google Ads creator module is designed around the `GoogleAdsCampaignService` class, encapsulating authentication, payload construction, REST/gRPC client mutation, and dry-run fallback.

```
+-------------------------------------------------------------------+
|                     GoogleAdsCampaignService                      |
+-------------------------------------------------------------------+
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
  [ Live Credentials ]                        [ Dry-Run / Mock Mode ]
  - Verify Developer Token                    - Simulate Resource Names
  - Authenticate OAuth2                       - Validate Schema Contract
  - Execute Google Ads Mutates                - Return Structured Mock Result
            |                                           |
            +---------------------+---------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|               Google Ads API Operations Pipeline                  |
| 1. CampaignBudgetService.create (amount_micros)                  |
| 2. CampaignService.create (SEARCH or VIDEO)                       |
| 3. AdGroupService.create (SEARCH_STANDARD or VIDEO_RESPONSIVE)    |
| 4. AdGroupCriterionService.create (Keywords or Demographic/Topic) |
| 5. AdGroupAdService.create (Responsive Search Ad or Video Ad)     |
+-------------------------------------------------------------------+
```

### 3.2 Data Models & Interface Contracts

```typescript
// Shared Types & Interfaces
export interface BudgetConfig {
  amountMicros: number; // e.g. 50000000 = $50.00 MXN/USD
  deliveryMethod?: 'STANDARD' | 'ACCELERATED';
  explicitlyShared?: boolean;
}

export interface KeywordConfig {
  text: string;
  matchType: 'EXACT' | 'PHRASE' | 'BROAD';
}

export interface SearchAdCreative {
  headlines: string[]; // Min 3, Max 15 (e.g., "Joyería Aguamarina", "Anillos de Oro 18k", "Envíos Gratis")
  descriptions: string[]; // Min 2, Max 4
  finalUrl: string;
  path1?: string; // e.g. "joyeria"
  path2?: string; // e.g. "anillos"
}

export interface SearchCampaignRequest {
  name: string;
  budget: BudgetConfig;
  keywords: KeywordConfig[];
  creative: SearchAdCreative;
  targetLocations?: number[]; // Location criterion IDs (e.g. 2484 = Mexico)
  targetLanguages?: number[]; // Language criterion IDs (e.g. 1003 = Spanish)
  dryRun?: boolean;
}

export interface VideoAdCreative {
  youtubeVideoId: string; // e.g. "dQw4w9WgXcQ"
  headline: string; // Max 15 chars
  callToAction: string; // Max 10 chars (e.g. "Comprar", "Ver Más")
  description?: string;
  finalUrl: string;
}

export interface VideoCampaignRequest {
  name: string;
  budget: BudgetConfig;
  creative: VideoAdCreative;
  targeting?: {
    genders?: ('MALE' | 'FEMALE' | 'UNDETERMINED')[];
    ageRanges?: string[];
    topics?: string[];
  };
  dryRun?: boolean;
}

export interface CampaignCreationResult {
  success: boolean;
  dryRun: boolean;
  campaignId: string;
  campaignResourceName: string;
  budgetResourceName: string;
  adGroupResourceName: string;
  adGroupAdResourceName: string;
  createdKeywordsCount?: number;
  details: Record<string, any>;
}
```

### 3.3 Dry-Run & Mock Mode Architecture

When `DRY_RUN=true`, `GOOGLE_ADS_DEVELOPER_TOKEN` is missing, or `dryRun: true` is passed explicitly:
1. The service skips gRPC / HTTP connection establishment with Google Ads API servers.
2. The payload builder runs full client-side schema validation (e.g., ensuring headlines count >= 3, descriptions count >= 2, budgetMicros > 0, valid YouTube Video ID format).
3. Deterministic mock resource names are generated:
   - Campaign Budget: `customers/1234567890/campaignBudgets/mock-budget-${Date.now()}`
   - Campaign: `customers/1234567890/campaigns/mock-campaign-${Date.now()}`
   - AdGroup: `customers/1234567890/adGroups/mock-adgroup-${Date.now()}`
   - AdGroupAd: `customers/1234567890/adGroupAds/mock-adgroupad-${Date.now()}`
4. A complete `CampaignCreationResult` object is returned, logging exact API mutates that would have been sent to Google.

---

## 4. R3 Architecture: YouTube Auto-Upload Web Dashboard

### 4.1 System Components & Data Flow

```
[ Web Browser Frontend ]
   |
   |--- 1. Drag & Drop Video File + Metadata Prompt Options
   v
[ Express Server REST API ] ---> [ Multer File Processor ] ---> Saves to tmp/uploads/
   |
   |--- 2. Trigger Gemini API AI Metadata Generator
   v
[ Gemini API Service (@google/genai) ]
   |  (Uses prompt context: product name, target keywords, Aguamarina tone)
   |---> Returns JSON { title, description, tags }
   |
   |--- 3. Trigger Thumbnail Generator Service
   v
[ Canvas/Sharp Thumbnail Engine ]
   |  (Draws 1280x720 image, dark aquamarine/gold theme, overlay text)
   |---> Returns PNG Buffer
   |
   |--- 4. Resumable Upload to YouTube Data API v3
   v
[ YouTube Upload Service (googleapis) ]
   |  (Uploads video stream + sets video thumbnail)
   |
   +---> Sends Real-Time Progress Events via SSE stream to Frontend UI
```

### 4.2 Gemini API Metadata Generator Integration

- **Model Selection:** `gemini-2.5-flash` (or `gemini-1.5-flash` as fallback).
- **Prompt Structure:**
```typescript
export async function generateVideoMetadata(context: {
  productName: string;
  category: string;
  keyFeatures: string[];
  targetAudience?: string;
}): Promise<{ title: string; description: string; tags: string[] }> {
  const prompt = `
    You are an expert YouTube SEO specialist for "Aguamarina Joyería", a high-end luxury jewelry brand.
    Generate optimized YouTube metadata in Spanish for a video showcasing:
    Product: ${context.productName}
    Category: ${context.category}
    Key Features: ${context.keyFeatures.join(', ')}
    Target Audience: ${context.targetAudience || 'Luxury jewelry buyers, engagement ring shoppers'}

    Output ONLY valid JSON matching this exact structure:
    {
      "title": "SEO title max 90 characters including 'Aguamarina Joyería' and key search terms",
      "description": "Detailed description in Spanish (200-300 words) with key product highlights, timestamps placeholder, call to action, brand website link, and relevant hashtags",
      "tags": ["array", "of", "12-20", "relevant", "spanish", "keywords"]
    }
  `;
  // LLM call using @google/genai SDK with structured response constraint
}
```

### 4.3 Professional Thumbnail Canvas Generator

- **Specifications:**
  - Dimensions: `1280 x 720` pixels (standard 16:9 HD resolution).
  - Format: PNG / JPEG Buffer.
  - Visual Hierarchy & Design Tokens:
    - **Background Gradient:** Linear gradient from deep aquamarine (`#003844`) to dark midnight navy (`#08121e`).
    - **Accent & Gold Borders:** Metallic gold styling (`#d4af37`, `#f3e5ab`).
    - **Brand Header/Badge:** "AGUAMARINA JOYERÍA" in clean sans-serif / serif font, enclosed in a gold pill badge at top left.
    - **Main Headline Text:** High-contrast bold white text (`#ffffff`) with shadow (`rgba(0,0,0,0.8)`), auto-wrapped to fit max 2 lines.
    - **Callout Tag / Sticker:** Golden badge at bottom right e.g. "ORO 18K", "EDICIÓN EXCLUSIVA", "GUADALAJARA".
    - **Jewelry Motif Overlay:** Decorative gem / diamond vector icon drawn via Canvas paths.

```typescript
// Sample Canvas Generation Pipeline
import { createCanvas } from '@napi-rs/canvas';

export function createProfessionalThumbnail(options: {
  mainTitle: string;
  badgeText?: string;
  subtitle?: string;
}): Buffer {
  const canvas = createCanvas(1280, 720);
  const ctx = canvas.getContext('2d');

  // 1. Draw Luxurious Dark Aquamarine Gradient
  const grad = ctx.createLinearGradient(0, 0, 1280, 720);
  grad.addColorStop(0, '#004b5a');
  grad.addColorStop(0.5, '#07252f');
  grad.addColorStop(1, '#050e14');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1280, 720);

  // 2. Draw Decorative Border & Accent Lines
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, 1240, 680);

  // 3. Draw Aguamarina Joyería Brand Header
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText('AGUAMARINA JOYERÍA', 60, 80);

  // 4. Main Title Overlay
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px sans-serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 12;
  ctx.fillText(options.mainTitle.toUpperCase(), 60, 320);

  // 5. Secondary Badge / Callout
  if (options.badgeText) {
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(60, 400, 300, 60);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(options.badgeText, 80, 440);
  }

  return canvas.toBuffer('image/png');
}
```

### 4.4 YouTube Upload & Real-Time SSE Pipeline

- **Upload Endpoint:** `POST /api/youtube/upload` (Multipart upload handling video file + text metadata).
- **SSE Stream Endpoint:** `GET /api/youtube/upload-progress/:jobId` (Server-Sent Events endpoint).
- **Upload Progress Phases:**
  1. `10%` - Video file received and validated.
  2. `30%` - Gemini API metadata generated (Title, Description, Tags ready).
  3. `50%` - Canvas Thumbnail generated and converted to image buffer.
  4. `75%` - YouTube Data API resumable video stream upload in progress (`youtube.videos.insert`).
  5. `90%` - Setting custom thumbnail (`youtube.thumbnails.set`).
  6. `100%` - Upload complete! Video URL returned (`https://www.youtube.com/watch?v=...`).

- **Mock Upload Mode:** When `DRY_RUN=true` or live Google OAuth2 tokens are unconfigured:
  - Simulates the 6 progress phases over a 3-5 second interval.
  - Generates real metadata via Gemini (or mock metadata if Gemini key is missing).
  - Renders the real Canvas thumbnail image and saves it to `public/thumbnails/latest.png` for preview in the dashboard.
  - Emits SSE logs and returns mock video URL `https://www.youtube.com/watch?v=MOCK_YOUTUBE_ID`.

---

## 5. Directory & File Structure Plan

```
aguamarina_marketing_automation/
├── package.json
├── .env.example
├── .env
├── README.md
├── public/                     # Frontend static assets for R3 Dashboard
│   ├── index.html              # Drag & drop upload UI, progress bar, log terminal
│   ├── css/
│   │   └── style.css           # Modern dark-mode UI with aquamarine & gold theme
│   └── js/
│       └── app.js              # Frontend client script (drag-and-drop, SSE listener)
├── src/
│   ├── server.js               # Express application entry point
│   ├── config/
│   │   └── env.js              # Centralized env configuration & validation
│   ├── ads/                    # R2: Google & YouTube Ads Module
│   │   ├── googleAdsClient.js  # Official Google Ads API client wrapper
│   │   ├── searchCampaign.js   # Search campaign creator & payload builder
│   │   ├── videoCampaign.js    # YouTube video ad campaign creator & payload builder
│   │   └── mockAdsEngine.js    # Dry-run mock data generator & validator
│   ├── youtube/                # R3: YouTube Upload & Metadata Module
│   │   ├── geminiMetadata.js   # Gemini API integration for titles/descriptions/tags
│   │   ├── thumbnailService.js # Canvas/Sharp 1280x720 thumbnail generator
│   │   ├── youtubeUploader.js  # googleapis YouTube Data API v3 upload service
│   │   └── uploadJobManager.js # SSE job manager for real-time progress tracking
│   └── routes/
│       ├── adsRoutes.js        # Express routes for campaign creation API
│       └── youtubeRoutes.js    # Express routes for upload, metadata, and SSE progress
└── tests/                      # Jest test suites
    ├── ads/
    │   ├── searchCampaign.test.js
    │   └── videoCampaign.test.js
    └── youtube/
        ├── geminiMetadata.test.js
        ├── thumbnailService.test.js
        └── youtubeUploader.test.js
```

---

## 6. Verification & Test Strategy

1. **Unit Testing with Jest:**
   - Test `SearchCampaign` payload generator against Google Ads API schema specs.
   - Test `VideoCampaign` targeting and creative payload formats.
   - Test `geminiMetadata.js` prompt rendering and fallback response parsing.
   - Test `thumbnailService.js` verifying output PNG image buffer width (1280), height (720), and non-zero byte size.

2. **Integration Testing with Supertest:**
   - Endpoint `POST /api/ads/campaigns/search` in dry-run mode returns HTTP 200 with structured mock campaign object.
   - Endpoint `POST /api/ads/campaigns/video` in dry-run mode returns HTTP 200 with mock video campaign resource names.
   - Endpoint `POST /api/youtube/upload` with mock video file triggers mock job pipeline and emits SSE events.

3. **Frontend UI Verification:**
   - Web server running on `http://localhost:3000`.
   - HTML page includes drag-and-drop zone, title context input, dry-run toggle, live progress log terminal, and thumbnail preview element.

---

## 7. Summary & Recommendations for Implementation

1. **npm Dependencies:** Install `express`, `multer`, `google-ads-api`, `google-auth-library`, `googleapis`, `@google/genai`, `@napi-rs/canvas` (or `canvas`), `dotenv`, `cors`. For dev/testing: `jest`, `supertest`.
2. **Graceful Credential Fallback:** Ensure all modules check environment variables dynamically and default to dry-run / mock mode whenever live keys are absent.
3. **Resilient Canvas Thumbnail Service:** Use `@napi-rs/canvas` or standard canvas with fallback drawing logic so system builds smoothly across environments without C++ build chain failures.
