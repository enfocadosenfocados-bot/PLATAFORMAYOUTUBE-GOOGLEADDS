import { config } from '../config';

export interface GeminiMetadataRequest {
  contextPrompt: string;
  category?: string;
  targetAudience?: string;
  language?: string;
}

export interface VideoMetadata {
  title: string;
  description: string;
  tags: string[];
  language?: string;
}

export interface GeminiMetadataResponse {
  success: boolean;
  metadata: VideoMetadata;
  isFallback?: boolean;
  error?: string;
}

/**
 * Cleanses markdown code block fences (e.g., ```json ... ```) from raw Gemini response.
 */
export function cleanseJsonMarkdown(rawText: string): string {
  if (!rawText) return '';
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  return cleaned.trim();
}

/**
 * Generates brand default metadata when AI service is unavailable or errors out.
 */
export function getFallbackMetadata(request: GeminiMetadataRequest): VideoMetadata {
  const prompt = (request.contextPrompt || '').trim();
  const lang = request.language || 'es';
  const category = request.category || 'Joyería Fina';

  const isSpanish = lang === 'es';
  const brandTitle = isSpanish ? 'Aguamarina Joyería' : 'Aguamarina Jewelry';
  const titleSubject = prompt.length > 0 ? prompt : (isSpanish ? 'Colección Elegante 2026' : 'Exclusive Collection 2026');

  const title = `${brandTitle}: ${titleSubject} | ${isSpanish ? 'Diseños Exclusivos' : 'Exclusive Designs'}`;

  const SOCIAL_LINKS = `\n\n📍 Ubicación: C. 14, San José, centro comercial centro uno https://maps.app.goo.gl/Y3H9Uf8VmwsoeScV8\n🌐 Web: https://www.aguamarinajoyeria.com\n📲 WhatsApp: https://wa.me/5068836116\n📸 Instagram: https://www.instagram.com/joyeria_aguamarinacr/\n👥 Facebook: https://www.facebook.com/joyeriaaguamarinacr\n🎵 TikTok: https://www.tiktok.com/@joyeria.aguamarina`;

  const description = isSpanish
    ? `Descubre ${titleSubject} en Aguamarina Joyería. Piezas elaboradas con oro, plata y gemas naturales. Visita nuestra tienda en línea para ver más ofertas.${SOCIAL_LINKS}\n\n#Joyería #Aguamarina #AguamarinaJoyeria #${category.replace(/\s+/g, '')}`
    : `Discover ${titleSubject} at Aguamarina Jewelry. Crafted with fine gold, silver, and precious gemstones.${SOCIAL_LINKS}\n\n#Jewelry #Aguamarina #AguamarinaJewelry #${category.replace(/\s+/g, '')}`;

  const tags = [
    'aguamarina',
    isSpanish ? 'joyería' : 'jewelry',
    'anillos',
    'oro',
    'plata',
    category.toLowerCase().replace(/\s+/g, '')
  ].filter(Boolean);

  return {
    title,
    description,
    tags,
    language: lang
  };
}

/**
 * Generates SEO-optimized video metadata using Google Gemini API or falls back to brand default.
 */
export async function generateVideoMetadata(request: GeminiMetadataRequest): Promise<GeminiMetadataResponse> {
  const apiKey = process.env.GEMINI_API_KEY || config.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || config.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!apiKey) {
    return {
      success: true,
      metadata: getFallbackMetadata(request),
      isFallback: true
    };
  }

  try {
    const lang = request.language || 'es';
    const promptText = `
You are an expert YouTube SEO specialist for "Aguamarina Joyería", a high-end luxury jewelry brand.
Generate YouTube metadata in ${lang === 'es' ? 'Spanish' : 'English'} for a video based on this prompt context:
Context: "${request.contextPrompt || 'Colección de Joyería Fina'}"
Category: "${request.category || 'Joyería Fina'}"
Target Audience: "${request.targetAudience || 'Lujo, Anillos, Bodas'}"

Return ONLY a valid JSON object matching this structure (no extra text, no markdown formatting):
{
  "title": "Title (must include 'Aguamarina Joyería' or 'Aguamarina Jewelry' and key terms, max 90 chars)",
  "description": "Detailed description with call-to-action and hashtags. ALWAYS end with these exact lines:\n\n📍 Ubicación: C. 14, San José, centro comercial centro uno https://maps.app.goo.gl/Y3H9Uf8VmwsoeScV8\n🌐 Web: https://www.aguamarinajoyeria.com\n📲 WhatsApp: https://wa.me/5068836116\n📸 Instagram: https://www.instagram.com/joyeria_aguamarinacr/\n👥 Facebook: https://www.facebook.com/joyeriaaguamarinacr\n🎵 TikTok: https://www.tiktok.com/@joyeria.aguamarina\n\n#Joyería #AguamarinaJoyeria #AguamarinaCR",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"]
}
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API HTTP error ${response.status}`);
    }

    const data = await response.json() as any;
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanedJson = cleanseJsonMarkdown(rawText);
    const parsed = JSON.parse(cleanedJson);

    if (!parsed.title || !parsed.description || !Array.isArray(parsed.tags)) {
      throw new Error('Invalid metadata format from Gemini response');
    }

    return {
      success: true,
      metadata: {
        title: parsed.title,
        description: parsed.description,
        tags: parsed.tags,
        language: lang
      },
      isFallback: false
    };
  } catch (err: any) {
    return {
      success: true,
      metadata: getFallbackMetadata(request),
      isFallback: true,
      error: err.message
    };
  }
}

/**
 * Analyzes video frames using Gemini Vision (multimodal) to auto-generate all metadata.
 * Receives one or more base64 image frames captured from the video.
 */
export interface VideoAnalysisResult {
  success: boolean;
  contextPrompt: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  error?: string;
}

export async function analyzeVideoFrames(frames: string[], language: string = 'es'): Promise<VideoAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY || config.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || config.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!apiKey) {
    return {
      success: false,
      contextPrompt: '',
      title: '',
      description: '',
      tags: [],
      category: 'Joyería Fina',
      error: 'GEMINI_API_KEY no configurada'
    };
  }

  const SOCIAL_LINKS = `

📍 Ubicación: C. 14, San José, centro comercial centro uno https://maps.app.goo.gl/Y3H9Uf8VmwsoeScV8
🌐 Web: https://www.aguamarinajoyeria.com
📲 WhatsApp: https://wa.me/5068836116
📸 Instagram: https://www.instagram.com/joyeria_aguamarinacr/
👥 Facebook: https://www.facebook.com/joyeriaaguamarinacr
🎵 TikTok: https://www.tiktok.com/@joyeria.aguamarina

#Joyería #AguamarinaJoyeria #AguamarinaCR`;

  try {
    const isSpanish = language === 'es';

    const promptText = `You are an expert YouTube SEO specialist for "Aguamarina Joyería", a luxury jewelry store in Costa Rica that sells silver 925, gold-plated, stainless steel 316, and natural gemstone jewelry.

Analyze the provided video screenshot(s) carefully. Identify the products, setting, people, and context shown.

Based on what you SEE in the image(s), generate YouTube metadata in ${isSpanish ? 'Spanish' : 'English'}.

Return ONLY a valid JSON object (no markdown, no extra text):
{
  "contextPrompt": "A 1-2 sentence ${isSpanish ? 'Spanish' : 'English'} description of what is shown in the video (products, setting, action). Be specific about jewelry types, materials, and style.",
  "title": "YouTube title, max 90 chars. Must include 'Aguamarina Joyería'. Be descriptive about the specific products shown. Optimize for SEO.",
  "description": "Detailed ${isSpanish ? 'Spanish' : 'English'} YouTube description (200-400 chars) describing the products and inviting viewers to visit. Include emotional appeal and call-to-action.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"],
  "category": "One of: Joyería Fina, Anillos de Bodas, Collares & Dijes, Promociones, Plata 925, Acero 316, Oro Laminado"
}`;

    // Build multimodal parts: text prompt + image frames
    const parts: any[] = [{ text: promptText }];
    for (const frame of frames) {
      // frame is a base64 dataUrl like "data:image/jpeg;base64,..."
      const base64Data = frame.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: base64Data
        }
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini Vision API error ${response.status}`);
    }

    const data = await response.json() as any;
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanedJson = cleanseJsonMarkdown(rawText);
    const parsed = JSON.parse(cleanedJson);

    // Append social links to description
    const fullDescription = (parsed.description || '') + SOCIAL_LINKS;

    return {
      success: true,
      contextPrompt: parsed.contextPrompt || '',
      title: parsed.title || '',
      description: fullDescription,
      tags: parsed.tags || [],
      category: parsed.category || 'Joyería Fina'
    };
  } catch (err: any) {
    console.error('[Gemini Vision Error]', err.message);

    // Fallback: Generate smart metadata based on context so fields are NEVER left empty
    const fallbackTitle = `Aguamarina Joyería: Joyas en Plata 925, Acero 316 y Oro Laminado | Diseños Exclusivos`;
    const fallbackPrompt = `Muestra de joyería fina exclusiva en Plata 925, Acero Quirúrgico 316L y piezas de Oro Laminado. Collares, anillos y pulseras de alta calidad con acabados elegantes.`;
    const fallbackDesc = `Descubre la nueva colección de joyería en Aguamarina Joyería. Piezas exclusivas elaboradas en Plata 925, Acero 316 y Oro Laminado que lucen con elegancia y brillo duradero. Ideales para uso diario o regalos especiales.${SOCIAL_LINKS}`;
    const fallbackTags = ['aguamarina', 'joyería', 'plata925', 'acero316', 'orolaminado', 'anillos', 'collares', 'pulseras', 'joyeriafina', 'costarica'];

    return {
      success: true,
      contextPrompt: fallbackPrompt,
      title: fallbackTitle,
      description: fallbackDesc,
      tags: fallbackTags,
      category: 'Joyería Fina',
      error: `API warning (${err.message}). Se generaron metadatos automáticos de respaldo.`
    };
  }
}
