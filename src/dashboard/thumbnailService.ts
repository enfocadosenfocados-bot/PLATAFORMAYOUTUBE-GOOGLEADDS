import * as zlib from 'zlib';

export interface ThumbnailOptions {
  titleText: string;
  styleTheme?: 'glassmorphic' | 'luxury_gold' | 'modern' | string;
  width?: number;
  height?: number;
  badgeText?: string;
}

export interface ThumbnailResponse {
  success: boolean;
  width: number;
  height: number;
  styleTheme: string;
  titleText: string;
  buffer: Buffer;
  dataUrl: string;
  thumbnailUrl: string;
}

// Pre-computed CRC32 table for PNG chunk checksum calculation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crcBuf]);
}

/**
 * Renders a genuine 1280x720 PNG thumbnail buffer with dark aquamarine / gold luxury gradient and border.
 */
export function renderPngThumbnail(width: number, height: number, styleTheme: string, titleText: string): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 2; // RGB color type
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw uncompressed scanlines: Filter byte (0) + width * 3 bytes RGB per row
  const rowBytes = 1 + width * 3;
  const rawData = Buffer.alloc(height * rowBytes);

  const isGoldTheme = styleTheme === 'luxury_gold';

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None

    const t = y / height;
    const isBorder = (y < 16 || y >= height - 16);

    for (let x = 0; x < width; x++) {
      const isSideBorder = (x < 16 || x >= width - 16);
      const pixelOffset = rowOffset + 1 + x * 3;

      if (isBorder || isSideBorder) {
        // Metallic Gold Border: #D4AF37 (R: 212, G: 175, B: 55)
        rawData[pixelOffset] = 212;
        rawData[pixelOffset + 1] = 175;
        rawData[pixelOffset + 2] = 55;
      } else if (isGoldTheme) {
        // Luxury Gold Theme: Deep warm obsidian gradient
        const r = Math.floor(60 * (1 - t) + 15 * t);
        const g = Math.floor(45 * (1 - t) + 10 * t);
        const b = Math.floor(15 * (1 - t) + 5 * t);
        rawData[pixelOffset] = r;
        rawData[pixelOffset + 1] = g;
        rawData[pixelOffset + 2] = b;
      } else {
        // Deep Aquamarine Luxury Theme: #004B5A -> #050E14
        const r = Math.floor(0 * (1 - t) + 5 * t);
        const g = Math.floor(75 * (1 - t) + 14 * t);
        const b = Math.floor(90 * (1 - t) + 20 * t);
        rawData[pixelOffset] = r;
        rawData[pixelOffset + 1] = g;
        rawData[pixelOffset + 2] = b;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);

  // tEXt Chunk: Embed title text in PNG metadata
  const textPayload = Buffer.from(`Title\0${titleText.slice(0, 250)}`, 'utf-8');
  const textChunk = makeChunk('tEXt', textPayload);

  // IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, textChunk, idatChunk, iendChunk]);
}

/**
 * Generates a 1280x720 high-contrast luxury branded thumbnail for YouTube uploads.
 */
export async function generateThumbnail(options: ThumbnailOptions): Promise<ThumbnailResponse> {
  const width = options.width || 1280;
  const height = options.height || 720;
  const styleTheme = options.styleTheme || 'glassmorphic';
  const titleText = options.titleText || 'Aguamarina Joyería';

  const buffer = renderPngThumbnail(width, height, styleTheme, titleText);
  const base64 = buffer.toString('base64');
  const dataUrl = `data:image/png;base64,${base64}`;
  const timestamp = Date.now();
  const thumbnailUrl = `/thumbnails/thumb_${timestamp}.png`;

  return {
    success: true,
    width,
    height,
    styleTheme,
    titleText,
    buffer,
    dataUrl,
    thumbnailUrl
  };
}
