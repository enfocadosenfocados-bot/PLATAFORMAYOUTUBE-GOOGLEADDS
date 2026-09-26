import fs from 'fs';
import path from 'path';
import os from 'os';
import { parseAndOptimizeHtml } from '../../src/seo/parser';
import { optimizeFile, optimizeDirectory } from '../../src/seo/index';
import {
  GoogleAdsCampaignService,
  MockAdsEngine,
  validateSearchCampaignRequest,
  validateVideoCampaignRequest,
  ValidationError,
  sanitizeCustomerId,
  isValidUrl,
} from '../../src/ads';

describe('Challenger M1 & M2 Empirical Stress Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'challenger-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // =========================================================================
  // MILESTONE 1: SEO OPTIMIZER STRESS TESTS
  // =========================================================================
  describe('M1 - Corner Cases: Malformed HTML & HTML Parsing', () => {
    test('1.1 Malformed HTML with unclosed tags, broken markup, and random angle brackets', () => {
      const malformedHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Malformed Page <<< >>>
<body>
  <div>
    <h1>Anillos de Compromiso en Oro 18K<span> (Exclusivo)</span
    <p>Texto sin cerrar de prueba con <<marcas>> y &amp; símbolos
    <img src="/images/anillo.jpg"
  </div>
`;
      const result = parseAndOptimizeHtml(malformedHtml, { brandName: 'Aguamarina Joyería' });

      expect(result).toBeDefined();
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<head>');
      expect(result.html).toContain('</head>');
      expect(result.html).toContain('<title>');
      expect(result.html).toContain('Aguamarina Joyería');
      // Should not throw or crash on malformed markup
    });

    test('1.2 HTML missing html, head, and body tags entirely', () => {
      const fragment = `<h1>Colección Relojes Suizos</h1><p>Relojes de alta gama en oro y acero.</p><img src="reloj.png">`;
      const result = parseAndOptimizeHtml(fragment, { brandName: 'Aguamarina Joyería' });

      expect(result.isModified).toBe(true);
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<head>');
      expect(result.html).toContain('<title>Colección Relojes Suizos | Aguamarina Joyería</title>');
      expect(result.html).toContain('<body>');
    });

    test('1.3 HTML with deeply nested tags inside H1, figure, and body', () => {
      const nestedHtml = `<!DOCTYPE html>
<html>
<head></head>
<body>
  <div class="main-wrapper">
    <section class="content">
      <article>
        <h1><span><em><strong>Collares de Perlas Cultivadas</strong></em></span></h1>
        <figure>
          <a href="/perlas"><picture><source srcset="perlas.webp"><img src="/images/perlas-mar.jpg"></picture></a>
          <figcaption><span>Detalle de <strong>Perlas de Cultivo</strong> de Mar del Sur</span></figcaption>
        </figure>
      </article>
    </section>
  </div>
</body>
</html>`;

      const result = parseAndOptimizeHtml(nestedHtml, { brandName: 'Aguamarina Joyería' });

      expect(result.html).toContain('<title>Collares de Perlas Cultivadas | Aguamarina Joyería</title>');
      expect(result.html).toContain('alt="Detalle de Perlas de Cultivo de Mar del Sur"');
    });

    test('1.4 Empty file (0-byte) and whitespace-only file handling', () => {
      const emptyResult = parseAndOptimizeHtml('');
      expect(emptyResult.isModified).toBe(true);
      expect(emptyResult.html).toContain('<!DOCTYPE html>');
      expect(emptyResult.html).toContain('<title>Inicio | Aguamarina Joyería</title>');

      const whitespaceResult = parseAndOptimizeHtml('   \n\t\r  \n  ');
      expect(whitespaceResult.isModified).toBe(true);
      expect(whitespaceResult.html).toContain('<!DOCTYPE html>');
      expect(whitespaceResult.html).toContain('<title>Inicio | Aguamarina Joyería</title>');
    });

    test('1.5 Spanish special characters UTF-8 preservation (ñ, á, é, í, ó, ú, Á, É, Í, Ó, Ú, Ñ, ü, Ü, ¡, ¿)', () => {
      const spanishHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <title>Diseños de Joyería en Bogotá &amp; Medellín</title>
</head>
<body>
  <h1>¿Buscas los mejores anillos de compromiso? ¡Visítanos en la Güería!</h1>
  <p>En nuestra joyería diseñamos piezas únicas en Güepsa con diamantes, zafiros, rubíes y esmeraldas de Ñandú. Envió gratis a todo el país.</p>
  <img src="/img/anillo-ñoño.jpg">
</body>
</html>`;

      const result = parseAndOptimizeHtml(spanishHtml, { brandName: 'Aguamarina Joyería' });

      expect(result.html).toContain('¿Buscas los mejores anillos de compromiso? ¡Visítanos en la Güería!');
      expect(result.html).toContain('Diseños de Joyería en Bogotá &amp; Medellín | Aguamarina Joyería');
      expect(result.html).toContain('Anillo Ñoño - Aguamarina Joyería');
      expect(result.html).not.toContain('&aacute;');
      expect(result.html).not.toContain('&ntilde;');
      expect(result.html).not.toContain('&iexcl;');
      expect(result.html).not.toContain('&iquest;');
      expect(result.html).not.toContain('&uuml;');
      expect(result.html).not.toContain('Ã¡');
      expect(result.html).not.toContain('Ã±');
    });
  });

  // =========================================================================
  // MILESTONE 2: GOOGLE ADS CAMPAIGN CREATOR STRESS TESTS
  // =========================================================================
  describe('M2 - Corner Cases: Customer ID, Budgets, Keywords & Validation', () => {
    test('2.1 Invalid Customer IDs validation', () => {
      const invalidIds = [
        'abc-def-ghij',
        '!@#-$%^&*()',
        '---',
        '',
        '   ',
        '123-456-789a',
        'customer123',
      ];

      for (const invalidId of invalidIds) {
        const payload = {
          customerId: invalidId,
          name: 'Test Campaign',
          budget: { amountMicros: 10000000 },
          keywords: [{ text: 'anillo', matchType: 'EXACT' }],
          creative: {
            headlines: ['Headline 1', 'Headline 2', 'Headline 3'],
            descriptions: ['Description 1', 'Description 2'],
            finalUrl: 'https://example.com',
          },
        };

        expect(() => validateSearchCampaignRequest(payload)).toThrow(ValidationError);
      }
    });

    test('2.2 Sanitize Customer ID cleans valid formats correctly', () => {
      expect(sanitizeCustomerId('123-456-7890')).toBe('1234567890');
      expect(sanitizeCustomerId(' 987 654 3210 ')).toBe('9876543210');
      expect(sanitizeCustomerId(9876543210)).toBe('9876543210');
    });

    test('2.3 Negative, Zero, NaN, and Malformed Budgets', () => {
      const invalidBudgets = [
        { amountMicros: -5000000 },
        { amountMicros: 0 },
        { amount: -10 },
        { amount: 0 },
        { amountMicros: NaN },
        { amountMicros: null },
        { amountMicros: undefined },
        { amount: NaN },
        {},
      ];

      for (const bgt of invalidBudgets) {
        const payload = {
          customerId: '1234567890',
          name: 'Budget Test Campaign',
          budget: bgt,
          keywords: [{ text: 'anillo', matchType: 'EXACT' }],
          creative: {
            headlines: ['Headline 1', 'Headline 2', 'Headline 3'],
            descriptions: ['Description 1', 'Description 2'],
            finalUrl: 'https://example.com',
          },
        };

        expect(() => validateSearchCampaignRequest(payload as any)).toThrow(ValidationError);
      }
    });

    test('2.4 Malformed Google Ads Keywords', () => {
      const invalidKeywordPayloads = [
        // Empty text
        [{ text: '', matchType: 'EXACT' }],
        [{ text: '   ', matchType: 'EXACT' }],
        // Text exceeds 80 chars
        [{ text: 'a'.repeat(81), matchType: 'EXACT' }],
        // Invalid matchType
        [{ text: 'anillos de oro', matchType: 'INVALID_TYPE' }],
        [{ text: 'anillos de oro', matchType: '' }],
        [{ text: 'anillos de oro', matchType: 123 }],
        // Empty array
        [],
        // Non-object keyword
        [123],
      ];

      for (const kws of invalidKeywordPayloads) {
        const payload = {
          customerId: '1234567890',
          name: 'Keyword Test Campaign',
          budget: { amountMicros: 10000000 },
          keywords: kws,
          creative: {
            headlines: ['Headline 1', 'Headline 2', 'Headline 3'],
            descriptions: ['Description 1', 'Description 2'],
            finalUrl: 'https://example.com',
          },
        };

        expect(() => validateSearchCampaignRequest(payload as any)).toThrow(ValidationError);
      }
    });

    test('2.5 Dry-Run Search and Video Campaign Creation via Service', async () => {
      const service = new GoogleAdsCampaignService({ dryRun: true });

      const searchRes = await service.createSearchCampaign({
        customerId: '123-456-7890',
        name: 'Search Dry Run Test',
        budget: { amountMicros: 50_000_000 },
        keywords: [
          { text: 'joyas oro 18k', matchType: 'EXACT' },
          { text: 'anillos compromiso', matchType: 'PHRASE' },
        ],
        creative: {
          headlines: ['Joyería Aguamarina', 'Anillos de Compromiso', 'Oro 18K Certificado'],
          descriptions: ['Catálogo exclusivo de alta joyería.', 'Envíos asegurados a todo México.'],
          finalUrl: 'https://aguamarinajoyeria.com',
        },
      });

      expect(searchRes.success).toBe(true);
      expect(searchRes.isMock).toBe(true);
      expect(searchRes.dryRun).toBe(true);
      expect(searchRes.createdKeywordsCount).toBe(2);

      const videoRes = await service.createVideoCampaign({
        customerId: '987-654-3210',
        name: 'Video Dry Run Test',
        budget: { amountMicros: 30_000_000 },
        creative: {
          youtubeVideoId: 'dQw4w9WgXcQ',
          headline: 'Alta Joyería',
          callToAction: 'Comprar',
          description: 'Descubre nuestra nueva colección.',
          finalUrl: 'https://aguamarinajoyeria.com/video',
        },
      });

      expect(videoRes.success).toBe(true);
      expect(videoRes.isMock).toBe(true);
      expect(videoRes.dryRun).toBe(true);
      expect(videoRes.details?.youtubeVideoId).toBe('dQw4w9WgXcQ');
    });
  });
});
