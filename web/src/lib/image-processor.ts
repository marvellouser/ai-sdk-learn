import { apiUrl, getErrorMessage, requestBlob } from './api';

export type ImageOutputFormat = 'png' | 'jpeg' | 'webp' | 'avif';
export type ResizeMode = 'none' | 'percent' | 'maxWidth' | 'maxHeight';
export type RotateAngle = '0' | '90' | '180' | '270';

export type ImageProcessOptions = {
  format: ImageOutputFormat;
  quality: number;
  resizeMode: ResizeMode;
  resizeValue?: number;
  stripMetadata?: boolean;
  progressive?: boolean;
  rotate?: RotateAngle;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  targetSizeBytes?: number;
};

export const TARGET_SIZE_SUPPORTED_FORMATS: readonly ImageOutputFormat[] = ['jpeg', 'webp', 'avif'];

export function supportsTargetSize(format: ImageOutputFormat): boolean {
  return TARGET_SIZE_SUPPORTED_FORMATS.includes(format);
}

export type ProcessImageResponse = {
  blob: Blob;
  format: ImageOutputFormat;
  width: number;
  height: number;
  size: number;
  originalSize: number;
  qualityUsed: number;
};

export const SUPPORTED_INPUT_MIMES: readonly string[] = ['image/png', 'image/jpeg', 'image/webp'];
export const SUPPORTED_INPUT_ACCEPT = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';
export const MAX_INPUT_BYTES = 20 * 1024 * 1024;

export function isSupportedImageFile(file: File): boolean {
  if (SUPPORTED_INPUT_MIMES.includes(file.type)) return true;
  const lower = file.name.toLowerCase();
  return /\.(png|jpe?g|webp)$/.test(lower);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function compressionRatio(original: number, output: number): number {
  if (original <= 0) return 0;
  return Math.round((1 - output / original) * 1000) / 10;
}

export function extensionForFormat(format: ImageOutputFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
}

export async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function buildFormData(file: File, options: ImageProcessOptions): FormData {
  const formData = new FormData();
  formData.append('file', file);

  const fields: [string, unknown][] = [
    ['format', options.format],
    ['quality', options.quality],
    ['resizeMode', options.resizeMode],
    ['resizeValue', options.resizeValue],
    ['stripMetadata', options.stripMetadata],
    ['progressive', options.progressive],
    ['rotate', options.rotate],
    ['flipHorizontal', options.flipHorizontal],
    ['flipVertical', options.flipVertical],
    ['targetSizeBytes', options.targetSizeBytes],
  ];
  for (const [key, value] of fields) {
    if (value !== undefined) {
      formData.append(key, String(value));
    }
  }
  return formData;
}

export async function processImage(
  file: File,
  options: ImageProcessOptions,
): Promise<ProcessImageResponse> {
  const { blob, headers } = await requestBlob('/api/image/process', buildFormData(file, options));
  return {
    blob,
    format: options.format,
    width: Number(headers.get('X-Output-Width') ?? 0),
    height: Number(headers.get('X-Output-Height') ?? 0),
    size: Number(headers.get('X-Output-Size') ?? blob.size),
    originalSize: Number(headers.get('X-Original-Size') ?? file.size),
    qualityUsed: Number(headers.get('X-Quality-Used') ?? options.quality),
  };
}

export type EstimateImageResponse = {
  size: number;
  width: number;
  height: number;
  originalSize: number;
  format: ImageOutputFormat;
  qualityUsed: number;
};

export async function estimateImageSize(
  file: File,
  options: ImageProcessOptions,
  signal?: AbortSignal,
): Promise<EstimateImageResponse> {
  const response = await fetch(apiUrl('/api/image/estimate'), {
    method: 'POST',
    body: buildFormData(file, options),
    signal,
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
  return (await response.json()) as EstimateImageResponse;
}
