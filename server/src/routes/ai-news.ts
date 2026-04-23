import { Router } from 'express';

import { getAiNewsFeed, sendAiNewsEmailWithModel, streamAiNewsSummary } from '../lib/ai-news.js';
import { aiNewsEmailBodySchema, aiSummaryBodySchema } from '../lib/schemas.js';

export const aiNewsRouter = Router();

aiNewsRouter.get('/ai-news/feed', async (_req, res, next) => {
  try {
    const payload = await getAiNewsFeed();
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

aiNewsRouter.post('/ai-news/summary/stream', async (req, res, next) => {
  try {
    const parsed = aiSummaryBodySchema.parse(req.body);
    const stream = await streamAiNewsSummary(parsed);
    stream.pipeTextStreamToResponse(res);
  } catch (error) {
    next(error);
  }
});

aiNewsRouter.post('/ai-news/email/send', async (req, res, next) => {
  try {
    const parsed = aiNewsEmailBodySchema.parse(req.body);
    const result = await sendAiNewsEmailWithModel({
      toEmail: parsed.toEmail,
      draft: parsed.draft,
      context: parsed.context,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});
