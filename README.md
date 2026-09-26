# Aguamarina Joyería — Marketing & SEO Automation System

Automated marketing, local SEO optimization, digital advertising management, and video distribution platform engineered for **Aguamarina Joyería**.

## Architecture & Features

The system automates four core operational workflows:

1. **Local SEO HTML Optimizer (R1)**:
   - Command-line & programmatic parser powered by `cheerio`.
   - Scans local HTML files to inject or optimize SEO-critical tags (`<title>`, meta descriptions, viewport, heading hierarchy `<h1>`-`<h6>`, and image `alt` attributes).
   - Generates structured JSON and console audit reports while preserving valid HTML structure and Spanish UTF-8 character encoding.

2. **Google Ads & YouTube Ads Campaign Creator (R2)**:
   - Integration with `@google-ads/google-ads-api`.
   - Creates Search campaigns and Video (YouTube) ad campaigns programmatically with budget, keyword match strategies, geo/demographic targeting, and ad creatives.
   - Built-in **Dry-Run Engine** (`MockAdsEngine`) for safe local testing without spending ad budget.

3. **YouTube Auto-Upload Web Dashboard (R3)**:
   - Full-stack web application (Express backend + responsive glassmorphic HTML5 UI).
   - Drag-and-drop video upload dropzone.
   - AI-driven metadata generation (title, description, tags) using Google Gemini API (`@google/genai`).
   - Automated 1280x720 thumbnail generator using canvas image composition.
   - Resumable video and thumbnail uploads via YouTube Data API v3 with real-time SSE progress streaming.

4. **Configuration & Credentials Manager (R4)**:
   - Centralized environment configuration loader (`src/config/index.ts`) using `dotenv` and `zod`.
   - Comprehensive `.env.example` template.
   - Automatic fallback to `DRY_RUN_MODE=true` whenever live API credentials are missing or unpopulated.
   - Step-by-step credentials acquisition manual (`docs/CREDENTIALS_GUIDE.md`).

---

## Installation & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Quickstart

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to supply your Google Ads, YouTube, and Gemini API credentials. If unpopulated, the system automatically runs in **Dry-Run Mode**.

3. **Build TypeScript source**:
   ```bash
   npm run build
   ```

4. **Run Unit & Integration Tests**:
   ```bash
   npm test
   ```

5. **Start YouTube Upload Dashboard**:
   ```bash
   npm start
   # Open browser at http://localhost:3000
   ```

6. **Run SEO HTML Optimizer CLI**:
   ```bash
   npm run seo -- --dir ./public --recursive
   ```

---

## Environment Variables & Execution Modes

| Variable | Description | Default |
|---|---|---|
| `PORT` | Port for the YouTube Dashboard Web Application | `3000` |
| `HOST` | Host interface | `localhost` |
| `NODE_ENV` | Environment (`development` \| `production` \| `test`) | `development` |
| `DRY_RUN_MODE` | Prevents live API billing and ad spending | `true` |
| `GOOGLE_ADS_*` | Google Ads API credentials (Client ID, Secret, Developer Token, Refresh Token, Customer ID) | Empty |
| `YOUTUBE_*` | YouTube Data API v3 credentials (Channel ID, Client ID, Secret, Refresh Token) | Empty |
| `GEMINI_*` | Google Gemini API Key and model name (`gemini-1.5-flash`) | Empty |

Detailed instructions on how to acquire Google developer tokens, OAuth credentials, and API keys are available in [`docs/CREDENTIALS_GUIDE.md`](./docs/CREDENTIALS_GUIDE.md).

---

## License

ISC License — Aguamarina Joyería.
