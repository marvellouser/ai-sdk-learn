import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Router } from 'express';
import multer, { type MulterError } from 'multer';

import { analyzeLocalVideoFile } from '../lib/local-video-analysis.js';
import { analyzeVideoUrl, streamVideoAiAnalysis } from '../lib/video-analysis.js';
import { videoAiAnalysisBodySchema, videoMetadataBodySchema } from '../lib/schemas.js';

const MAX_VIDEO_UPLOAD_BYTES = 200 * 1024 * 1024;
const ALLOWED_VIDEO_MIME_PREFIXES = ['video/'];
const ALLOWED_VIDEO_MIME_EXACT = new Set([
  'application/octet-stream',
  'application/mp4',
]);

function isAllowedVideoMime(mime: string): boolean {
  return ALLOWED_VIDEO_MIME_PREFIXES.some(prefix => mime.startsWith(prefix)) || ALLOWED_VIDEO_MIME_EXACT.has(mime);
}

const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => {
      const safeExt = path.extname(file.originalname).slice(0, 16);
      cb(null, `video-analysis-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`);
    },
  }),
  limits: { fileSize: MAX_VIDEO_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedVideoMime(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('UNSUPPORTED_VIDEO_MIME'));
  },
});

export const videoAnalysisRouter = Router();

videoAnalysisRouter.post('/video-analysis/metadata', async (req, res, next) => {
  try {
    const parsed = videoMetadataBodySchema.parse(req.body);
    const metadata = await analyzeVideoUrl(parsed.url);
    res.json(metadata);
  } catch (error) {
    next(error);
  }
});

videoAnalysisRouter.post('/video-analysis/upload', (req, res, next) => {
  videoUpload.single('file')(req, res, async err => {
    const cleanup = async () => {
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => undefined);
      }
    };

    if (err) {
      const isMulter = (e: unknown): e is MulterError =>
        typeof e === 'object' && e !== null && 'code' in e && 'name' in e && (e as { name?: string }).name === 'MulterError';

      if (isMulter(err) && err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: `视频文件超过 ${Math.round(MAX_VIDEO_UPLOAD_BYTES / 1024 / 1024)}MB 上限。` });
        return;
      }
      if (err instanceof Error && err.message === 'UNSUPPORTED_VIDEO_MIME') {
        res.status(415).json({ error: '不支持的文件类型，请上传 mp4/mov/mkv/webm 等视频格式。' });
        return;
      }
      next(err);
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: '未接收到视频文件。' });
      return;
    }

    try {
      const metadata = await analyzeLocalVideoFile({
        filePath: req.file.path,
        originalName: req.file.originalname,
        sizeBytes: req.file.size,
        mimeType: req.file.mimetype,
      });
      res.json(metadata);
    } catch (error) {
      next(error);
    } finally {
      await cleanup();
    }
  });
});

videoAnalysisRouter.post('/video-analysis/ai/stream', async (req, res, next) => {
  try {
    const parsed = videoAiAnalysisBodySchema.parse(req.body);
    const stream = await streamVideoAiAnalysis({
      video: parsed.video,
    });

    stream.pipeTextStreamToResponse(res);
  } catch (error) {
    next(error);
  }
});
