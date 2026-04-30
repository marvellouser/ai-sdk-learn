import { Router } from 'express';

import { analyzeVideoUrl, streamVideoAiAnalysis } from '../lib/video-analysis.js';
import { videoAiAnalysisBodySchema, videoMetadataBodySchema } from '../lib/schemas.js';

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
