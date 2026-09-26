# Aguamarina Marketing Automation — Comprehensive Feature Specification & API Contracts

**Document Status**: Mining Completed / Ready for Implementation  
**Target Project**: Aguamarina Joyería Marketing & SEO Automation System  
**Working Directory**: `C:\Users\QS\.gemini\antigravity\scratch\aguamarina_marketing_automation`  
**Date**: 2026-08-08  

---

## 1. Executive Summary & Architecture Overview

The **Aguamarina Marketing Automation System** is an integrated marketing, local SEO optimization, digital advertising management, and video distribution platform engineered for **Aguamarina Joyería**. The system automates four core operational workflows:

1. **Local SEO HTML Optimizer (R1)**: Command-line & programmatic parser that scans local HTML files, automatically injects and optimizes high-value SEO tags (`<title>`, meta descriptions, viewport, OpenGraph tags, header hierarchies, image `alt` attributes based on content context), and outputs structured audit reports while maintaining valid HTML markup.
2. **Google Ads & YouTube Ads Campaign Creator (R2)**: Automated integration with the official Google Ads API SDK (`@google-ads/google-ads-api`) for programmatically creating Search and Video (YouTube) ad campaigns with configurable budgets, keyword match strategies, geo/demographic targeting, and ad creatives, featuring a dry-run / mock execution engine for test environments.
3. **YouTube Auto-Upload Web Dashboard (R3)**: Modern web portal (Express.js backend + responsive HTML5/CSS3 frontend) enabling video uploads, AI metadata generation via Google Gemini API (SEO-focused title, description, tags), automated video thumbnail generation (1280x720 canvas/image composition), and resumable upload to YouTube via YouTube Data API v3 with live status/progress streaming.
4. **Configuration & Credentials Manager (R4)**: Centralized configuration layer (`.env` validation schema, `.env.example` reference), coupled with setup guides (`README.md` and API key/OAuth credential retrieval manuals).

---

## 2. Feature Inventory

### Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| F-01 | R1: SEO Optimizer | Directory Scanner & Traversal | Scans directory recursively for `.html` / `.htm` files, skipping non-HTML assets. | Target directory path (`string`), recursive flag (`boolean`). | List of HTML file absolute paths (`string[]`). | Throws `DirectoryNotFoundError` if path does not exist; returns empty array if no HTML files found. | Requirement R1 |
| F-02 | R1: SEO Optimizer | Title Tag Injector/Optimizer | Injects or updates `<title>` tag using top `<h1>`, hero text, or file/folder name + brand suffix `\| Aguamarina Joyería`. | Parsed DOM tree, filename context. | Optimized `<title>` string inside `<head>`. | Keeps existing title if valid & brand-compliant; generates default title if body empty. | Requirement R1 & AC |
| F-03 | R1: SEO Optimizer | Meta Description Generator | Generates meta description tag (150-160 chars) from lead paragraph text or page context. | Parsed DOM content. | `<meta name="description" content="...">` tag in `<head>`. | Uses fallback brand description if no body text is available. | Requirement R1 & AC |
| F-04 | R1: SEO Optimizer | Meta Viewport Injector | Ensures mobile-friendly viewport meta tag exists. | Parsed DOM tree. | `<meta name="viewport" content="width=device-width, initial-scale=1.0">`. | Overwrites non-standard viewport or appends if missing. | Requirement R1 |
| F-05 | R1: SEO Optimizer | OpenGraph & Twitter Meta Tags | Injects `og:title`, `og:description`, `og:type`, `og:image`, `twitter:card`. | Existing title, meta description, first content image. | OpenGraph `<meta>` tags in `<head>`. | Uses default brand image fallback if no inline images found. | Discovered Feature |
| F-06 | R1: SEO Optimizer | Header Hierarchy Normalizer | Audits and corrects `<h1>`-`<h6>` structure; ensures single `<h1>` per page and fixes skipped levels. | Parsed DOM heading elements. | Re-structured heading tags (`<h1>`, `<h2>`, etc.). | Demotes extra `<h1>` tags to `<h2>`; elevates orphan `<h3>` tags if `<h2>` missing. | Requirement R1 |
| F-07 | R1: SEO Optimizer | Image Alt Attribute Enricher | Contextually populates missing or empty `alt` attributes on `<img>` tags based on filename, parent section context, or `figcaption`. | `<img>` elements, filename, surrounding DOM. | Populated `alt="..."` attributes on `<img>` tags. | Generates generic brand descriptive alt text if no context available. | Requirement R1 & AC |
| F-08 | R1: SEO Optimizer | HTML Validation & Formatting | Preserves original formatting, doctype, and tag validity post-parsing using Cheerio/parse5. | Modified HTML string. | Valid HTML file saved to disk. | Emits warning log if HTML parsing encounters structural syntax errors. | Acceptance Criteria |
| F-09 | R1: SEO Optimizer | Modification Audit Reporter | Produces JSON and formatted CLI console summary of all HTML modifications made. | Pre/post DOM state comparison. | Audit Report object / file / console table. | Returns zero-change report if directory was already fully optimized. | Requirement R1 |
| F-10 | R2: Google Ads | Dry-Run / Mock Execution Engine | Intercepts Google Ads API calls when credentials are missing or `DRY_RUN_MODE=true`, returning valid mock API payloads without making live network requests. | Campaign config payload, `DRY_RUN_MODE` flag. | Mock resource names (e.g. `customers/123/campaigns/456`), simulated response. | Logs mock execution warning to console; throws error if payload schema is invalid. | Requirement R2 & AC |
| F-11 | R12: Google Ads | Search Campaign Creator | Creates a Google Ads Search Campaign with budget, keywords, targeting, and text ads. | Search campaign payload (budget, keywords, match types, headlines, descriptions, target geo). | Campaign creation result with campaign resource ID. | Throws `GoogleAdsApiError` with detailed code and message on failure. | Requirement R2 & AC |
| F-12 | R2: Google Ads | Video (YouTube) Campaign Creator | Programmatically creates YouTube Video Ad Campaign linking to target YouTube video asset ID. | Video campaign payload (budget, video asset ID, ad network, headlines, CTA). | Video Campaign creation result. | Throws `GoogleAdsApiError` if video asset ID is invalid or missing. | Requirement R2 & AC |
| F-13 | R2: Google Ads | Payload Schema Validator | Validates campaign budgets (in micros), keywords, and creative character lengths prior to API calls. | Raw user campaign input object. | Validated payload object or validation error array. | Throws `ValidationError` listing all schema violations (e.g., headline > 30 chars). | Requirement R2 & AC |
| F-14 | R3: YouTube Dashboard | Web Application Server | Serves Express REST API and static UI dashboard assets on configurable host/port. | Environment port (`PORT=3000`), static asset directory. | HTTP server listening on `http://localhost:3000`. | Gracefully logs error if port is in use and exits. | Requirement R3 & AC |
| F-15 | R3: YouTube Dashboard | File Upload Dropzone | HTML5 drag-and-drop interface for selecting video files with client-side format/size validation. | User file drop event / file picker. | Selected file payload (`video/mp4`, `video/webm`, `video/quicktime`). | Displays UI alert if file format is unsupported or file size exceeds limits. | Requirement R3 & AC |
| F-16 | R3: YouTube Dashboard | Gemini AI Metadata Generator | Calls Google Gemini API (`gemini-1.5-flash` / `gemini-1.5-pro`) to generate optimized title, description, and hashtags based on prompt context. | Video context prompt, category, language, target audience. | JSON object containing `title`, `description`, `tags[]`. | Falls back to default template metadata if Gemini API quota/error occurs. | Requirement R3 & AC |
| F-17 | R3: YouTube Dashboard | Auto Thumbnail Generator | Generates high-contrast 1280x720 thumbnail image with text overlay using Node.js canvas / image library. | Video title, brand asset overlay, color scheme. | JPEG/PNG image buffer (1280x720, < 2MB). | Uses static brand thumbnail fallback if image canvas generation fails. | Requirement R3 |
| F-18 | R3: YouTube Dashboard | YouTube Resumable Upload Engine | Integrates with YouTube Data API v3 (`videos.insert`) to upload video and set thumbnail (`thumbnails.set`). | Video stream/buffer, metadata JSON, thumbnail buffer, OAuth refresh token. | YouTube Video URL (`https://youtu.be/...`), Video ID. | Handles network interruptions; returns detailed YouTube API error message on auth failure. | Requirement R3 & AC |
| F-19 | R3: YouTube Dashboard | Real-Time Progress Stream | Streams upload progress percentage and step logs to frontend UI using Server-Sent Events (SSE) or polling. | Upload progress events (0-100%). | SSE event stream (`/api/upload-stream`) or status polling. | UI displays error state in progress log if upload aborts. | Requirement R3 & AC |
| F-20 | R4: Credentials Manager | Environment Centralization & Validator | Loads and validates `.env` file variables against expected schema at application startup. | `.env` file path. | Environment configuration object. | Logs clear missing variable warnings on startup. | Requirement R4 & AC |
| F-21 | R4: Credentials Manager | Credential Setup Guide Documentation | Provides step-by-step Markdown guide (`README.md` / `docs/CREDENTIALS_GUIDE.md`) for acquiring Google Ads Developer Token, OAuth Client ID/Secret, YouTube API access, and Gemini API key. | N/A (Documentation). | Markdown guide files in project directory. | N/A. | Requirement R4 & AC |

---

## 3. Edge Cases & Boundary Conditions

| # | Feature | Input / Condition | Expected / Observed Behavior |
|---|---------|-------------------|------------------------------|
| E-01 | R1: SEO Optimizer | HTML file missing `<head>` tag completely. | Optimizer automatically creates a valid `<head>` element inside `<html>` and injects title, description, and viewport tags without corrupting `<body>`. |
| E-02 | R1: SEO Optimizer | HTML file contains multiple `<h1>` tags. | Optimizer preserves the first `<h1>` as primary and demotes subsequent `<h1>` tags to `<h2>`, updating heading hierarchy log. |
| E-03 | R1: SEO Optimizer | `<img>` tag with `src` pointing to SVG/data URI and missing `alt`. | Optimizer parses surrounding text/parent container or file identifier to supply a descriptive `alt` attribute. |
| E-04 | R1: SEO Optimizer | Non-UTF-8 encoded HTML file (e.g., ISO-8859-1 or Latin-1). | Optimizer detects encoding (or defaults cleanly to UTF-8 BOM check) and converts/saves without corrupting special Spanish characters (`ñ`, `á`, `é`, `í`, `ó`, `ú`). |
| E-05 | R1: SEO Optimizer | Empty `.html` file (0 bytes). | Optimizer logs empty file warning, injects minimal boilerplate HTML5 structure, and reports file creation. |
| E-06 | R1: SEO Optimizer | HTML containing embedded JavaScript or CSS with HTML string literals (e.g., `var html = "<div></div>"`). | Optimizer parser (Cheerio DOM parser) isolates `<script>` contents and does not modify embedded string literals. |
| E-07 | R2: Google Ads | `DRY_RUN_MODE=true` set in `.env` or missing live credentials. | API wrapper bypasses external HTTP call to Google Ads API endpoints, executes mock payload validation, and returns a synthetic successful campaign creation object. |
| E-08 | R2: Google Ads | Keyword contains invalid special characters or exceeded character limits (> 80 chars). | Payload schema validator catches error prior to API call and returns an explicit validation error object listing invalid keywords. |
| E-09 | R2: Google Ads | Budget specified in standard currency (e.g., `$500.00`) instead of micros (`500000000`). | Campaign creator helper utility converts currency input into integer micros automatically (`amount * 1,000,000`). |
| E-10 | R2: Google Ads | Customer ID provided with dashes (`123-456-7890`) vs without (`1234567890`). | Customer ID sanitizer strips dashes automatically before calling Google Ads client constructor. |
| E-11 | R3: YouTube Dashboard | Large video file upload (> 100MB up to 2GB). | Backend processes upload via streaming chunks using `multer` storage without loading full video buffer into Node.js heap memory. |
| E-12 | R3: YouTube Dashboard | Gemini API returns raw text with markdown formatting (e.g. `` ```json ... ``` ``) during metadata generation. | JSON parser cleanses markdown code block fences before parsing metadata payload into structured title, description, and tags. |
| E-13 | R3: YouTube Dashboard | YouTube API thumbnail upload fails after successful video upload. | Upload process logs thumbnail error, retains uploaded video, and returns success response with video URL and warning note regarding thumbnail status. |
| E-14 | R3: YouTube Dashboard | Client closes browser tab mid-upload. | Backend server completes current background upload process or cleanly aborts chunked stream and cleans up temporary uploaded files from disk. |
| E-15 | R4: Credentials Manager | `.env` file missing or blank at startup. | Application falls back to `DRY_RUN_MODE=true`, displays standard startup warning banner with instructions to copy `.env.example`, and continues serving local web interface. |

---

## 4. Deep Requirements Breakdown & Specifications

### 4.1 Requirement 1: Local SEO HTML Optimizer (R1)

#### 4.1.1 Overview & Architecture
The Local SEO HTML Optimizer is a CLI and programmatic Node.js module that audits and modifies HTML files stored in a designated directory tree. It reads HTML files, builds a DOM tree using a resilient parser (e.g., `cheerio`), evaluates SEO tag presence and content quality, applies transformations based on context rules, and writes back formatted HTML while generating a detailed execution report.

#### 4.1.2 Module API Contract

```typescript
// Interfaces for SEO Optimizer
export interface SeoOptimizeOptions {
  directoryPath: string;
  recursive?: boolean;          // Default: true
  brandName?: string;           // Default: "Aguamarina Joyería"
  defaultLanguage?: string;     // Default: "es"
  dryRun?: boolean;             // Default: false (if true, report changes without writing to disk)
  outputReportPath?: string;    // Path to save JSON report
}

export interface ModificationDetail {
  tag: string;
  action: 'injected' | 'updated' | 'demoted' | 'formatted';
  oldValue?: string;
  newValue: string;
  reason: string;
}

export interface FileOptimizationResult {
  filePath: string;
  status: 'modified' | 'unmodified' | 'error';
  modifications: ModificationDetail[];
  error?: string;
}

export interface SeoAuditReport {
  timestamp: string;
  scannedDirectory: string;
  totalFilesScanned: number;
  filesModified: number;
  filesUnmodified: number;
  filesFailed: number;
  results: FileOptimizationResult[];
}

// Public API signatures
export function optimizeFile(filePath: string, options?: Partial<SeoOptimizeOptions>): FileOptimizationResult;
export function optimizeDirectory(options: SeoOptimizeOptions): Promise<SeoAuditReport>;
```

#### 4.1.3 Tag Transformation Rules Matrix

1. **Document Title (`<title>`)**:
   - *Detection*: Look for `<head> <title>`.
   - *Rule*: If missing, empty, or generic (e.g. "Document", "Untitled"), extract text from the primary `<h1>`, hero heading, or filename. Ensure title ends with `| Aguamarina Joyería`.
   - *Length Constraint*: Target length 50 - 60 characters.

2. **Meta Description (`<meta name="description">`)**:
   - *Detection*: Look for `<meta name="description">` in `<head>`.
   - *Rule*: If missing or empty, extract the first non-empty `<p>` element content inside `<main>` or `<body>`. Truncate at word boundary to 150–160 characters and append full stop.

3. **Meta Viewport (`<meta name="viewport">`)**:
   - *Rule*: Ensure `<meta name="viewport" content="width=device-width, initial-scale=1.0">` is present in `<head>`. Inject if missing.

4. **Header Hierarchy (`<h1>` - `<h6>`)**:
   - *Rule*: Exactly one `<h1>` per document. If multiple `<h1>` tags exist, the first `<h1>` is preserved; all subsequent `<h1>` tags are demoted to `<h2>`. If no `<h1>` exists, the highest level heading (`<h2>`) is promoted to `<h1>`.

5. **Image `alt` Attributes (`<img alt="...">`)**:
   - *Rule*: Iterate through all `<img>` tags. If `alt` is missing or empty:
     - Check for sibling/parent `<figcaption>` text.
     - Fallback: Infer descriptive string from filename (e.g., `anillo-oro-18k-diamante.jpg` -> `Anillo oro 18k diamante - Aguamarina Joyería`).
     - Fallback 2: "Joyería fina Aguamarina".

6. **OpenGraph & Twitter Card Metadata**:
   - *Rule*: Injects `og:title`, `og:description`, `og:type` (`website`), `og:site_name` (`Aguamarina Joyería`), `og:image` (first content `<img>` src or default brand logo), and `twitter:card` (`summary_large_image`).

#### 4.1.4 CLI Command Specification
```bash
# Usage:
node bin/seo-optimizer.js --dir ./public --recursive --dry-run
```
- Parameters:
  - `--dir, -d <path>` (Required): Target directory.
  - `--recursive, -r` (Optional): Scan subdirectories recursively (default: `true`).
  - `--dry-run` (Optional): Execute audit and output report without saving files to disk.
  - `--report <path>` (Optional): Export report JSON to target path.

---

### 4.2 Requirement 2: Google Ads & YouTube Ads Campaign Creator (R2)

#### 4.2.1 Overview & Architecture
The Google Ads Integration module provides programmatic methods to construct and submit Google Ads **Search Campaigns** and **Video (YouTube) Campaigns** using `@google-ads/google-ads-api`. It features a robust **Dry-Run / Mock Engine** that allows developers to run integration tests without connecting to live billing or spending real ad budget.

#### 4.2.2 Module API Contract

```typescript
// Campaign Creator Types & Interfaces

export interface CampaignBudgetConfig {
  name: string;
  amountMicros: number; // e.g., 50000000 for $50.00 / 50 MXN
  deliveryMethod?: 'STANDARD' | 'ACCELERATED';
}

export interface TargetingConfig {
  geoTargetLocationIds: string[]; // e.g. ["2484"] for Mexico
  languages: string[];            // e.g. ["languageConstants/1003"] for Spanish
  demographics?: {
    gender?: ('MALE' | 'FEMALE' | 'UNDETERMINED')[];
    ageRanges?: string[];
  };
}

export interface KeywordConfig {
  text: string;
  matchType: 'EXACT' | 'PHRASE' | 'BROAD';
}

export interface SearchAdCreative {
  headlines: string[];       // 3-15 headlines (max 30 chars each)
  descriptions: string[];    // 2-4 descriptions (max 90 chars each)
  finalUrls: string[];       // Target landing page URLs
}

export interface SearchCampaignRequest {
  customer_id: string;
  name: string;
  budget: CampaignBudgetConfig;
  targeting: TargetingConfig;
  keywords: KeywordConfig[];
  adCreative: SearchAdCreative;
  startDate?: string;        // YYYY-MM-DD
  endDate?: string;          // YYYY-MM-DD
}

export interface VideoAdCreative {
  youtubeVideoId: string;    // YouTube Video Asset ID (e.g. "dQw4w9WgXcQ")
  headline: string;          // Max 15 chars
  description: string;       // Max 90 chars
  callToAction: string;      // Max 10 chars
  displayUrl: string;        // Max 35 chars
  finalUrls: string[];       // Landing page URL
}

export interface VideoCampaignRequest {
  customer_id: string;
  name: string;
  budget: CampaignBudgetConfig;
  targeting: TargetingConfig;
  adCreative: VideoAdCreative;
  channelId?: string;
}

export interface CampaignCreationResponse {
  success: boolean;
  isMock: boolean;
  campaignId: string;
  campaignResourceName: string;
  budgetResourceName: string;
  adGroupResourceNames: string[];
  createdKeywordsCount?: number;
  timestamp: string;
}

// Public Interface Class
export class GoogleAdsCampaignService {
  constructor(config?: { dryRun?: boolean });
  
  createSearchCampaign(request: SearchCampaignRequest): Promise<CampaignCreationResponse>;
  createVideoCampaign(request: VideoCampaignRequest): Promise<CampaignCreationResponse>;
}
```

#### 4.2.3 Dry-Run & Mock Mode Architecture
- **Trigger**: Activated when `DRY_RUN_MODE=true` in `.env`, or when `config.dryRun = true`, or when live API credentials (`GOOGLE_ADS_DEVELOPER_TOKEN`) are unpopulated.
- **Behavior**:
  1. Performs full schema validation on inputs (`customer_id` format, `amountMicros > 0`, headline/description character limits, valid URLs).
  2. Generates mock resource names following Google Ads API resource naming convention:
     - Campaign: `customers/{customer_id}/campaigns/mock-cmp-{timestamp}`
     - Budget: `customers/{customer_id}/campaignBudgets/mock-bgt-{timestamp}`
     - AdGroup: `customers/{customer_id}/adGroups/mock-ag-{timestamp}`
  3. Returns `isMock: true` with a HTTP 200 equivalent response object.

---

### 4.3 Requirement 3: YouTube Auto-Upload Web Dashboard (R3)

#### 4.3.1 Overview & Tech Stack
The YouTube Auto-Upload Web Dashboard is a full-stack Node.js/Express web application with a modern, glassmorphic UI. It allows marketing personnel to select a video file, provide product context, generate AI metadata using Gemini API, generate or upload thumbnail images, and upload the complete video package to YouTube via YouTube Data API v3 with real-time status logging.

#### 4.3.2 Express Backend REST API Specs

##### 1. `POST /api/generate-metadata`
- **Description**: Uses Google Gemini API (`@google/genai` or `@google/generative-ai`) to create SEO-optimized title, description, and hashtags for Aguamarina Joyería videos.
- **Request Body**:
  ```json
  {
    "contextPrompt": "Anillo de compromiso en oro blanco de 18k con diamante corte brillante",
    "category": "Joyería / Lujo",
    "targetAudience": "Parejas, bodas, regalos de aniversario",
    "language": "es"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "metadata": {
      "title": "Anillo de Compromiso Oro Blanco 18K y Diamante | Aguamarina Joyería",
      "description": "Descubre la elegancia eterna de nuestro anillo de compromiso en oro blanco de 18K con diamante corte brillante. Perfecto para dar el siguiente paso en tu historia de amor.\n\n✨ Características:\n- Material: Oro Blanco 18K\n- Gema: Diamante natural certificado\n- Colección: Anillos de Boda Aguamarina\n\n📍 Visita nuestra boutique o tienda en línea.\n#AguamarinaJoyería #AnilloDeCompromiso #OroBlanco #JoyeríaFina",
      "tags": ["aguamarina joyeria", "anillo de compromiso", "oro blanco 18k", "diamantes", "joyeria fina", "anillos de boda", "regalos de lujo"]
    }
  }
  ```

##### 2. `POST /api/generate-thumbnail`
- **Description**: Renders a 1280x720 PNG/JPEG thumbnail image with customizable title overlay and Aguamarina branding.
- **Request Body**:
  ```json
  {
    "titleText": "Anillo de Compromiso Oro Blanco 18K",
    "styleTheme": "gold_luxury"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "thumbnailUrl": "/uploads/thumbnails/thumb_1723123456.png",
    "mimeType": "image/png"
  }
  ```

##### 3. `POST /api/upload`
- **Description**: Triggers video and thumbnail upload to YouTube Data API v3 (or mock upload flow if dry-run enabled).
- **Multipart Form Data**:
  - `video`: Video File (`video/mp4`, `video/webm`, `video/quicktime`)
  - `title`: String (max 100 chars)
  - `description`: String (max 5000 chars)
  - `tags`: Comma-separated string or array
  - `privacyStatus`: `private` | `unlisted` | `public`
  - `thumbnail`: Optional custom image file or generated thumbnail path
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "isMock": false,
    "videoId": "xY89zAbCdEf",
    "youtubeUrl": "https://www.youtube.com/watch?v=xY89zAbCdEf",
    "thumbnailUploaded": true,
    "message": "Video successfully uploaded to YouTube!"
  }
  ```

##### 4. `GET /api/upload-stream` (Server-Sent Events) or `GET /api/status/:taskId`
- **Description**: Streams live progress updates to the frontend interface.
- **SSE Stream Data Payload**:
  ```json
  {
    "taskId": "task-9876",
    "step": "UPLOADING_VIDEO",
    "progressPercent": 65,
    "message": "Uploading video binary chunk 3/5..."
  }
  ```

#### 4.3.3 Frontend UI Component Specifications
- **Theme & Layout**: Dark/light mode support, clean responsive layout, glassmorphism card styling (`backdrop-filter: blur(12px)`), CSS custom variables.
- **Components**:
  1. **Video Dropzone Card**: Drag-and-drop file target with visual active state, file detail badge (name, size in MB, duration if previewable).
  2. **AI Context & Metadata Editor Card**: Input prompt box, "Generate with AI" button with spinner, editable Title, Description, and Tag inputs pre-populated by Gemini response.
  3. **Thumbnail Preview Box**: Display generated 1280x720 thumbnail with "Regenerate" and "Upload Custom Image" options.
  4. **Live Execution Console**: Real-time progress bar (0 to 100%) and terminal-style status log box displaying SSE step logs.

---

### 4.4 Requirement 4: Configuration & Credentials Manager (R4)

#### 4.4.1 `.env.example` Schema Specification

The project requires a `.env.example` template file containing all environment variable keys, expected format descriptions, and default values.

```env
# ==========================================
# AGUAMARINA MARKETING AUTOMATION - CONFIG
# ==========================================

# Server Configuration
PORT=3000
HOST=localhost
NODE_ENV=development

# Execution Mode (Set to true to disable live API spending/uploads during testing)
DRY_RUN_MODE=true

# ------------------------------------------
# Google Ads API Credentials
# ------------------------------------------
# Google Cloud OAuth 2.0 Client ID and Secret
GOOGLE_ADS_CLIENT_ID=your_google_ads_client_id.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=your_google_ads_client_secret

# Google Ads Developer Token (obtained from Google Ads Manager account)
GOOGLE_ADS_DEVELOPER_TOKEN=your_google_ads_developer_token

# User Refresh Token authorized for Google Ads API scope
GOOGLE_ADS_REFRESH_TOKEN=1//your_google_ads_refresh_token

# 10-digit Google Ads Customer Account ID (without dashes)
GOOGLE_ADS_CUSTOMER_ID=1234567890

# ------------------------------------------
# YouTube Data API v3 Credentials
# ------------------------------------------
# YouTube Channel ID for uploads
YOUTUBE_CHANNEL_ID=UCxxxxxx_your_youtube_channel_id

# OAuth 2.0 Credentials (can re-use Google Ads OAuth Client or separate client)
YOUTUBE_CLIENT_ID=your_youtube_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
YOUTUBE_REFRESH_TOKEN=1//your_youtube_refresh_token

# ------------------------------------------
# Google Gemini API Config
# ------------------------------------------
# API Key obtained from Google AI Studio (https://aistudio.google.com)
GEMINI_API_KEY=AIzaSy_your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
```

#### 4.4.2 Documentation Setup Guide (`README.md` & `CREDENTIALS_GUIDE.md`)
The setup documentation must outline step-by-step instructions for acquiring required Google credentials:

1. **Step 1: Google Cloud Console Setup**
   - Create a Google Cloud Project (e.g. `aguamarina-marketing-auto`).
   - Configure the OAuth Consent Screen (Internal or External test users).
   - Create OAuth 2.0 Client Credentials (Web Client or Desktop Client).
2. **Step 2: Google Ads API Developer Token**
   - Apply for a Developer Token via Google Ads Manager Account (`Tools & Settings -> API Center`).
   - Copy Test Account Customer ID for test campaigns.
3. **Step 3: YouTube Data API v3 Activation**
   - Enable YouTube Data API v3 in Google Cloud Library.
   - Authorize OAuth 2.0 scope: `https://www.googleapis.com/auth/youtube.upload`.
   - Run the OAuth token helper script (`npm run auth:google`) to exchange authorization code for a Refresh Token.
4. **Step 4: Gemini API Key Acquisition**
   - Visit Google AI Studio (`aistudio.google.com`).
   - Create API Key and add to `GEMINI_API_KEY`.

---

## 5. Acceptance Criteria Verification Matrix

| AC # | Requirement | Acceptance Criterion Description | Target Test / Verification Strategy | Status |
|------|-------------|----------------------------------|-------------------------------------|--------|
| AC-1 | R1: SEO Optimizer | Running optimizer on directory with unoptimized HTML files succeeds & adds meta tags & `alt` attributes. | End-to-end integration test (`npm test`) executing `optimizeDirectory()` on test fixture directory containing raw HTML files. | Ready for Dev |
| AC-2 | R1: SEO Optimizer | Modified HTML files remain valid HTML and load correctly in a browser. | W3C HTML validator / Cheerio parse assertion ensuring doc structure integrity and valid render tree. | Ready for Dev |
| AC-3 | R2: Google Ads | Unit or integration tests mock Google Ads API client and verify request payload matches Search/Video schema. | Jest/Vitest unit tests asserting request payload structure in mock execution mode. | Ready for Dev |
| AC-4 | R3: YouTube Dashboard | Dashboard serves functional, visually modern interface on `localhost`. | Browser verification / Supertest route verification (`GET /` returns 200 and renders HTML UI). | Ready for Dev |
| AC-5 | R3: YouTube Dashboard | Video upload triggers LLM generation of professional metadata (verified via unit test / console log). | Backend API integration test verifying `POST /api/generate-metadata` calls Gemini API mock/live and returns valid metadata schema. | Ready for Dev |
| AC-6 | R3: YouTube Dashboard | Mock upload flow can be triggered, simulating video/thumbnail upload, displaying completion status in UI. | Frontend/Backend integration test verifying mock upload flow updates status log and displays video success card. | Ready for Dev |
| AC-7 | R4: Credentials | `.env.example` exists with all necessary variables. | Direct file assertion confirming presence of `.env.example` and all required key names. | Ready for Dev |
| AC-8 | R4: Credentials | Markdown guide explaining Google Developer Token, OAuth, and YouTube API setup exists in project directory. | Direct file assertion verifying `README.md` or `CREDENTIALS_GUIDE.md` section contents. | Ready for Dev |

---
*End of Specification Document*
