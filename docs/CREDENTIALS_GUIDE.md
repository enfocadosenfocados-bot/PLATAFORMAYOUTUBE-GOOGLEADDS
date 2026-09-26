# Google API Credentials & Setup Guide

This guide provides step-by-step instructions for obtaining and configuring all API keys, OAuth 2.0 client credentials, developer tokens, and access tokens required for the **Aguamarina Joyería Marketing & SEO Automation System**.

---

## Table of Contents
1. [Google Cloud Console Project Setup](#1-google-cloud-console-project-setup)
2. [Google Ads API Credentials & Developer Token](#2-google-ads-api-credentials--developer-token)
3. [YouTube Data API v3 Access & OAuth Refresh Token](#3-youtube-data-api-v3-access--oauth-refresh-token)
4. [Google Gemini API Key Acquisition](#4-google-gemini-api-key-acquisition)
5. [Environment File (.env) Configuration](#5-environment-file-env-configuration)

---

## 1. Google Cloud Console Project Setup

All Google services (Google Ads API, YouTube Data API, and Gemini API) require a Google Cloud Console project.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Log in with your Google account.
3. Click on the project dropdown at the top of the page and select **New Project**.
4. Set the **Project Name** to `Aguamarina Marketing Automation` and click **Create**.
5. Ensure your new project is selected in the project dropdown.

### Configure OAuth Consent Screen
1. In the left navigation menu, go to **APIs & Services > OAuth consent screen**.
2. Select **User Type**:
   - **Internal** (if using Google Workspace for Aguamarina Joyería).
   - **External** (if using a standard @gmail.com account; add your account under **Test Users**).
3. Fill in required details:
   - **App Name**: `Aguamarina Marketing Automation`
   - **User Support Email**: Your email address
   - **Developer Contact Information**: Your email address
4. Click **Save and Continue**.

### Create OAuth 2.0 Client Credentials
1. Go to **APIs & Services > Credentials**.
2. Click **+ CREATE CREDENTIALS** at the top and select **OAuth client ID**.
3. Choose **Application type**: **Web application**.
4. Set **Name**: `Aguamarina OAuth Client`.
5. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/oauth2callback`
   - `https://developers.google.com/oauthplayground` (useful for initial refresh token generation)
6. Click **CREATE**.
7. Copy the generated **Client ID** and **Client Secret**. Save them to your `.env` file:
   - `GOOGLE_ADS_CLIENT_ID` / `YOUTUBE_CLIENT_ID`
   - `GOOGLE_ADS_CLIENT_SECRET` / `YOUTUBE_CLIENT_SECRET`

---

## 2. Google Ads API Credentials & Developer Token

To automate Google Ads Search and Video campaign creation via `@google-ads/google-ads-api`, you need a Developer Token and Customer Account ID.

### Step 2.1: Enable the Google Ads API
1. In Google Cloud Console, go to **APIs & Services > Library**.
2. Search for **Google Ads API**.
3. Click on **Google Ads API** and click **ENABLE**.

### Step 2.2: Obtain a Developer Token
1. Log into your [Google Ads Manager Account](https://ads.google.com/).
2. In the top navigation menu, click **Tools & Settings** (wrench icon) > **Setup** > **API Center**.
3. Fill out the application form for a **Developer Token**.
4. For development and testing, a **Test Account Developer Token** (Basic Access / Test Access) is granted immediately.
5. Copy the **Developer Token** into your `.env` file:
   ```env
   GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token_here
   ```

### Step 2.3: Get your Google Ads Customer ID
1. Log into your Google Ads account (or Test Account).
2. Look at the top right corner of the page for your 10-digit Customer ID (formatted like `123-456-7890`).
3. Remove the dashes when adding to `.env`:
   ```env
   GOOGLE_ADS_CUSTOMER_ID=1234567890
   ```

---

## 3. YouTube Data API v3 Access & OAuth Refresh Token

The YouTube Auto-Upload Web Dashboard uses YouTube Data API v3 to upload videos and set video thumbnails.

### Step 3.1: Enable YouTube Data API v3
1. In Google Cloud Console, go to **APIs & Services > Library**.
2. Search for **YouTube Data API v3**.
3. Click **ENABLE**.

### Step 3.2: Get YouTube Channel ID
1. Open YouTube while logged into the Aguamarina Joyería account.
2. Go to **Settings > Advanced settings** (or click your channel profile icon > **Your Channel**).
3. Copy the **Channel ID** (starts with `UC...`) into your `.env` file:
   ```env
   YOUTUBE_CHANNEL_ID=UCxxxxxx_your_channel_id
   ```

### Step 3.3: Generate OAuth 2.0 Refresh Token for YouTube
To upload videos programmatically without manual logins on every request, generate a persistent **Refresh Token**:

1. Open [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
2. Click the gear icon (⚙️) in the upper right corner:
   - Check **Use your own OAuth credentials**.
   - Input your **OAuth Client ID** and **OAuth Client Secret**.
3. Under **Step 1: Select & authorize APIs**, enter the scope:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube.readonly`
4. Click **Authorize APIs** and authorize with the Aguamarina YouTube Google account.
5. Under **Step 2: Exchange authorization code for tokens**, click **Exchange authorization code for tokens**.
6. Copy the resulting **Refresh Token** into your `.env` file:
   ```env
   YOUTUBE_REFRESH_TOKEN=1//your_youtube_refresh_token
   ```

---

## 4. Google Gemini API Key Acquisition

The YouTube Auto-Upload Dashboard leverages Google's Gemini API (`@google/genai`) to generate high-converting SEO titles, descriptions, and hashtags.

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Log in with your Google account.
3. Click **Get API Key** in the side navigation.
4. Click **Create API key in new project** (or select your existing Google Cloud project).
5. Copy the generated API key (starts with `AIzaSy...`).
6. Add it to your `.env` file:
   ```env
   GEMINI_API_KEY=AIzaSy_your_gemini_api_key
   GEMINI_MODEL=gemini-1.5-flash
   ```

---

## 5. Environment File (.env) Configuration

Copy `.env.example` to `.env` in the root of your project directory:

```bash
cp .env.example .env
```

Populate the values as obtained above:

```env
PORT=3000
HOST=localhost
NODE_ENV=development
DRY_RUN_MODE=false

GOOGLE_ADS_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_ADS_DEVELOPER_TOKEN=xxxx_developer_token
GOOGLE_ADS_REFRESH_TOKEN=1//xxxx_refresh_token
GOOGLE_ADS_CUSTOMER_ID=1234567890

YOUTUBE_CHANNEL_ID=UCxxxxxx
YOUTUBE_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=GOCSPX-xxxx
YOUTUBE_REFRESH_TOKEN=1//xxxx_refresh_token

GEMINI_API_KEY=AIzaSyxxxx
GEMINI_MODEL=gemini-1.5-flash
```

> **Note on Dry-Run Mode**: If any required credentials (`GOOGLE_ADS_DEVELOPER_TOKEN`, `YOUTUBE_REFRESH_TOKEN`, or `GEMINI_API_KEY`) are missing or unpopulated, the system will automatically operate in `DRY_RUN_MODE=true`. This allows full testing and development without live API billing or network uploads.
