# Original User Request

## Initial Request — 2026-08-08T17:27:51-06:00

An automated marketing and SEO system for Aguamarina Joyería to optimize local HTML files for SEO, manage Google/YouTube Ads campaigns via API, and upload videos to YouTube with AI-generated metadata and thumbnails.

Working directory: C:\Users\QS\.gemini\antigravity\scratch\aguamarina_marketing_automation
Integrity mode: development

## Requirements

### R1. Local SEO HTML Optimizer
- Implement a script/tool that scans a local directory containing HTML files.
- Automatically parse the HTML files to inject or optimize SEO-critical tags: `<title>`, meta descriptions, meta viewport, header hierarchies (`<h1>` - `<h6>`), and `<img>` alt attributes based on context.
- Keep original HTML code structure intact and output a report of the modifications made.

### R2. Google Ads & YouTube Ads Campaign Creator
- Implement an integration module with the Google Ads API using Google's official client library.
- Allow creating Search campaigns and Video (YouTube) ad campaigns programmatically.
- Provide functions to specify budget, targeting, keywords, and ad creatives.
- Must run in a dry-run/mock mode when live credentials are not active to prevent real ad spending during tests.

### R3. YouTube Auto-Upload Web Dashboard
- Create a web application (Express backend, clean HTML/JS frontend) to manage YouTube video uploads.
- The UI must allow selecting/dragging a video file, entering basic context, and triggering the upload.
- The backend must generate a optimized title, description, and tags for the video using the Gemini API.
- The system must generate a professional thumbnail image (using an image generation service or custom drawing canvas/assets) and upload it with the video using the YouTube Data API.
- Display a progress/status log of the upload in the UI.

### R4. Configuration & Credentials Manager
- Centralize all configurations, API endpoints, and credentials in a `.env` file.
- Provide a clear `.env.example` file specifying: Google OAuth Client ID/Secret, Developer Token, Refresh Token, YouTube Channel ID, Gemini API key, and host configurations.
- Include a README file with setup instructions, including step-by-step guides on how to obtain these Google API credentials.

## Acceptance Criteria

### SEO Optimizer
- [ ] Running the optimizer on a directory containing unoptimized HTML files succeeds and adds correct meta tags and `alt` attributes.
- [ ] Modified HTML files remain valid HTML and load correctly in a browser.

### Google Ads Integration
- [ ] Unit or integration tests mock the Google Ads API client and verify that the request payload sent to the API matches the schema for Search and Video campaign creation.

### YouTube Dashboard & Uploads
- [ ] The dashboard serves a functional, visually modern interface on localhost.
- [ ] Uploading a video file triggers LLM generation of professional metadata (verified via unit test or console log).
- [ ] A mock upload flow can be triggered, simulating the video and thumbnail upload, and displays completion status in the frontend UI.

### Setup and Credentials
- [ ] A `.env.example` exists with all necessary variables.
- [ ] A markdown guide explaining how to retrieve Google Developer Tokens, OAuth credentials, and YouTube API access is included in the project directory.
