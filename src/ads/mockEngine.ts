import {
  validateSearchCampaignRequest,
  validateVideoCampaignRequest,
  NormalizedSearchCampaignRequest,
  NormalizedVideoCampaignRequest,
} from './validator';

export interface CampaignCreationResponse {
  success: boolean;
  isMock: boolean;
  dryRun: boolean;
  status: string;
  campaignId: string;
  campaignName?: string;
  type?: string;
  videoId?: string;
  campaignResourceName: string;
  budgetResourceName: string;
  adGroupResourceName: string;
  adGroupResourceNames: string[];
  adGroupAdResourceName: string;
  adGroupAdResourceNames: string[];
  createdKeywordsCount?: number;
  startDate?: string;
  endDate?: string;
  details?: Record<string, any>;
  timestamp: string;
}

export class MockAdsEngine {
  /**
   * Generates a deterministic or timestamped ID slug.
   */
  private generateMockId(prefix: string, name: string): string {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, '-').replace(/-+/g, '-').slice(0, 20);
    const ts = Date.now();
    return `${prefix}-${cleanName}-${ts}`;
  }

  /**
   * Simulates Search campaign creation in dry-run mode.
   */
  public executeSearchCampaign(rawRequest: any): CampaignCreationResponse {
    const normalized: NormalizedSearchCampaignRequest = validateSearchCampaignRequest(rawRequest);
    const { customerId, name, budget, targeting, keywords, adCreative, startDate, endDate } = normalized;

    const cmpId = this.generateMockId('mock-search-cmp', name);
    const bgtId = this.generateMockId('bgt', name);
    const agId = this.generateMockId('ag', name);
    const agaId = this.generateMockId('aga', name);

    const campaignResourceName = `customers/${customerId}/campaigns/${cmpId}`;
    const budgetResourceName = `customers/${customerId}/campaignBudgets/${bgtId}`;
    const adGroupResourceName = `customers/${customerId}/adGroups/${agId}`;
    const adGroupAdResourceName = `customers/${customerId}/adGroupAds/${agaId}`;

    return {
      success: true,
      isMock: true,
      dryRun: true,
      status: 'PAUSED_DRY_RUN',
      campaignId: cmpId,
      campaignName: name,
      type: 'SEARCH',
      startDate,
      endDate,
      campaignResourceName,
      budgetResourceName,
      adGroupResourceName,
      adGroupResourceNames: [adGroupResourceName],
      adGroupAdResourceName,
      adGroupAdResourceNames: [adGroupAdResourceName],
      createdKeywordsCount: keywords.length,
      timestamp: new Date().toISOString(),
      details: {
        campaignType: 'SEARCH',
        name,
        budgetAmountMicros: budget.amountMicros,
        targeting,
        startDate,
        endDate,
        keywordsCount: keywords.length,
        headlinesCount: adCreative.headlines.length,
        descriptionsCount: adCreative.descriptions.length,
        finalUrls: adCreative.finalUrls,
      },
    };
  }

  /**
   * Simulates Video campaign creation in dry-run mode.
   */
  public executeVideoCampaign(rawRequest: any): CampaignCreationResponse {
    const normalized: NormalizedVideoCampaignRequest = validateVideoCampaignRequest(rawRequest);
    const { customerId, name, budget, targeting, adCreative } = normalized;

    const videoSlug = adCreative.youtubeVideoId ? `${adCreative.youtubeVideoId}-${name}` : name;
    const cmpId = this.generateMockId('vidcmp', videoSlug);
    const bgtId = this.generateMockId('vidbgt', name);
    const agId = this.generateMockId('vidag', name);
    const agaId = this.generateMockId('vidaga', name);

    const campaignResourceName = `customers/${customerId}/campaigns/${cmpId}`;
    const budgetResourceName = `customers/${customerId}/campaignBudgets/${bgtId}`;
    const adGroupResourceName = `customers/${customerId}/adGroups/${agId}`;
    const adGroupAdResourceName = `customers/${customerId}/adGroupAds/${agaId}`;

    return {
      success: true,
      isMock: true,
      dryRun: true,
      status: 'PAUSED_DRY_RUN',
      campaignId: cmpId,
      campaignName: name,
      type: 'VIDEO',
      videoId: adCreative.youtubeVideoId,
      startDate: (rawRequest as any).startDate,
      endDate: (rawRequest as any).endDate,
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
        name,
        budgetAmountMicros: budget.amountMicros,
        targeting,
        startDate: (rawRequest as any).startDate,
        endDate: (rawRequest as any).endDate,
        youtubeVideoId: adCreative.youtubeVideoId,
        headline: adCreative.headline,
        callToAction: adCreative.callToAction,
        finalUrls: adCreative.finalUrls,
      },
    };
  }

  /**
   * Simulates creation of DISPLAY, PERFORMANCE_MAX, SHOPPING, and LOCAL campaign types.
   */
  public executeGenericCampaign(rawRequest: any): CampaignCreationResponse {
    const type = rawRequest.campaignType || 'SEARCH';
    const name = rawRequest.campaignName || rawRequest.name || 'Campaña Aguamarina';
    const customerId = rawRequest.customerId || '1000741529450';
    const budgetAmount = rawRequest.budgetAmount || rawRequest.budget?.amount || 10;
    const startDate = rawRequest.startDate || undefined;
    const endDate = rawRequest.endDate || undefined;

    const prefix = `mock-${type.toLowerCase()}-cmp`;
    const cmpId = this.generateMockId(prefix, name);
    const bgtId = this.generateMockId('bgt', name);
    const agId = this.generateMockId('ag', name);
    const agaId = this.generateMockId('aga', name);

    const campaignResourceName = `customers/${customerId}/campaigns/${cmpId}`;
    const budgetResourceName = `customers/${customerId}/campaignBudgets/${bgtId}`;
    const adGroupResourceName = `customers/${customerId}/adGroups/${agId}`;
    const adGroupAdResourceName = `customers/${customerId}/adGroupAds/${agaId}`;

    return {
      success: true,
      isMock: true,
      dryRun: true,
      status: 'PAUSED_DRY_RUN',
      campaignId: cmpId,
      campaignName: name,
      type,
      startDate,
      endDate,
      campaignResourceName,
      budgetResourceName,
      adGroupResourceName,
      adGroupResourceNames: [adGroupResourceName],
      adGroupAdResourceName,
      adGroupAdResourceNames: [adGroupAdResourceName],
      createdKeywordsCount: rawRequest.keywords ? (Array.isArray(rawRequest.keywords) ? rawRequest.keywords.length : 1) : 0,
      timestamp: new Date().toISOString(),
      details: {
        campaignType: type,
        name,
        budgetAmountUsd: budgetAmount,
        startDate,
        endDate,
        rawRequest
      },
    };
  }
}
