import request from 'supertest';
import { app } from '../../src/dashboard/server';
import { generateVideoMetadata, cleanseJsonMarkdown, getFallbackMetadata } from '../../src/dashboard/geminiService';
import { generateThumbnail } from '../../src/dashboard/thumbnailService';
import { uploadVideoToYouTube } from '../../src/dashboard/youtubeUploader';

describe('Unit & Integration Tests: YouTube Dashboard & AI Services (R3)', () => {
  describe('1. Gemini AI Metadata Generator (geminiService.ts)', () => {
    test('cleanseJsonMarkdown strips markdown code fences correctly', () => {
      const rawText = '```json\n{"title": "Anillo de Diamante", "description": "Lujo", "tags": ["oro"]}\n```';
      const cleaned = cleanseJsonMarkdown(rawText);
      expect(cleaned).toBe('{"title": "Anillo de Diamante", "description": "Lujo", "tags": ["oro"]}');
    });

    test('getFallbackMetadata generates valid brand default metadata', () => {
      const fallback = getFallbackMetadata({
        contextPrompt: 'Colección de Esmeraldas',
        category: 'Joyas'
      });

      expect(fallback.title).toContain('Aguamarina Joyería');
      expect(fallback.title).toContain('Colección de Esmeraldas');
      expect(fallback.description).toContain('#Joyería');
      expect(fallback.tags).toContain('aguamarina');
    });

    test('generateVideoMetadata returns valid response object with brand title', async () => {
      const result = await generateVideoMetadata({
        contextPrompt: 'Anillo de Bodas Oro Blanco',
        category: 'Anillos',
        language: 'es'
      });

      expect(result.success).toBe(true);
      expect(result.metadata.title).toContain('Aguamarina Joyería');
      expect(result.metadata.tags.length).toBeGreaterThan(0);
    });

    test('generateVideoMetadata respects English language parameter', async () => {
      const result = await generateVideoMetadata({
        contextPrompt: 'Gold Engagement Ring',
        language: 'en'
      });

      expect(result.success).toBe(true);
      expect(result.metadata.language).toBe('en');
      expect(result.metadata.title).toContain('Jewelry');
    });
  });

  describe('2. Thumbnail Generator (thumbnailService.ts)', () => {
    test('generateThumbnail produces exact 1280x720 HD thumbnail dimensions', async () => {
      const result = await generateThumbnail({
        titleText: 'Anillo de Bodas 18K'
      });

      expect(result.success).toBe(true);
      expect(result.width).toBe(1280);
      expect(result.height).toBe(720);
      expect(result.buffer).toBeDefined();
      expect(Buffer.isBuffer(result.buffer)).toBe(true);
      expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
    });

    test('generateThumbnail supports luxury gold theme', async () => {
      const result = await generateThumbnail({
        titleText: 'Colección Alta Gama 2026',
        styleTheme: 'luxury_gold'
      });

      expect(result.styleTheme).toBe('luxury_gold');
      expect(result.buffer.length).toBeGreaterThan(100);
    });
  });

  describe('3. YouTube Uploader (youtubeUploader.ts)', () => {
    test('uploadVideoToYouTube succeeds in mock dry-run mode and triggers progress callbacks', async () => {
      const progressSteps: string[] = [];
      const result = await uploadVideoToYouTube({
        title: 'Video Promocional Joyas',
        description: 'Descripción promocional',
        tags: ['oro', 'plata'],
        isMock: true,
        onProgress: (percent, step) => {
          progressSteps.push(step);
        }
      });

      expect(result.success).toBe(true);
      expect(result.isMock).toBe(true);
      expect(result.videoId).toMatch(/^yt_mock_/);
      expect(result.youtubeUrl).toContain('youtube.com/watch?v=');
      expect(progressSteps).toContain('START');
      expect(progressSteps).toContain('UPLOAD');
    });

    test('uploadVideoToYouTube throws error when title is missing', async () => {
      await expect(
        uploadVideoToYouTube({
          title: '',
          isMock: true
        })
      ).rejects.toThrow('Title is required');
    });
  });

  describe('4. Express Server REST API Routes (server.ts)', () => {
    test('POST /api/generate-metadata generates metadata via API endpoint', async () => {
      const res = await request(app)
        .post('/api/generate-metadata')
        .send({
          contextPrompt: 'Colección de Aretes de Plata',
          category: 'Aretes'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.metadata.title).toContain('Aguamarina Joyería');
    });

    test('POST /api/generate-thumbnail generates thumbnail via API endpoint', async () => {
      const res = await request(app)
        .post('/api/generate-thumbnail')
        .send({
          titleText: 'Novedades Aguamarina 2026',
          styleTheme: 'glassmorphic'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.thumbnailUrl).toBeDefined();
    });

    test('POST /api/upload triggers mock video upload endpoint', async () => {
      const res = await request(app)
        .post('/api/upload')
        .send({
          title: 'Anillo de Compromiso Promocional',
          description: 'Descripción del producto',
          tags: ['anillo', 'diamante'],
          isMock: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isMock).toBe(true);
      expect(res.body.videoId).toBeDefined();
    });

    test('POST /api/upload rejects request missing title with 400', async () => {
      const res = await request(app)
        .post('/api/upload')
        .send({
          description: 'Sin título'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Title is required');
    });

    test('GET /api/upload-stream returns SSE event stream', async () => {
      const res = await request(app).get('/api/upload-stream');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/event-stream');
      expect(res.text).toContain('data: {"step":"START"');
      expect(res.text).toContain('data: {"step":"UPLOAD"');
    });
  });
});
