import { Router } from 'express';

import { lessonCatalog } from '../lib/lessons.js';

export const lessonsRouter = Router();

lessonsRouter.post('/lessons/:lessonId', async (req, res, next) => {
  try {
    const lesson = lessonCatalog[req.params.lessonId];

    if (!lesson) {
      res.status(404).json({ error: '未找到对应 lesson' });
      return;
    }

    if (lesson.type === 'text-stream') {
      const result = await lesson.run(req.body);
      result.pipeTextStreamToResponse(res);
      return;
    }

    const result = await lesson.run(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
