import { loadConfig, configSchema } from '../../src/config/index';

describe('Configuration & Credentials Manager (src/config/index.ts)', () => {
  it('should load default configuration when environment variables are empty', () => {
    const loadedConfig = loadConfig({});
    expect(loadedConfig.PORT).toBe(3000);
    expect(loadedConfig.HOST).toBe('localhost');
    expect(loadedConfig.NODE_ENV).toBe('development');
    expect(loadedConfig.DRY_RUN_MODE).toBe(true);
    expect(loadedConfig.GEMINI_MODEL).toBe('gemini-1.5-flash');
  });

  it('should parse custom PORT, HOST, and NODE_ENV correctly', () => {
    const loadedConfig = loadConfig({
      PORT: '8080',
      HOST: '127.0.0.1',
      NODE_ENV: 'production',
    });
    expect(loadedConfig.PORT).toBe(8080);
    expect(loadedConfig.HOST).toBe('127.0.0.1');
    expect(loadedConfig.NODE_ENV).toBe('production');
  });

  it('should automatically force DRY_RUN_MODE=true when API credentials are missing even if DRY_RUN_MODE=false is requested', () => {
    const loadedConfig = loadConfig({
      DRY_RUN_MODE: 'false',
      GOOGLE_ADS_DEVELOPER_TOKEN: '',
      YOUTUBE_REFRESH_TOKEN: '',
      GEMINI_API_KEY: '',
    });
    expect(loadedConfig.DRY_RUN_MODE).toBe(true);
  });

  it('should keep DRY_RUN_MODE=false when all required live credentials are fully populated', () => {
    const loadedConfig = loadConfig({
      DRY_RUN_MODE: 'false',
      GOOGLE_ADS_CLIENT_ID: 'test-ads-client-id',
      GOOGLE_ADS_CLIENT_SECRET: 'test-ads-client-secret',
      GOOGLE_ADS_DEVELOPER_TOKEN: 'test-ads-dev-token',
      YOUTUBE_CLIENT_ID: 'test-yt-client-id',
      YOUTUBE_CLIENT_SECRET: 'test-yt-client-secret',
      YOUTUBE_REFRESH_TOKEN: 'test-yt-refresh-token',
      GEMINI_API_KEY: 'test-gemini-key',
    });
    expect(loadedConfig.DRY_RUN_MODE).toBe(false);
  });

  it('should validate string booleans for DRY_RUN_MODE correctly', () => {
    const configTrue = loadConfig({
      DRY_RUN_MODE: 'true',
    });
    expect(configTrue.DRY_RUN_MODE).toBe(true);
  });

  it('should handle invalid NODE_ENV enum values gracefully using Zod schema fallback', () => {
    const loadedConfig = loadConfig({
      NODE_ENV: 'invalid_environment' as any,
    });
    expect(loadedConfig.NODE_ENV).toBe('development');
  });
});
