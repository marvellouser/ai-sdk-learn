import cors from 'cors';
import express from 'express';

import { agentsRouter } from './routes/agents.js';
import { aiNewsRouter } from './routes/ai-news.js';
import { healthRouter } from './routes/health.js';
import { lessonsRouter } from './routes/lessons.js';
import { mediaCopyRouter } from './routes/media-copy.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', healthRouter);
  app.use('/api', lessonsRouter);
  app.use('/api', agentsRouter);
  app.use('/api', mediaCopyRouter);
  app.use('/api', aiNewsRouter);

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : '服务端发生未知错误';
    res.status(500).json({ error: message });
  });

  return app;
}
