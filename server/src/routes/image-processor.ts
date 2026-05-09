import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import multer, { type MulterError } from 'multer';
import { ZodError } from 'zod';

import {
  MAX_INPUT_BYTES,
  SUPPORTED_INPUT_MIMES,
  extensionForFormat,
  imageProcessOptionsSchema,
  mimeForFormat,
  processImage,
} from '../lib/image-processor.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_INPUT_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if ((SUPPORTED_INPUT_MIMES as readonly string[]).includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('UNSUPPORTED_MIME'));
  },
});

function handleUploadError(err: unknown, res: Response): boolean {
  if (!err) return false;
  const isMulter = (e: unknown): e is MulterError =>
    typeof e === 'object' && e !== null && 'code' in e && 'name' in e && (e as { name?: string }).name === 'MulterError';

  if (isMulter(err) && err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'FILE_TOO_LARGE' });
    return true;
  }
  if (err instanceof Error && err.message === 'UNSUPPORTED_MIME') {
    res.status(415).json({ error: 'UNSUPPORTED_MIME' });
    return true;
  }
  return false;
}

function handleProcessingError(error: unknown, res: Response, next: NextFunction): boolean {
  if (error instanceof ZodError) {
    res.status(400).json({ error: 'INVALID_PARAMS', details: error.issues });
    return true;
  }
  if (error instanceof Error && error.message === 'CORRUPT_OR_UNSUPPORTED_IMAGE') {
    res.status(400).json({ error: 'CORRUPT_OR_UNSUPPORTED_IMAGE' });
    return true;
  }
  if (error instanceof Error && error.message === 'TARGET_SIZE_UNSUPPORTED_FORMAT') {
    res.status(400).json({ error: 'TARGET_SIZE_UNSUPPORTED_FORMAT' });
    return true;
  }
  next(error);
  return true;
}

async function runUploadedImageProcess(req: Request, res: Response) {
  if (!req.file) {
    res.status(400).json({ error: 'NO_FILE' });
    return null;
  }
  const parsed = imageProcessOptionsSchema.parse(req.body);
  const result = await processImage(req.file.buffer, parsed);
  return { result, originalSize: req.file.size, qualityUsed: result.qualityUsed ?? parsed.quality };
}

async function handleImageProcess(req: Request, res: Response, next: NextFunction) {
  try {
    const out = await runUploadedImageProcess(req, res);
    if (!out) return;
    const { result, originalSize, qualityUsed } = out;
    const ext = extensionForFormat(result.format);

    res
      .status(200)
      .set({
        'Content-Type': mimeForFormat(result.format),
        'Content-Length': String(result.size),
        'Content-Disposition': `attachment; filename="processed.${ext}"`,
        'X-Original-Size': String(originalSize),
        'X-Output-Size': String(result.size),
        'X-Output-Width': String(result.width),
        'X-Output-Height': String(result.height),
        'X-Quality-Used': String(qualityUsed),
        'Access-Control-Expose-Headers':
          'X-Original-Size,X-Output-Size,X-Output-Width,X-Output-Height,X-Quality-Used',
      })
      .send(result.buffer);
  } catch (error) {
    handleProcessingError(error, res, next);
  }
}

async function handleImageEstimate(req: Request, res: Response, next: NextFunction) {
  try {
    const out = await runUploadedImageProcess(req, res);
    if (!out) return;
    const { result, originalSize, qualityUsed } = out;

    res.status(200).json({
      size: result.size,
      width: result.width,
      height: result.height,
      originalSize,
      format: result.format,
      qualityUsed,
    });
  } catch (error) {
    handleProcessingError(error, res, next);
  }
}

export const imageProcessorRouter = Router();

imageProcessorRouter.post('/image/process', (req, res, next) => {
  upload.single('file')(req, res, err => {
    if (handleUploadError(err, res)) return;
    if (err) {
      next(err);
      return;
    }
    void handleImageProcess(req, res, next);
  });
});

imageProcessorRouter.post('/image/estimate', (req, res, next) => {
  upload.single('file')(req, res, err => {
    if (handleUploadError(err, res)) return;
    if (err) {
      next(err);
      return;
    }
    void handleImageEstimate(req, res, next);
  });
});
