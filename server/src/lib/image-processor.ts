import sharp from 'sharp';
import { z } from 'zod';

export const imageOutputFormatSchema = z.enum(['png', 'jpeg', 'webp', 'avif']);
export type ImageOutputFormat = z.infer<typeof imageOutputFormatSchema>;

export const resizeModeSchema = z.enum(['none', 'percent', 'maxWidth', 'maxHeight']);
export type ResizeMode = z.infer<typeof resizeModeSchema>;

export const rotateAngleSchema = z.enum(['0', '90', '180', '270']);
export type RotateAngle = z.infer<typeof rotateAngleSchema>;

const booleanFromString = z.preprocess(value => {
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1';
}, z.boolean());

export const imageProcessOptionsSchema = z
  .object({
    format: imageOutputFormatSchema,
    quality: z.coerce.number().int().min(1).max(100).default(80),
    resizeMode: resizeModeSchema.default('none'),
    resizeValue: z.coerce.number().min(1).max(8000).optional(),
    stripMetadata: booleanFromString.default(false),
    progressive: booleanFromString.default(false),
    rotate: rotateAngleSchema.default('0'),
    flipHorizontal: booleanFromString.default(false),
    flipVertical: booleanFromString.default(false),
    targetSizeBytes: z.coerce.number().int().min(1024).max(50 * 1024 * 1024).optional(),
  })
  .strict();

export type ImageProcessOptions = z.infer<typeof imageProcessOptionsSchema>;

export const SUPPORTED_INPUT_MIMES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const SUPPORTED_INPUT_FORMATS = ['png', 'jpeg', 'webp'] as const;
export const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_INPUT_PIXELS = 268_402_689;

export function mimeForFormat(format: ImageOutputFormat): string {
  switch (format) {
    case 'png':
      return 'image/png';
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'avif':
      return 'image/avif';
  }
}

export function extensionForFormat(format: ImageOutputFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
}

export type ProcessedImageResult = {
  buffer: Buffer;
  format: ImageOutputFormat;
  width: number;
  height: number;
  size: number;
  qualityUsed?: number;
};

function buildPipeline(input: Buffer, options: ImageProcessOptions, meta: sharp.Metadata): sharp.Sharp {
  let pipeline = sharp(input, { failOn: 'truncated', limitInputPixels: MAX_INPUT_PIXELS });

  if (options.stripMetadata) {
    pipeline = pipeline.rotate();
  } else {
    pipeline = pipeline.withMetadata();
  }

  const rotateAngle = Number.parseInt(options.rotate, 10);
  if (rotateAngle !== 0) {
    pipeline = pipeline.rotate(rotateAngle);
  }

  if (options.flipHorizontal) pipeline = pipeline.flop();
  if (options.flipVertical) pipeline = pipeline.flip();

  const resize = computeResizeOptions(options, meta);
  if (resize) pipeline = pipeline.resize(resize);

  switch (options.format) {
    case 'jpeg':
      pipeline = pipeline.jpeg({
        quality: options.quality,
        progressive: options.progressive,
        mozjpeg: true,
      });
      break;
    case 'png':
      pipeline = pipeline.png({
        progressive: options.progressive,
        compressionLevel: 9,
      });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality: options.quality });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality: options.quality });
      break;
  }

  return pipeline;
}

function computeResizeOptions(
  options: ImageProcessOptions,
  meta: sharp.Metadata,
): sharp.ResizeOptions | null {
  const value = options.resizeValue;
  if (!value || options.resizeMode === 'none') return null;

  switch (options.resizeMode) {
    case 'percent': {
      if (!meta.width || !meta.height) return null;
      const factor = value / 100;
      return {
        width: Math.max(1, Math.round(meta.width * factor)),
        height: Math.max(1, Math.round(meta.height * factor)),
        fit: 'fill',
      };
    }
    case 'maxWidth':
      return { width: Math.round(value), withoutEnlargement: true, fit: 'inside' };
    case 'maxHeight':
      return { height: Math.round(value), withoutEnlargement: true, fit: 'inside' };
    default:
      return null;
  }
}

export async function probeInputMetadata(input: Buffer): Promise<sharp.Metadata> {
  const meta = await sharp(input, { failOn: 'truncated', limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  if (!meta.format || !(SUPPORTED_INPUT_FORMATS as readonly string[]).includes(meta.format)) {
    throw new Error('CORRUPT_OR_UNSUPPORTED_IMAGE');
  }
  return meta;
}

async function encodeWithQuality(
  input: Buffer,
  options: ImageProcessOptions,
  meta: sharp.Metadata,
  quality: number,
): Promise<ProcessedImageResult> {
  const pipeline = buildPipeline(input, { ...options, quality }, meta);
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return {
    buffer: data,
    format: options.format,
    width: info.width,
    height: info.height,
    size: data.length,
    qualityUsed: quality,
  };
}

export const TARGET_SIZE_SUPPORTED_FORMATS = ['jpeg', 'webp', 'avif'] as const;

export function supportsTargetSize(format: ImageOutputFormat): boolean {
  return (TARGET_SIZE_SUPPORTED_FORMATS as readonly string[]).includes(format);
}

export async function processImage(
  input: Buffer,
  options: ImageProcessOptions,
): Promise<ProcessedImageResult> {
  const meta = await probeInputMetadata(input);

  if (options.targetSizeBytes !== undefined) {
    if (!supportsTargetSize(options.format)) {
      throw new Error('TARGET_SIZE_UNSUPPORTED_FORMAT');
    }
    return await searchQualityForTargetSize(input, options, meta, options.targetSizeBytes);
  }

  return await encodeWithQuality(input, options, meta, options.quality);
}

async function searchQualityForTargetSize(
  input: Buffer,
  options: ImageProcessOptions,
  meta: sharp.Metadata,
  targetBytes: number,
): Promise<ProcessedImageResult> {
  const maxResult = await encodeWithQuality(input, options, meta, 100);
  if (maxResult.size <= targetBytes) return maxResult;

  const minResult = await encodeWithQuality(input, options, meta, 1);
  if (minResult.size > targetBytes) return minResult;

  let low = 2;
  let high = 99;
  let best: ProcessedImageResult = minResult;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const result = await encodeWithQuality(input, options, meta, mid);
    if (result.size <= targetBytes) {
      best = result;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best;
}
