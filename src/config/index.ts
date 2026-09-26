import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file if available
dotenv.config();

export const configSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('localhost'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DRY_RUN_MODE: z
    .preprocess((val) => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') {
        const lower = val.trim().toLowerCase();
        if (lower === 'true') return true;
        if (lower === 'false') return false;
      }
      return undefined;
    }, z.boolean())
    .default(true),

  // Google Ads Credentials
  GOOGLE_ADS_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_ADS_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_ADS_DEVELOPER_TOKEN: z.string().optional().default(''),
  GOOGLE_ADS_REFRESH_TOKEN: z.string().optional().default(''),
  GOOGLE_ADS_CUSTOMER_ID: z.string().optional().default(''),
  GOOGLE_ADS_MANAGER_ID: z.string().optional().default(''),

  // YouTube API Credentials
  YOUTUBE_CHANNEL_ID: z.string().optional().default(''),
  YOUTUBE_CLIENT_ID: z.string().optional().default(''),
  YOUTUBE_CLIENT_SECRET: z.string().optional().default(''),
  YOUTUBE_REFRESH_TOKEN: z.string().optional().default(''),

  // Gemini API Credentials
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(envSource: Record<string, string | undefined> = process.env): Config {
  const parsed = configSchema.safeParse(envSource);

  let parsedConfig: Config;
  if (!parsed.success) {
    console.warn('⚠️ Invalid environment configuration detected, applying default fallbacks.');
    parsedConfig = configSchema.parse({});
  } else {
    parsedConfig = { ...parsed.data };
  }

  // Check if live credentials are populated
  const hasLiveAdsCredentials = Boolean(
    parsedConfig.GOOGLE_ADS_DEVELOPER_TOKEN &&
    parsedConfig.GOOGLE_ADS_CLIENT_ID &&
    parsedConfig.GOOGLE_ADS_CLIENT_SECRET
  );
  const hasLiveYoutubeCredentials = Boolean(
    parsedConfig.YOUTUBE_REFRESH_TOKEN &&
    parsedConfig.YOUTUBE_CLIENT_ID &&
    parsedConfig.YOUTUBE_CLIENT_SECRET
  );
  const hasLiveGeminiCredentials = Boolean(parsedConfig.GEMINI_API_KEY);

  const hasAnyCredentials = hasLiveAdsCredentials || (hasLiveYoutubeCredentials && hasLiveGeminiCredentials);

  // Fallback strategy: If no service has valid credentials, force DRY_RUN_MODE=true
  if (!hasAnyCredentials) {
    parsedConfig.DRY_RUN_MODE = true;
  }

  return parsedConfig;
}

export const config: Config = loadConfig();
