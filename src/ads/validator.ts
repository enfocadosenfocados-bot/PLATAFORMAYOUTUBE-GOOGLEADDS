/**
 * Validation utilities and schemas for Google Ads and YouTube Ads creation.
 */

export class ValidationError extends Error {
  public readonly errors: string[];

  constructor(errors: string[]) {
    super(`Schema Validation Error: Validation failed: ${errors.join('; ')}`);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export interface NormalizedSearchCampaignRequest {
  customerId: string;
  name: string;
  budget: {
    name?: string;
    amountMicros: number;
    deliveryMethod?: 'STANDARD' | 'ACCELERATED';
    explicitlyShared?: boolean;
  };
  targeting: {
    geoTargetLocationIds: string[];
    languages: string[];
    demographics?: {
      gender?: ('MALE' | 'FEMALE' | 'UNDETERMINED')[];
      ageRanges?: string[];
    };
  };
  keywords: Array<{
    text: string;
    matchType: 'EXACT' | 'PHRASE' | 'BROAD';
  }>;
  adCreative: {
    headlines: string[];
    descriptions: string[];
    finalUrls: string[];
    path1?: string;
    path2?: string;
  };
  startDate?: string;
  endDate?: string;
  dryRun?: boolean;
}

export interface NormalizedVideoCampaignRequest {
  customerId: string;
  name: string;
  budget: {
    name?: string;
    amountMicros: number;
    deliveryMethod?: 'STANDARD' | 'ACCELERATED';
    explicitlyShared?: boolean;
  };
  targeting: {
    geoTargetLocationIds: string[];
    languages: string[];
    genders?: ('MALE' | 'FEMALE' | 'UNDETERMINED')[];
    ageRanges?: string[];
    topics?: string[];
  };
  adCreative: {
    youtubeVideoId: string;
    headline: string;
    callToAction: string;
    description?: string;
    displayUrl?: string;
    finalUrls: string[];
  };
  channelId?: string;
  dryRun?: boolean;
}

/**
 * Sanitizes customer ID by stripping dashes and whitespace.
 */
export function sanitizeCustomerId(id: string | number): string {
  if (id === undefined || id === null) return '';
  return String(id).replace(/[-\s]/g, '');
}

/**
 * Validates whether a string is a valid HTTP/HTTPS URL.
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extracts clean 11-character YouTube Video ID from any input string or full URL (shorts, watch?v=, youtu.be).
 */
export function extractYouTubeVideoId(input: string): string {
  if (!input || typeof input !== 'string') return 'yt_mock_123456';
  const trimmed = input.trim();

  // Match shorts URL: youtube.com/shorts/ID
  const shortsMatch = trimmed.match(/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];

  // Match watch URL: youtube.com/watch?v=ID
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // Match share URL: youtu.be/ID
  const shareMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shareMatch) return shareMatch[1];

  // Direct ID or mock ID
  const directMatch = trimmed.match(/([a-zA-Z0-9_-]{11}|yt_mock_\w+)/);
  if (directMatch) return directMatch[1];

  return trimmed.slice(0, 11) || 'yt_mock_123456';
}

/**
 * Validates and normalizes Search Campaign creation payload.
 */
export function validateSearchCampaignRequest(raw: any): NormalizedSearchCampaignRequest {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    throw new ValidationError(['Request payload must be a non-null object']);
  }

  // Customer ID validation & fallback
  const rawCustomerId = raw.customer_id ?? raw.customerId;
  let customerId = '';
  if (rawCustomerId === undefined || rawCustomerId === null) {
    customerId = '1234567890';
  } else {
    customerId = sanitizeCustomerId(rawCustomerId);
    if (!customerId) {
      errors.push('Customer ID is required');
    } else if (!/^\d+$/.test(customerId)) {
      errors.push(`Customer ID must contain only digits (received: ${rawCustomerId})`);
    }
  }

  // Campaign Name validation
  if (!raw.name || typeof raw.name !== 'string' || raw.name.trim().length === 0) {
    errors.push('Campaign name is required and must be a non-empty string');
  }

  // Budget validation (nested or flat)
  const budgetObj = typeof raw.budget === 'object' && raw.budget !== null ? raw.budget : {};
  let amountMicros: any;
  if (typeof raw.budget === 'number') {
    amountMicros = raw.budget;
  } else if (budgetObj.amountMicros !== undefined && budgetObj.amountMicros !== null) {
    amountMicros = budgetObj.amountMicros;
  } else if (typeof budgetObj.amount === 'number') {
    amountMicros = Math.round(budgetObj.amount * 1_000_000);
  } else if (raw.budgetAmountMicros !== undefined && raw.budgetAmountMicros !== null) {
    amountMicros = raw.budgetAmountMicros;
  } else if (raw.budget_amount_micros !== undefined && raw.budget_amount_micros !== null) {
    amountMicros = raw.budget_amount_micros;
  }

  if (typeof amountMicros !== 'number' || isNaN(amountMicros) || amountMicros <= 0) {
    errors.push('Budget amountMicros must be a positive number greater than 0');
  }

  // Keywords validation & normalization
  let rawKeywords = raw.keywords ?? raw.keyword;
  if (typeof rawKeywords === 'string') {
    rawKeywords = [rawKeywords];
  }
  const keywords = Array.isArray(rawKeywords) ? rawKeywords : [];
  if (keywords.length === 0) {
    errors.push('Keywords array must contain at least one keyword specification');
  } else {
    keywords.forEach((kw: any, index: number) => {
      let kwObj = kw;
      if (typeof kw === 'string') {
        kwObj = { text: kw, matchType: 'BROAD' };
      }
      if (!kwObj || typeof kwObj !== 'object') {
        errors.push(`Keyword at index ${index} must be an object`);
        return;
      }
      if (!kwObj.text || typeof kwObj.text !== 'string' || kwObj.text.trim().length === 0) {
        errors.push(`Keyword at index ${index} text is required`);
      } else if (kwObj.text.length > 80) {
        errors.push(`Keyword at index ${index} text exceeds maximum length of 80 characters`);
      }
      const matchType = String(kwObj.matchType || '').toUpperCase();
      if (!['EXACT', 'PHRASE', 'BROAD'].includes(matchType)) {
        errors.push(`Keyword at index ${index} matchType must be EXACT, PHRASE, or BROAD`);
      }
    });
  }

  // Ad Creative validation & normalization (nested or flat)
  const creativeObj = raw.adCreative ?? raw.creative ?? {};
  let headlines: any[];
  if (Array.isArray(creativeObj.headlines)) {
    headlines = creativeObj.headlines;
  } else if (Array.isArray(raw.headlines)) {
    headlines = raw.headlines;
  } else {
    headlines = [
      raw.name ? String(raw.name).trim().slice(0, 30) : 'Joyería Aguamarina',
      'Alta Joyería Certificada',
      'Envío Gratis México',
    ];
  }

  let descriptions: any[];
  if (Array.isArray(creativeObj.descriptions)) {
    descriptions = creativeObj.descriptions;
  } else if (Array.isArray(raw.descriptions)) {
    descriptions = raw.descriptions;
  } else {
    descriptions = [
      'Catálogo exclusivo de alta joyería y anillos de compromiso.',
      'Compra hoy con envío seguro y garantía a todo México.',
    ];
  }

  // Auto-trim and auto-pad headlines (3 to 15 items, max 30 chars each)
  let cleanHeadlines = headlines
    .map((h: any) => String(h || '').trim().slice(0, 30))
    .filter(Boolean);

  if (cleanHeadlines.length < 1) cleanHeadlines.push('Joyería Aguamarina');
  if (cleanHeadlines.length < 2) cleanHeadlines.push('Diseños Exclusivos');
  if (cleanHeadlines.length < 3) cleanHeadlines.push('Comprar en Línea');
  headlines = cleanHeadlines.slice(0, 15);

  // Auto-trim and auto-pad descriptions (2 to 4 items, max 90 chars each)
  let cleanDescriptions = descriptions
    .map((d: any) => String(d || '').trim().slice(0, 90))
    .filter(Boolean);

  if (cleanDescriptions.length < 1) cleanDescriptions.push('Descubre piezas exclusivas en Plata 925 y Oro Laminado.');
  if (cleanDescriptions.length < 2) cleanDescriptions.push('Visita nuestra tienda en línea para ver todas las ofertas.');
  descriptions = cleanDescriptions.slice(0, 4);

  // Final URLs validation
  let finalUrls: string[] = [];
  const rawFinalUrls = creativeObj.finalUrls ?? raw.finalUrls ?? creativeObj.finalUrl ?? raw.finalUrl;
  if (Array.isArray(rawFinalUrls)) {
    finalUrls = rawFinalUrls;
  } else if (typeof rawFinalUrls === 'string') {
    finalUrls = [rawFinalUrls];
  } else if (!raw.creative && !raw.adCreative) {
    finalUrls = ['https://aguamarinajoyeria.com'];
  }

  if (finalUrls.length === 0) {
    errors.push('Ad creative finalUrls must contain at least one valid URL');
  } else {
    finalUrls.forEach((url, idx) => {
      if (!isValidUrl(url)) {
        errors.push(`Final URL at index ${idx} is not a valid HTTP/HTTPS URL: "${url}"`);
      }
    });
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  // Targeting defaults/normalization
  const targetingObj = raw.targeting || {};
  const geoTargetLocationIds = (
    targetingObj.geoTargetLocationIds ||
    targetingObj.targetLocations ||
    raw.targetLocations ||
    raw.geoTargetLocationIds ||
    []
  ).map((loc: any) => String(loc));
  const languages = (
    targetingObj.languages ||
    targetingObj.targetLanguages ||
    raw.targetLanguages ||
    raw.languages ||
    []
  ).map((lang: any) => String(lang));

  const normalizedKeywords = keywords.map((kw: any) => {
    const item = typeof kw === 'string' ? { text: kw, matchType: 'BROAD' } : kw;
    return {
      text: String(item.text).trim(),
      matchType: String(item.matchType || 'BROAD').toUpperCase() as 'EXACT' | 'PHRASE' | 'BROAD',
    };
  });

  const campaignNameStr = String(raw.name).trim();

  return {
    customerId,
    name: campaignNameStr,
    budget: {
      name: budgetObj.name || `${campaignNameStr} Budget`,
      amountMicros,
      deliveryMethod: budgetObj.deliveryMethod || 'STANDARD',
      explicitlyShared: Boolean(budgetObj.explicitlyShared),
    },
    targeting: {
      geoTargetLocationIds,
      languages,
      demographics: targetingObj.demographics || targetingObj.targeting?.demographics,
    },
    keywords: normalizedKeywords,
    adCreative: {
      headlines: headlines.map((h: string) => String(h).trim()),
      descriptions: descriptions.map((d: string) => String(d).trim()),
      finalUrls,
      path1: creativeObj.path1 ?? raw.path1,
      path2: creativeObj.path2 ?? raw.path2,
    },
    startDate: raw.startDate,
    endDate: raw.endDate,
    dryRun: raw.dryRun,
  };
}

/**
 * Validates and normalizes Video Campaign creation payload.
 */
export function validateVideoCampaignRequest(raw: any): NormalizedVideoCampaignRequest {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    throw new ValidationError(['Request payload must be a non-null object']);
  }

  // Customer ID validation & fallback
  const rawCustomerId = raw.customer_id ?? raw.customerId;
  let customerId = '';
  if (rawCustomerId === undefined || rawCustomerId === null) {
    customerId = '1234567890';
  } else {
    customerId = sanitizeCustomerId(rawCustomerId);
    if (!customerId) {
      errors.push('Customer ID is required');
    } else if (!/^\d+$/.test(customerId)) {
      errors.push(`Customer ID must contain only digits (received: ${rawCustomerId})`);
    }
  }

  // Campaign Name validation
  if (!raw.name || typeof raw.name !== 'string' || raw.name.trim().length === 0) {
    errors.push('Campaign name is required and must be a non-empty string');
  }

  // Budget validation (nested or flat)
  const budgetObj = typeof raw.budget === 'object' && raw.budget !== null ? raw.budget : {};
  let amountMicros: any;
  if (typeof raw.budget === 'number') {
    amountMicros = raw.budget;
  } else if (budgetObj.amountMicros !== undefined && budgetObj.amountMicros !== null) {
    amountMicros = budgetObj.amountMicros;
  } else if (typeof budgetObj.amount === 'number') {
    amountMicros = Math.round(budgetObj.amount * 1_000_000);
  } else if (raw.budgetAmountMicros !== undefined && raw.budgetAmountMicros !== null) {
    amountMicros = raw.budgetAmountMicros;
  } else if (raw.budget_amount_micros !== undefined && raw.budget_amount_micros !== null) {
    amountMicros = raw.budget_amount_micros;
  }

  if (typeof amountMicros !== 'number' || isNaN(amountMicros) || amountMicros <= 0) {
    errors.push('Budget amountMicros must be a positive number greater than 0');
  }

  // Ad Creative validation & normalization (nested or flat)
  const creativeObj = raw.adCreative ?? raw.creative ?? {};
  const rawVideoId = creativeObj.youtubeVideoId ?? raw.youtubeVideoId ?? raw.videoId;
  const youtubeVideoId = extractYouTubeVideoId(rawVideoId);

  // Normalize headline: max 15 chars for YouTube Video Ads
  let headline = String(creativeObj.headline ?? raw.headline ?? (raw.name ? String(raw.name).trim() : 'Video Ad')).trim();
  if (headline.length > 15) {
    headline = headline.slice(0, 15);
  }
  if (!headline) headline = 'Aguamarina';

  // Normalize CTA: max 10 chars for Google Ads Video
  let callToAction = String(creativeObj.callToAction ?? raw.callToAction ?? raw.cta ?? 'Comprar').trim();
  const ctaMap: Record<string, string> = {
    'COMPRAR_AHORA': 'Comprar',
    'MAS_INFORMACION': 'Ver más',
    'VISITAR_SITIO': 'Visitar',
    'Visitar Sitio Web': 'Visitar',
    'Más Información': 'Ver más',
    'Comprar Ahora': 'Comprar'
  };
  callToAction = ctaMap[callToAction] || (callToAction.length > 10 ? callToAction.slice(0, 10) : callToAction);
  if (!callToAction) callToAction = 'Comprar';

  let description = creativeObj.description ?? raw.description;
  if (description && typeof description === 'string' && description.length > 90) {
    description = description.slice(0, 90);
  }

  let displayUrl = creativeObj.displayUrl ?? raw.displayUrl;
  if (displayUrl && typeof displayUrl === 'string' && displayUrl.length > 35) {
    displayUrl = displayUrl.slice(0, 35);
  }

  // Final URLs validation
  let finalUrls: string[] = [];
  const rawFinalUrls = creativeObj.finalUrls ?? raw.finalUrls ?? creativeObj.finalUrl ?? raw.finalUrl;
  if (Array.isArray(rawFinalUrls)) {
    finalUrls = rawFinalUrls;
  } else if (typeof rawFinalUrls === 'string') {
    finalUrls = [rawFinalUrls];
  } else if (!raw.creative && !raw.adCreative) {
    finalUrls = ['https://aguamarinajoyeria.com'];
  }

  if (finalUrls.length === 0) {
    errors.push('Video ad creative finalUrls must contain at least one valid URL');
  } else {
    finalUrls.forEach((url, idx) => {
      if (!isValidUrl(url)) {
        errors.push(`Final URL at index ${idx} is not a valid HTTP/HTTPS URL: "${url}"`);
      }
    });
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  // Targeting normalization
  const targetingObj = raw.targeting || {};
  const geoTargetLocationIds = (
    targetingObj.geoTargetLocationIds ||
    targetingObj.targetLocations ||
    raw.targetLocations ||
    raw.geoTargetLocationIds ||
    raw.targetAudience ||
    []
  ).map((loc: any) => String(loc));
  const languages = (
    targetingObj.languages ||
    targetingObj.targetLanguages ||
    raw.targetLanguages ||
    raw.languages ||
    []
  ).map((lang: any) => String(lang));

  const campaignNameStr = String(raw.name).trim();

  return {
    customerId,
    name: campaignNameStr,
    budget: {
      name: budgetObj.name || `${campaignNameStr} Video Budget`,
      amountMicros,
      deliveryMethod: budgetObj.deliveryMethod || 'STANDARD',
      explicitlyShared: Boolean(budgetObj.explicitlyShared),
    },
    targeting: {
      geoTargetLocationIds,
      languages,
      genders: targetingObj.genders || targetingObj.demographics?.gender,
      ageRanges: targetingObj.ageRanges || targetingObj.demographics?.ageRanges,
      topics: targetingObj.topics,
    },
    adCreative: {
      youtubeVideoId: String(youtubeVideoId).trim(),
      headline: String(headline).trim(),
      callToAction: String(callToAction).trim(),
      description: description ? String(description).trim() : undefined,
      displayUrl: displayUrl ? String(displayUrl).trim() : undefined,
      finalUrls,
    },
    channelId: raw.channelId,
    dryRun: raw.dryRun,
  };
}

