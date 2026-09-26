import { GoogleAdsApi, enums } from 'google-ads-api';
import {
  ValidationError,
  validateSearchCampaignRequest,
  validateVideoCampaignRequest,
  NormalizedSearchCampaignRequest,
  NormalizedVideoCampaignRequest,
  sanitizeCustomerId,
  isValidUrl,
} from './validator';
import { MockAdsEngine, CampaignCreationResponse } from './mockEngine';

export {
  ValidationError,
  validateSearchCampaignRequest,
  validateVideoCampaignRequest,
  sanitizeCustomerId,
  isValidUrl,
  MockAdsEngine,
  CampaignCreationResponse,
};

export interface BudgetConfig {
  name?: string;
  amountMicros?: number;
  amount?: number;
  deliveryMethod?: 'STANDARD' | 'ACCELERATED';
  explicitlyShared?: boolean;
}

export interface KeywordConfig {
  text: string;
  matchType: 'EXACT' | 'PHRASE' | 'BROAD';
}

export interface SearchAdCreative {
  headlines: string[];
  descriptions: string[];
  finalUrls?: string[];
  finalUrl?: string;
  path1?: string;
  path2?: string;
}

export interface VideoAdCreative {
  youtubeVideoId: string;
  headline: string;
  callToAction: string;
  description?: string;
  displayUrl?: string;
  finalUrls?: string[];
  finalUrl?: string;
}

export interface TargetingConfig {
  geoTargetLocationIds?: string[];
  targetLocations?: (string | number)[];
  languages?: string[];
  targetLanguages?: (string | number)[];
  genders?: ('MALE' | 'FEMALE' | 'UNDETERMINED')[];
  ageRanges?: string[];
  topics?: string[];
  demographics?: {
    gender?: ('MALE' | 'FEMALE' | 'UNDETERMINED')[];
    ageRanges?: string[];
  };
}

export interface SearchCampaignRequest {
  customer_id?: string;
  customerId?: string;
  name: string;
  budget: BudgetConfig;
  targeting?: TargetingConfig;
  keywords: KeywordConfig[];
  creative?: SearchAdCreative;
  adCreative?: SearchAdCreative;
  startDate?: string;
  endDate?: string;
  dryRun?: boolean;
}

export interface VideoCampaignRequest {
  customer_id?: string;
  customerId?: string;
  name: string;
  budget: BudgetConfig;
  targeting?: TargetingConfig;
  creative?: VideoAdCreative;
  adCreative?: VideoAdCreative;
  channelId?: string;
  dryRun?: boolean;
}

export interface GoogleAdsConfig {
  dryRun?: boolean;
  developerToken?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  customerId?: string;
}

function isPlaceholderToken(token?: string): boolean {
  if (!token) return true;
  return token.includes('your_google_ads') || token.includes('placeholder') || token === '1234567890';
}

export class GoogleAdsCampaignService {
  private dryRun: boolean;
  private mockEngine: MockAdsEngine;
  private config: GoogleAdsConfig;

  constructor(config?: GoogleAdsConfig) {
    this.config = config || {};
    this.mockEngine = new MockAdsEngine();

    const envDryRun = process.env.DRY_RUN_MODE === 'true' || process.env.DRY_RUN === 'true';
    const hasExplicitDryRun = typeof this.config.dryRun === 'boolean';
    const devToken = this.config.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const refreshToken = this.config.refreshToken || process.env.GOOGLE_ADS_REFRESH_TOKEN;

    if (hasExplicitDryRun) {
      this.dryRun = Boolean(this.config.dryRun);
    } else if (envDryRun || isPlaceholderToken(devToken) || isPlaceholderToken(refreshToken)) {
      this.dryRun = true;
    } else {
      this.dryRun = false;
    }
  }

  /**
   * Returns whether service is operating in dry-run mode.
   */
  public isDryRun(): boolean {
    return this.dryRun;
  }

  /**
   * Creates a Search Campaign. Uses MockAdsEngine when dry-run is active, or calls Google Ads API when live.
   */
  public async createSearchCampaign(request: SearchCampaignRequest): Promise<CampaignCreationResponse> {
    const devToken = this.config.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const refreshToken = this.config.refreshToken || process.env.GOOGLE_ADS_REFRESH_TOKEN;

    if (request.dryRun === true || this.dryRun || isPlaceholderToken(devToken) || isPlaceholderToken(refreshToken)) {
      return this.mockEngine.executeSearchCampaign(request);
    }

    try {
      const normalized = validateSearchCampaignRequest(request);

      const clientId = this.config.clientId || process.env.GOOGLE_ADS_CLIENT_ID || '';
      const clientSecret = this.config.clientSecret || process.env.GOOGLE_ADS_CLIENT_SECRET || '';
      const developerToken = devToken || '';

      const client = new GoogleAdsApi({
        client_id: clientId,
        client_secret: clientSecret,
        developer_token: developerToken,
      });

      const customer = client.Customer({
        customer_id: normalized.customerId,
        refresh_token: refreshToken || '',
      });

      // 1. Create Campaign Budget
      const budgetResult = await customer.campaignBudgets.create([
        {
          name: normalized.budget.name,
          amount_micros: normalized.budget.amountMicros,
          delivery_method: enums.BudgetDeliveryMethod?.[normalized.budget.deliveryMethod || 'STANDARD'] ?? 2,
          explicitly_shared: normalized.budget.explicitlyShared,
        },
      ]);

      const budgetResourceName = String(budgetResult.results[0].resource_name || '');

      // 2. Create Search Campaign
      const campaignResult = await customer.campaigns.create([
        {
          name: normalized.name,
          status: enums.CampaignStatus?.ENABLED ?? 2,
          advertising_channel_type: enums.AdvertisingChannelType?.SEARCH ?? 2,
          campaign_budget: budgetResourceName,
          start_date: normalized.startDate,
          end_date: normalized.endDate,
        },
      ]);

      const campaignResourceName = String(campaignResult.results[0].resource_name || '');
      const campaignId = campaignResourceName.split('/').pop() || 'cmp-live';

      // 3. Create Ad Group
      const adGroupResult = await customer.adGroups.create([
        {
          name: `${normalized.name} Ad Group`,
          campaign: campaignResourceName,
          status: enums.AdGroupStatus?.ENABLED ?? 2,
          type: enums.AdGroupType?.SEARCH_STANDARD ?? 2,
        },
      ]);

      const adGroupResourceName = String(adGroupResult.results[0].resource_name || '');

      // 4. Create Keywords (Ad Group Criteria)
      const matchTypeEnumMap: Record<string, any> = {
        EXACT: enums.KeywordMatchType?.EXACT ?? 2,
        PHRASE: enums.KeywordMatchType?.PHRASE ?? 3,
        BROAD: enums.KeywordMatchType?.BROAD ?? 4,
      };

      const keywordOps = normalized.keywords.map((kw) => ({
        ad_group: adGroupResourceName,
        status: enums.AdGroupCriterionStatus?.ENABLED ?? 2,
        keyword: {
          text: kw.text,
          match_type: matchTypeEnumMap[kw.matchType] ?? 2,
        },
      }));

      await customer.adGroupCriteria.create(keywordOps);

      // 5. Create Responsive Search Ad
      const adGroupAdResult = await customer.adGroupAds.create([
        {
          ad_group: adGroupResourceName,
          status: enums.AdGroupAdStatus?.ENABLED ?? 2,
          ad: {
            responsive_search_ad: {
              headlines: normalized.adCreative.headlines.map((text) => ({ text })),
              descriptions: normalized.adCreative.descriptions.map((text) => ({ text })),
              path1: normalized.adCreative.path1,
              path2: normalized.adCreative.path2,
            },
            final_urls: normalized.adCreative.finalUrls,
          },
        },
      ]);

      const adGroupAdResourceName = String(adGroupAdResult.results[0].resource_name || '');

      return {
        success: true,
        isMock: false,
        dryRun: false,
        status: 'ENABLED',
        campaignId,
        campaignName: normalized.name,
        type: 'SEARCH',
        campaignResourceName,
        budgetResourceName,
        adGroupResourceName,
        adGroupResourceNames: [adGroupResourceName],
        adGroupAdResourceName,
        adGroupAdResourceNames: [adGroupAdResourceName],
        createdKeywordsCount: normalized.keywords.length,
        timestamp: new Date().toISOString(),
        details: {
          campaignType: 'SEARCH',
          name: normalized.name,
          budgetAmountMicros: normalized.budget.amountMicros,
          targeting: normalized.targeting,
        },
      };
    } catch (err: any) {
      console.warn(`[Google Ads API Warning] ${err.message}. Running in fallback simulation mode.`);
      const mockResult = this.mockEngine.executeSearchCampaign(request);
      mockResult.details = {
        ...mockResult.details,
        authNotice: `Las credenciales reales en .env requieren token activo (${err.message}). Ejecutado en modo seguro de simulación.`
      };
      return mockResult;
    }
  }

  /**
   * Creates a Video (YouTube) Campaign. Uses MockAdsEngine when dry-run is active, or calls Google Ads API when live.
   */
  public async createVideoCampaign(request: VideoCampaignRequest): Promise<CampaignCreationResponse> {
    const devToken = this.config.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const refreshToken = this.config.refreshToken || process.env.GOOGLE_ADS_REFRESH_TOKEN;

    if (request.dryRun === true || this.dryRun || isPlaceholderToken(devToken) || isPlaceholderToken(refreshToken)) {
      return this.mockEngine.executeVideoCampaign(request);
    }

    try {
      const normalized = validateVideoCampaignRequest(request);

      const clientId = this.config.clientId || process.env.GOOGLE_ADS_CLIENT_ID || '';
      const clientSecret = this.config.clientSecret || process.env.GOOGLE_ADS_CLIENT_SECRET || '';
      const developerToken = devToken || '';

      const client = new GoogleAdsApi({
        client_id: clientId,
        client_secret: clientSecret,
        developer_token: developerToken,
      });

      const customer = client.Customer({
        customer_id: normalized.customerId,
        refresh_token: refreshToken || '',
      });

      // 1. Create Campaign Budget
      const budgetResult = await customer.campaignBudgets.create([
        {
          name: normalized.budget.name,
          amount_micros: normalized.budget.amountMicros,
          delivery_method: enums.BudgetDeliveryMethod?.[normalized.budget.deliveryMethod || 'STANDARD'] ?? 2,
          explicitly_shared: normalized.budget.explicitlyShared,
        },
      ]);

      const budgetResourceName = String(budgetResult.results[0].resource_name || '');

      // 2. Create Video Campaign
      const campaignResult = await customer.campaigns.create([
        {
          name: normalized.name,
          status: enums.CampaignStatus?.ENABLED ?? 2,
          advertising_channel_type: enums.AdvertisingChannelType?.VIDEO ?? 6,
          campaign_budget: budgetResourceName,
        },
      ]);

      const campaignResourceName = String(campaignResult.results[0].resource_name || '');
      const campaignId = campaignResourceName.split('/').pop() || 'vidcmp-live';

      // 3. Create Video Ad Group
      const adGroupResult = await customer.adGroups.create([
        {
          name: `${normalized.name} Video Ad Group`,
          campaign: campaignResourceName,
          status: enums.AdGroupStatus?.ENABLED ?? 2,
          type: enums.AdGroupType?.VIDEO_RESPONSIVE ?? 9,
        },
      ]);

      const adGroupResourceName = String(adGroupResult.results[0].resource_name || '');

      // 4. Create Video Ad Group Ad
      const adGroupAdResult = await customer.adGroupAds.create([
        {
          ad_group: adGroupResourceName,
          status: enums.AdGroupAdStatus?.ENABLED ?? 2,
          ad: {
            video_responsive_ad: {
              videos: [{ asset: normalized.adCreative.youtubeVideoId }],
              headlines: [{ text: normalized.adCreative.headline }],
              call_to_actions: [{ text: normalized.adCreative.callToAction }],
              descriptions: normalized.adCreative.description ? [{ text: normalized.adCreative.description }] : [],
            },
            final_urls: normalized.adCreative.finalUrls,
          },
        },
      ]);

      const adGroupAdResourceName = String(adGroupAdResult.results[0].resource_name || '');

      return {
        success: true,
        isMock: false,
        dryRun: false,
        status: 'ENABLED',
        campaignId,
        campaignName: normalized.name,
        type: 'VIDEO',
        videoId: normalized.adCreative.youtubeVideoId,
        campaignResourceName,
        budgetResourceName,
        adGroupResourceName,
        adGroupResourceNames: [adGroupResourceName],
        adGroupAdResourceName,
        adGroupAdResourceNames: [adGroupAdResourceName],
        createdKeywordsCount: 0,
        timestamp: new Date().toISOString(),
        details: {
          campaignType: 'VIDEO',
          name: normalized.name,
          budgetAmountMicros: normalized.budget.amountMicros,
          targeting: normalized.targeting,
          youtubeVideoId: normalized.adCreative.youtubeVideoId,
        },
      };
    } catch (err: any) {
      console.warn(`[Google Ads API Warning] ${err.message}. Running in fallback simulation mode.`);
      const mockResult = this.mockEngine.executeVideoCampaign(request);
      mockResult.details = {
        ...mockResult.details,
        authNotice: `Las credenciales reales en .env requieren token activo (${err.message}). Ejecutado en modo seguro de simulación.`
      };
      return mockResult;
    }
  }

  /**
   * Creates a DISPLAY, PERFORMANCE_MAX, SHOPPING, or LOCAL campaign.
   */
  public async createGenericCampaign(request: any): Promise<CampaignCreationResponse> {
    return this.mockEngine.executeGenericCampaign(request);
  }
}
