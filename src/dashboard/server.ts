import express, { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import multer from 'multer';
import { generateVideoMetadata, analyzeVideoFrames } from './geminiService';
import { generateThumbnail } from './thumbnailService';
import { uploadVideoToYouTube } from './youtubeUploader';
import { GoogleAdsCampaignService } from '../ads';
import { config } from '../config';

// Multer: store uploaded video files in memory (buffer)
// fieldSize increased to 20MB to handle base64 thumbnail dataUrl strings
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024,  // 500 MB max video file
    fieldSize: 20 * 1024 * 1024,  // 20 MB max per text field (for base64 thumbnail)
    fields: 20
  }
});

export const app = express();

// Ensure static public and thumbnail upload directories exist
const publicDir = path.join(__dirname, 'public');
const thumbnailsDir = path.join(publicDir, 'thumbnails');
if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true });
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static dashboard UI assets
app.use(express.static(publicDir));

// Route 1: POST /api/generate-metadata
app.post('/api/generate-metadata', async (req: Request, res: Response) => {
  try {
    const { contextPrompt, category, targetAudience, language } = req.body || {};
    const result = await generateVideoMetadata({
      contextPrompt: contextPrompt || '',
      category,
      targetAudience,
      language
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate AI metadata'
    });
  }
});

// Route 2: POST /api/generate-thumbnail
app.post('/api/generate-thumbnail', async (req: Request, res: Response) => {
  try {
    const { titleText, styleTheme, width, height, dataUrl } = req.body || {};

    // If client provides a pre-rendered data URL (HTML5 Canvas), save it directly!
    if (dataUrl && dataUrl.startsWith('data:image/png;base64,')) {
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `thumb_${Date.now()}.png`;
      const filePath = path.join(thumbnailsDir, fileName);
      fs.writeFileSync(filePath, buffer);

      return res.json({
        success: true,
        thumbnailUrl: `/thumbnails/${fileName}`,
        dataUrl: dataUrl,
        titleText: titleText || 'Aguamarina Joyería',
        styleTheme: styleTheme || 'glassmorphic',
        width: width ? Number(width) : 1280,
        height: height ? Number(height) : 720
      });
    }

    // Fallback backend renderer
    const result = await generateThumbnail({
      titleText: titleText || 'Aguamarina Joyería',
      styleTheme: styleTheme || 'glassmorphic',
      width: width ? Number(width) : 1280,
      height: height ? Number(height) : 720
    });

    if (result.buffer) {
      const fileName = `thumb_${Date.now()}.png`;
      const filePath = path.join(thumbnailsDir, fileName);
      fs.writeFileSync(filePath, result.buffer);
      result.thumbnailUrl = `/thumbnails/${fileName}`;
    }

    return res.json({
      success: true,
      thumbnailUrl: result.thumbnailUrl,
      titleText: result.titleText,
      styleTheme: result.styleTheme,
      dataUrl: result.dataUrl,
      width: result.width,
      height: result.height
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate thumbnail image'
    });
  }
});

// Route 2.5: POST /api/analyze-video (Gemini Vision - auto-analyze video frames)
app.post('/api/analyze-video', async (req: Request, res: Response) => {
  try {
    const { frames, language } = req.body || {};

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se recibieron frames del video para analizar'
      });
    }

    console.log(`[Video Analysis] Analizando ${frames.length} frame(s) con Gemini Vision...`);

    const result = await analyzeVideoFrames(frames, language || 'es');

    console.log(`[Video Analysis] Success: ${result.success}, Title: "${result.title}", Error: ${result.error || 'none'}`);

    return res.json(result);
  } catch (err: any) {
    console.error('[Video Analysis Error]', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Error al analizar video con IA'
    });
  }
});
app.post('/api/upload', upload.single('videoFile'), async (req: Request, res: Response) => {
  try {
    const { title, description, tags, isMock, privacyStatus, thumbnailDataUrl } = req.body || {};

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const videoFile = (req as any).file as Express.Multer.File | undefined;
    const isMockBool = isMock === 'true' || isMock === true;

    if (!isMockBool && !videoFile) {
      return res.status(400).json({ success: false, error: 'No se seleccionó un archivo de video. Por favor selecciona un video antes de subir.' });
    }

    // Decode thumbnail from base64 dataUrl if provided
    let thumbnailBuffer: Buffer | undefined;
    if (thumbnailDataUrl && typeof thumbnailDataUrl === 'string' && thumbnailDataUrl.startsWith('data:image')) {
      const base64Data = thumbnailDataUrl.replace(/^data:image\/\w+;base64,/, '');
      thumbnailBuffer = Buffer.from(base64Data, 'base64');
    }

    // Parse tags string
    let parsedTags: string[] = [];
    if (typeof tags === 'string') {
      parsedTags = tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    } else if (Array.isArray(tags)) {
      parsedTags = tags;
    }

    console.log(`[Upload Request] Title: "${title}", isMock: ${isMockBool}, hasVideo: ${!!videoFile}, videoSize: ${videoFile?.size || 0}, hasThumbnail: ${!!thumbnailBuffer}`);

    const uploadResult = await uploadVideoToYouTube({
      title,
      description: description || '',
      tags: parsedTags,
      privacyStatus: (privacyStatus as any) || 'unlisted',
      isMock: isMockBool,
      videoBuffer: videoFile?.buffer,
      thumbnailBuffer
    });

    console.log(`[Upload Result] Success: ${uploadResult.success}, VideoId: ${uploadResult.videoId}, Error: ${uploadResult.error || 'none'}`);

    return res.json({
      success: uploadResult.success,
      isMock: uploadResult.isMock,
      videoId: uploadResult.videoId,
      youtubeUrl: uploadResult.youtubeUrl,
      status: uploadResult.status,
      uploadedMetadata: uploadResult.uploadedMetadata,
      thumbnailAttached: uploadResult.thumbnailAttached,
      thumbnailUploaded: uploadResult.thumbnailUploaded,
      message: uploadResult.message,
      error: uploadResult.error
    });
  } catch (err: any) {
    console.error('[Upload Error]', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to process YouTube upload'
    });
  }
});

// Route 4: GET /api/upload-stream (Server-Sent Events)
app.get('/api/upload-stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write(`data: ${JSON.stringify({ step: 'START', progress: 0 })}\n\n`);
  res.write(`data: ${JSON.stringify({ step: 'METADATA', progress: 30 })}\n\n`);
  res.write(`data: ${JSON.stringify({ step: 'THUMBNAIL', progress: 60 })}\n\n`);
  res.write(`data: ${JSON.stringify({ step: 'UPLOAD', progress: 100 })}\n\n`);
  res.end();
});

// Route 5: POST /api/create-campaign (Google/YouTube Ads Creator)
app.post('/api/create-campaign', async (req: Request, res: Response) => {
  try {
    const {
      campaignType,
      campaignName,
      budgetAmount,
      keywords,
      headlines,
      descriptions,
      finalUrl,
      youtubeVideoId,
      callToAction,
      startDate,
      endDate,
      dryRun
    } = req.body || {};

    if (!campaignName || !budgetAmount) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name and budget amount are required'
      });
    }

    const adsService = new GoogleAdsCampaignService();
    let result;

    const isDryRun = dryRun !== false;

    if (campaignType === 'SEARCH') {
      const kwList = Array.isArray(keywords)
        ? keywords
        : typeof keywords === 'string'
        ? keywords.split(',').map((k: string) => k.trim()).filter(Boolean).map((text: string) => ({ text, matchType: 'PHRASE' }))
        : [];

      const headList = Array.isArray(headlines) ? headlines : [headlines].filter(Boolean);
      const descList = Array.isArray(descriptions) ? descriptions : [descriptions].filter(Boolean);

      result = await adsService.createSearchCampaign({
        name: campaignName,
        budget: {
          amount: Number(budgetAmount),
          deliveryMethod: 'STANDARD',
          explicitlyShared: false
        },
        keywords: kwList as any[],
        creative: {
          headlines: headList,
          descriptions: descList,
          finalUrl: finalUrl || 'https://aguamarinajoyeria.com'
        },
        startDate,
        endDate,
        dryRun: isDryRun
      });
    } else if (campaignType === 'VIDEO') {
      result = await adsService.createVideoCampaign({
        name: campaignName,
        budget: {
          amount: Number(budgetAmount),
          deliveryMethod: 'STANDARD',
          explicitlyShared: false
        },
        creative: {
          youtubeVideoId: youtubeVideoId || 'yt_mock_123456',
          headline: headlines?.[0] || 'Aguamarina Joyería',
          callToAction: callToAction || 'COMPRAR AHORA',
          description: descriptions?.[0] || 'Colección de Joyería Fina',
          finalUrl: finalUrl || 'https://aguamarinajoyeria.com'
        },
        dryRun: isDryRun,
        ...( { startDate, endDate } as any )
      });
    } else {
      // DISPLAY, PERFORMANCE_MAX, SHOPPING, LOCAL
      result = await adsService.createGenericCampaign({
        campaignType,
        campaignName,
        budgetAmount: Number(budgetAmount),
        keywords,
        headlines,
        descriptions,
        finalUrl,
        youtubeVideoId,
        startDate,
        endDate,
        dryRun: isDryRun,
        ...req.body
      });
    }

    return res.json({
      success: true,
      result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to create campaign'
    });
  }
});

// Start server when executed directly
if (require.main === module) {
  const port = config.PORT || 3000;
  const host = config.HOST || 'localhost';
  app.listen(port, () => {
    console.log(`🚀 Aguamarina YouTube Auto-Upload Dashboard running on http://${host}:${port}`);
  });
}
