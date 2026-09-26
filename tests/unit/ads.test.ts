import {
  GoogleAdsCampaignService,
  MockAdsEngine,
  validateSearchCampaignRequest,
  validateVideoCampaignRequest,
  ValidationError,
  sanitizeCustomerId,
  isValidUrl,
  SearchCampaignRequest,
  VideoCampaignRequest,
} from '../../src/ads';

// Mock the google-ads-api module for live mode assertions
const mockCampaignBudgetsCreate = jest.fn();
const mockCampaignsCreate = jest.fn();
const mockAdGroupsCreate = jest.fn();
const mockAdGroupCriteriaCreate = jest.fn();
const mockAdGroupAdsCreate = jest.fn();

jest.mock('google-ads-api', () => {
  return {
    GoogleAdsApi: jest.fn().mockImplementation((config) => {
      return {
        Customer: jest.fn().mockImplementation((custConfig) => {
          return {
            campaignBudgets: { create: mockCampaignBudgetsCreate },
            campaigns: { create: mockCampaignsCreate },
            adGroups: { create: mockAdGroupsCreate },
            adGroupCriteria: { create: mockAdGroupCriteriaCreate },
            adGroupAds: { create: mockAdGroupAdsCreate },
          };
        }),
      };
    }),
    enums: {
      BudgetDeliveryMethod: { STANDARD: 2, ACCELERATED: 3 },
      CampaignStatus: { ENABLED: 2 },
      AdvertisingChannelType: { SEARCH: 2, VIDEO: 6 },
      AdGroupStatus: { ENABLED: 2 },
      AdGroupType: { SEARCH_STANDARD: 2, VIDEO_RESPONSIVE: 9 },
      AdGroupCriterionStatus: { ENABLED: 2 },
      KeywordMatchType: { EXACT: 2, PHRASE: 3, BROAD: 4 },
      AdGroupAdStatus: { ENABLED: 2 },
    },
  };
});

describe('Google Ads & YouTube Ads Campaign Creator (R2)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.DRY_RUN_MODE;
    delete process.env.DRY_RUN;
    delete process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

    // Default mock API implementations
    mockCampaignBudgetsCreate.mockResolvedValue({
      results: [{ resource_name: 'customers/1234567890/campaignBudgets/live-bgt-100' }],
    });
    mockCampaignsCreate.mockResolvedValue({
      results: [{ resource_name: 'customers/1234567890/campaigns/live-cmp-200' }],
    });
    mockAdGroupsCreate.mockResolvedValue({
      results: [{ resource_name: 'customers/1234567890/adGroups/live-ag-300' }],
    });
    mockAdGroupCriteriaCreate.mockResolvedValue({
      results: [{ resource_name: 'customers/1234567890/adGroupCriteria/live-agc-400' }],
    });
    mockAdGroupAdsCreate.mockResolvedValue({
      results: [{ resource_name: 'customers/1234567890/adGroupAds/live-aga-500' }],
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('1. Sanitizer & Validator Unit Tests', () => {
    test('sanitizeCustomerId strips dashes and whitespace', () => {
      expect(sanitizeCustomerId('123-456-7890')).toBe('1234567890');
      expect(sanitizeCustomerId(' 987 654 3210 ')).toBe('9876543210');
      expect(sanitizeCustomerId(1234567890)).toBe('1234567890');
    });

    test('isValidUrl validates HTTP and HTTPS URLs', () => {
      expect(isValidUrl('https://aguamarinajoyeria.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('ftp://invalid-url.com')).toBe(false);
      expect(isValidUrl('not-a-url')).toBe(false);
    });

    test('validateSearchCampaignRequest normalizes valid input and converts amount to micros', () => {
      const input = {
        customer_id: '123-456-7890',
        name: 'Campaña Anillos de Oro',
        budget: { amount: 50 }, // $50 -> 50,000,000 micros
        keywords: [
          { text: 'anillo oro 18k', matchType: 'exact' },
          { text: 'anillo compromiso', matchType: 'phrase' },
        ],
        adCreative: {
          headlines: ['Anillos de Oro 18K', 'Aguamarina Joyería', 'Envíos a Todo México'],
          descriptions: ['Descubre nuestra colección exclusiva de anillos.', 'Diseños únicos en oro y diamantes.'],
          finalUrl: 'https://aguamarinajoyeria.com/anillos',
        },
      };

      const normalized = validateSearchCampaignRequest(input);
      expect(normalized.customerId).toBe('1234567890');
      expect(normalized.name).toBe('Campaña Anillos de Oro');
      expect(normalized.budget.amountMicros).toBe(50_000_000);
      expect(normalized.keywords[0].matchType).toBe('EXACT');
      expect(normalized.adCreative.finalUrls).toEqual(['https://aguamarinajoyeria.com/anillos']);
    });

    test('validateSearchCampaignRequest throws ValidationError for missing/invalid fields', () => {
      expect(() => validateSearchCampaignRequest({})).toThrow(ValidationError);

      const invalidHeadlines = {
        customer_id: '1234567890',
        name: 'Test Campaign',
        budget: { amountMicros: 1000000 },
        keywords: [{ text: 'joyas', matchType: 'BROAD' }],
        creative: {
          headlines: ['Headline 1', 'Headline 2'], // Only 2 headlines (min 3 required)
          descriptions: ['Desc 1', 'Desc 2'],
          finalUrl: 'https://example.com',
        },
      };

      expect(() => validateSearchCampaignRequest(invalidHeadlines)).toThrow(ValidationError);
      try {
        validateSearchCampaignRequest(invalidHeadlines);
      } catch (err: any) {
        expect(err.errors).toContain('Ad creative headlines must contain between 3 and 15 items (received: 2)');
      }
    });

    test('validateSearchCampaignRequest rejects headlines exceeding 30 characters', () => {
      const longHeadline = {
        customer_id: '1234567890',
        name: 'Test Campaign',
        budget: { amountMicros: 1000000 },
        keywords: [{ text: 'joyas', matchType: 'BROAD' }],
        creative: {
          headlines: [
            'Headline 1',
            'Headline 2',
            'Esta es una cabecera extremadamente larga que excede los 30 caracteres',
          ],
          descriptions: ['Desc 1', 'Desc 2'],
          finalUrl: 'https://example.com',
        },
      };

      expect(() => validateSearchCampaignRequest(longHeadline)).toThrow(ValidationError);
    });

    test('validateVideoCampaignRequest normalizes valid video campaign payload', () => {
      const input = {
        customerId: '9876543210',
        name: 'Video Branding 2026',
        budget: { amountMicros: 100_000_000 },
        creative: {
          youtubeVideoId: 'dQw4w9WgXcQ',
          headline: 'Joyería Fina',
          callToAction: 'Ver Más',
          description: 'Conoce los nuevos diseños de alta joyería.',
          finalUrls: ['https://aguamarinajoyeria.com/video'],
        },
      };

      const normalized = validateVideoCampaignRequest(input);
      expect(normalized.customerId).toBe('9876543210');
      expect(normalized.adCreative.youtubeVideoId).toBe('dQw4w9WgXcQ');
      expect(normalized.adCreative.headline).toBe('Joyería Fina');
      expect(normalized.adCreative.callToAction).toBe('Ver Más');
    });

    test('validateVideoCampaignRequest validates headline and callToAction length limits', () => {
      const invalid = {
        customerId: '1234567890',
        name: 'Video Campaign',
        budget: { amountMicros: 50000000 },
        creative: {
          youtubeVideoId: 'dQw4w9WgXcQ',
          headline: 'Cabecera de mas de quince caracteres', // > 15 chars
          callToAction: 'Un CTA Demasiado Largo', // > 10 chars
          finalUrl: 'https://example.com',
        },
      };

      expect(() => validateVideoCampaignRequest(invalid)).toThrow(ValidationError);
    });
  });

  describe('2. Dry-Run Engine & Mock Execution', () => {
    test('MockAdsEngine generates structured Search campaign mock response', () => {
      const mockEngine = new MockAdsEngine();
      const request: SearchCampaignRequest = {
        customer_id: '1234567890',
        name: 'DryRun Search Campaign',
        budget: { amountMicros: 25_000_000 },
        keywords: [
          { text: 'anillos de compromiso', matchType: 'EXACT' },
          { text: 'joyería guadalajara', matchType: 'PHRASE' },
        ],
        creative: {
          headlines: ['Anillos de Compromiso', 'Aguamarina Joyería', 'Oro 18K Certificado'],
          descriptions: ['Joyería fina en Guadalajara.', 'Visita nuestra tienda online.'],
          finalUrl: 'https://aguamarinajoyeria.com',
        },
      };

      const result = mockEngine.executeSearchCampaign(request);
      expect(result.success).toBe(true);
      expect(result.isMock).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.campaignResourceName).toMatch(/^customers\/1234567890\/campaigns\/mock-search-cmp-dryrun-search/);
      expect(result.budgetResourceName).toMatch(/^customers\/1234567890\/campaignBudgets\/bgt-dryrun-search/);
      expect(result.adGroupResourceName).toMatch(/^customers\/1234567890\/adGroups\/ag-dryrun-search/);
      expect(result.adGroupAdResourceName).toMatch(/^customers\/1234567890\/adGroupAds\/aga-dryrun-search/);
      expect(result.createdKeywordsCount).toBe(2);
    });

    test('MockAdsEngine generates structured Video campaign mock response', () => {
      const mockEngine = new MockAdsEngine();
      const request: VideoCampaignRequest = {
        customer_id: '5556667777',
        name: 'DryRun Video Campaign',
        budget: { amountMicros: 80_000_000 },
        creative: {
          youtubeVideoId: 'abc123xyz89',
          headline: 'Oro 18K',
          callToAction: 'Comprar',
          description: 'Hermosa colección de joyas',
          finalUrl: 'https://aguamarinajoyeria.com/video',
        },
      };

      const result = mockEngine.executeVideoCampaign(request);
      expect(result.success).toBe(true);
      expect(result.isMock).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.campaignResourceName).toMatch(/^customers\/5556667777\/campaigns\/vidcmp-.*dryrun/);
      expect(result.budgetResourceName).toMatch(/^customers\/5556667777\/campaignBudgets\/vidbgt-dryrun-video/);
      expect(result.details?.youtubeVideoId).toBe('abc123xyz89');
    });

    test('GoogleAdsCampaignService defaults to dry-run when credentials are missing', async () => {
      const service = new GoogleAdsCampaignService();
      expect(service.isDryRun()).toBe(true);

      const request: SearchCampaignRequest = {
        customer_id: '1234567890',
        name: 'Auto DryRun Search',
        budget: { amountMicros: 10_000_000 },
        keywords: [{ text: 'joyeria', matchType: 'BROAD' }],
        creative: {
          headlines: ['Joyería Fina', 'Aguamarina', 'Descuentos Especiales'],
          descriptions: ['Joyas exclusivas online.', 'Envíos a todo el país.'],
          finalUrl: 'https://aguamarinajoyeria.com',
        },
      };

      const result = await service.createSearchCampaign(request);
      expect(result.isMock).toBe(true);
      expect(result.dryRun).toBe(true);
    });
  });

  describe('3. Live Execution with Mocked Google Ads API Client', () => {
    test('createSearchCampaign executes full Google Ads API mutation pipeline', async () => {
      const service = new GoogleAdsCampaignService({
        dryRun: false,
        developerToken: 'dev-token-xyz',
        clientId: 'client-id-abc',
        clientSecret: 'client-secret-123',
        refreshToken: 'refresh-token-456',
      });

      expect(service.isDryRun()).toBe(false);

      const request: SearchCampaignRequest = {
        customer_id: '1234567890',
        name: 'Live Search Campaign',
        budget: { amountMicros: 50_000_000 },
        keywords: [
          { text: 'anillos de boda', matchType: 'EXACT' },
          { text: 'joyas de lujo', matchType: 'PHRASE' },
        ],
        creative: {
          headlines: ['Anillos de Boda 18K', 'Aguamarina Joyería', 'Compras Seguras'],
          descriptions: ['Gran variedad de diseños en oro.', 'Cotiza tu anillo ideal hoy.'],
          finalUrl: 'https://aguamarinajoyeria.com/boda',
          path1: 'boda',
          path2: 'anillos',
        },
      };

      const response = await service.createSearchCampaign(request);

      expect(response.success).toBe(true);
      expect(response.isMock).toBe(false);
      expect(response.dryRun).toBe(false);
      expect(response.budgetResourceName).toBe('customers/1234567890/campaignBudgets/live-bgt-100');
      expect(response.campaignResourceName).toBe('customers/1234567890/campaigns/live-cmp-200');
      expect(response.adGroupResourceName).toBe('customers/1234567890/adGroups/live-ag-300');
      expect(response.adGroupAdResourceName).toBe('customers/1234567890/adGroupAds/live-aga-500');

      // Verify Google Ads API calls and payloads
      expect(mockCampaignBudgetsCreate).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'Live Search Campaign Budget',
          amount_micros: 50_000_000,
        }),
      ]);

      expect(mockCampaignsCreate).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'Live Search Campaign',
          advertising_channel_type: 2, // SEARCH
          campaign_budget: 'customers/1234567890/campaignBudgets/live-bgt-100',
        }),
      ]);

      expect(mockAdGroupsCreate).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'Live Search Campaign Ad Group',
          campaign: 'customers/1234567890/campaigns/live-cmp-200',
        }),
      ]);

      expect(mockAdGroupCriteriaCreate).toHaveBeenCalledWith([
        expect.objectContaining({
          ad_group: 'customers/1234567890/adGroups/live-ag-300',
          keyword: { text: 'anillos de boda', match_type: 2 }, // EXACT
        }),
        expect.objectContaining({
          ad_group: 'customers/1234567890/adGroups/live-ag-300',
          keyword: { text: 'joyas de lujo', match_type: 3 }, // PHRASE
        }),
      ]);

      expect(mockAdGroupAdsCreate).toHaveBeenCalledWith([
        expect.objectContaining({
          ad_group: 'customers/1234567890/adGroups/live-ag-300',
          ad: expect.objectContaining({
            responsive_search_ad: expect.objectContaining({
              headlines: [
                { text: 'Anillos de Boda 18K' },
                { text: 'Aguamarina Joyería' },
                { text: 'Compras Seguras' },
              ],
              path1: 'boda',
              path2: 'anillos',
            }),
            final_urls: ['https://aguamarinajoyeria.com/boda'],
          }),
        }),
      ]);
    });

    test('createVideoCampaign executes Google Ads Video API payload pipeline', async () => {
      const service = new GoogleAdsCampaignService({
        dryRun: false,
        developerToken: 'dev-token-xyz',
      });

      const request: VideoCampaignRequest = {
        customer_id: '9998887777',
        name: 'Live Video Campaign',
        budget: { amountMicros: 75_000_000 },
        creative: {
          youtubeVideoId: 'video12345',
          headline: 'Descuento 20%',
          callToAction: 'Comprar',
          description: 'Aprovecha nuestra venta especial de aniversario.',
          finalUrl: 'https://aguamarinajoyeria.com/ofertas',
        },
      };

      const response = await service.createVideoCampaign(request);

      expect(response.success).toBe(true);
      expect(response.isMock).toBe(false);
      expect(response.dryRun).toBe(false);

      expect(mockCampaignsCreate).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'Live Video Campaign',
          advertising_channel_type: 6, // VIDEO
        }),
      ]);

      expect(mockAdGroupAdsCreate).toHaveBeenCalledWith([
        expect.objectContaining({
          ad: expect.objectContaining({
            video_responsive_ad: expect.objectContaining({
              videos: [{ asset: 'video12345' }],
              headlines: [{ text: 'Descuento 20%' }],
              call_to_actions: [{ text: 'Comprar' }],
            }),
            final_urls: ['https://aguamarinajoyeria.com/ofertas'],
          }),
        }),
      ]);
    });
  });
});
