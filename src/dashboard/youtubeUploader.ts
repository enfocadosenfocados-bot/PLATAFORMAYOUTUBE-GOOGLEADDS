import { Readable } from 'stream';
import { config } from '../config';

export interface UploadVideoOptions {
  title: string;
  description?: string;
  tags?: string[] | string;
  privacyStatus?: 'public' | 'unlisted' | 'private';
  isMock?: boolean;
  videoFilePath?: string;
  videoBuffer?: Buffer;
  videoStream?: any;
  thumbnailFilePath?: string;
  thumbnailBuffer?: Buffer;
  thumbnailStream?: any;
  thumbnailUrl?: string;
  onProgress?: (progress: number, step: string) => void;
}

export interface UploadVideoResult {
  success: boolean;
  isMock: boolean;
  videoId: string;
  youtubeUrl: string;
  status: string;
  thumbnailAttached?: boolean;
  thumbnailUploaded?: boolean;
  uploadedMetadata?: {
    title: string;
    description: string;
    tags: string[];
  };
  message?: string;
  error?: string;
}

/**
 * Normalizes tags array input from array or comma-separated string.
 */
function normalizeTags(tags?: string[] | string): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  return tags.split(',').map(t => t.trim()).filter(Boolean);
}

/**
 * Converts a Buffer to a Node.js Readable stream (required by googleapis media upload).
 */
function bufferToStream(buffer: Buffer): Readable {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}

/**
 * Uploads a video and sets its thumbnail on YouTube Data API v3 (or dry-run mock flow).
 */
export async function uploadVideoToYouTube(options: UploadVideoOptions): Promise<UploadVideoResult> {
  const {
    title,
    description = '',
    tags,
    privacyStatus = 'unlisted',
    isMock = false,
    thumbnailUrl,
    onProgress
  } = options;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new Error('Title is required for YouTube upload');
  }

  const normalizedTags = normalizeTags(tags);
  const isDryRun = isMock || config.DRY_RUN_MODE;

  if (onProgress) onProgress(10, 'START');

  // --- DRY RUN / MOCK MODE ---
  if (isDryRun) {
    if (onProgress) {
      onProgress(30, 'METADATA');
      onProgress(60, 'THUMBNAIL');
      onProgress(100, 'UPLOAD');
    }
    const timestamp = Date.now();
    const videoId = `yt_mock_${timestamp}`;
    return {
      success: true,
      isMock: true,
      videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      status: 'COMPLETED_MOCK',
      uploadedMetadata: { title, description, tags: normalizedTags },
      thumbnailAttached: Boolean(thumbnailUrl || options.thumbnailBuffer || options.thumbnailFilePath),
      thumbnailUploaded: Boolean(thumbnailUrl || options.thumbnailBuffer || options.thumbnailFilePath),
      message: 'Video successfully uploaded (Mock Mode)'
    };
  }

  // --- LIVE YOUTUBE API UPLOAD ---
  try {
    // Validate credentials
    if (!config.YOUTUBE_REFRESH_TOKEN || config.YOUTUBE_REFRESH_TOKEN.startsWith('1//your')) {
      throw new Error('YOUTUBE_REFRESH_TOKEN no está configurado en el archivo .env');
    }
    if (!config.YOUTUBE_CLIENT_ID || !config.YOUTUBE_CLIENT_SECRET) {
      throw new Error('YOUTUBE_CLIENT_ID o YOUTUBE_CLIENT_SECRET faltan en el archivo .env');
    }

    // Validate video source
    if (!options.videoBuffer && !options.videoStream && !options.videoFilePath) {
      throw new Error('No hay archivo de video — por favor selecciona un video en el panel antes de subir');
    }

    const { google } = require('googleapis');

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      config.YOUTUBE_CLIENT_ID,
      config.YOUTUBE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: config.YOUTUBE_REFRESH_TOKEN });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    if (onProgress) onProgress(20, 'METADATA_PREPARED');

    // Build the video media stream
    let videoBody: Readable | null = null;
    if (options.videoBuffer) {
      videoBody = bufferToStream(options.videoBuffer);
    } else if (options.videoStream) {
      videoBody = options.videoStream;
    } else if (options.videoFilePath) {
      const fs = require('fs');
      videoBody = fs.createReadStream(options.videoFilePath);
    }

    if (!videoBody) {
      throw new Error('No se pudo construir el stream del video');
    }

    if (onProgress) onProgress(40, 'UPLOADING_VIDEO');
    console.log(`[YouTube API] Iniciando subida real del video: "${title}"`);

    // Step 1: Upload video
    const insertResponse = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title,
          description,
          tags: normalizedTags,
          categoryId: '22'
        },
        status: { privacyStatus }
      },
      media: { body: videoBody }
    });

    const liveVideoId = insertResponse.data.id;
    const youtubeUrl = `https://www.youtube.com/watch?v=${liveVideoId}`;
    console.log(`[YouTube API] Video subido! ID: ${liveVideoId}`);

    if (onProgress) onProgress(80, 'SETTING_THUMBNAIL');

    // Step 2: Set thumbnail if provided
    let thumbnailUploaded = false;
    const thumbSource = options.thumbnailBuffer || options.thumbnailStream;
    if (thumbSource) {
      try {
        const thumbBody = options.thumbnailBuffer ? bufferToStream(options.thumbnailBuffer) : options.thumbnailStream;
        await youtube.thumbnails.set({
          videoId: liveVideoId,
          media: { body: thumbBody }
        });
        thumbnailUploaded = true;
        console.log(`[YouTube API] Miniatura asignada al video ${liveVideoId}`);
      } catch (thumbErr: any) {
        console.warn('⚠️ No se pudo asignar miniatura:', thumbErr.message);
      }
    }

    if (onProgress) onProgress(100, 'COMPLETED');

    return {
      success: true,
      isMock: false,
      videoId: liveVideoId,
      youtubeUrl,
      status: 'COMPLETED',
      uploadedMetadata: { title, description, tags: normalizedTags },
      thumbnailAttached: Boolean(thumbSource),
      thumbnailUploaded,
      message: '¡Video subido exitosamente a YouTube!'
    };

  } catch (err: any) {
    console.error('[YouTube Upload Error]', err.message);
    return {
      success: false,
      isMock: false,
      videoId: '',
      youtubeUrl: '',
      status: 'FAILED',
      error: err.message || 'YouTube API upload failed'
    };
  }
}
