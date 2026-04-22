import { Router } from 'express';
import { type UIMessage } from 'ai';

import {
  getMediaCopyHistory,
  getMediaCopyHistoryDetail,
  getStyleMemoryProfile,
  resetStyleMemory,
  streamMediaCopyMessages,
} from '../lib/media-copy.js';
import { mediaCopyChatBodySchema } from '../lib/schemas.js';

export const mediaCopyRouter = Router();

mediaCopyRouter.get('/media-copy/style-memory/:profileId', async (req, res, next) => {
  try {
    const profileId = req.params.profileId?.trim();

    if (!profileId) {
      res.status(400).json({ error: 'profileId 不能为空' });
      return;
    }

    const profile = await getStyleMemoryProfile(profileId);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

mediaCopyRouter.delete('/media-copy/style-memory/:profileId', async (req, res, next) => {
  try {
    const profileId = req.params.profileId?.trim();

    if (!profileId) {
      res.status(400).json({ error: 'profileId 不能为空' });
      return;
    }

    await resetStyleMemory(profileId);
    res.json({
      profileId,
      reset: true,
    });
  } catch (error) {
    next(error);
  }
});

mediaCopyRouter.get('/media-copy/history/:profileId', async (req, res, next) => {
  try {
    const profileId = req.params.profileId?.trim();
    if (!profileId) {
      res.status(400).json({ error: 'profileId 不能为空' });
      return;
    }

    const history = await getMediaCopyHistory(profileId);
    res.json(history);
  } catch (error) {
    next(error);
  }
});

mediaCopyRouter.get('/media-copy/history/:profileId/:recordId', async (req, res, next) => {
  try {
    const profileId = req.params.profileId?.trim();
    const recordId = req.params.recordId?.trim();
    if (!profileId || !recordId) {
      res.status(400).json({ error: 'profileId 和 recordId 不能为空' });
      return;
    }

    const record = await getMediaCopyHistoryDetail(profileId, recordId);
    if (!record) {
      res.status(404).json({ error: '未找到对应历史记录' });
      return;
    }

    res.json(record);
  } catch (error) {
    next(error);
  }
});

mediaCopyRouter.post('/media-copy/chat', async (req, res, next) => {
  try {
    const parsed = mediaCopyChatBodySchema.parse(req.body);
    const messages = parsed.messages as UIMessage[];
    const result = await streamMediaCopyMessages({
      messages,
      provider: parsed.provider ?? 'qwen',
      profileId: parsed.profileId ?? '',
      stylePreset: parsed.stylePreset,
      customStyle: parsed.customStyle,
    });

    result.pipeUIMessageStreamToResponse(res);
  } catch (error) {
    next(error);
  }
});
