import { Router } from 'express';
import { type UIMessage } from 'ai';

import { streamAgentMessages } from '../lib/lessons.js';
import { agentChatBodySchema } from '../lib/schemas.js';
import type { AgentId } from '../lib/agents.js';

export const agentsRouter = Router();

agentsRouter.post('/agents/:agentId/chat', async (req, res, next) => {
  try {
    const agentId = req.params.agentId as AgentId;

    if (agentId !== 'coach' && agentId !== 'analyst') {
      res.status(404).json({ error: '未知 Agent' });
      return;
    }

    const parsed = agentChatBodySchema.parse(req.body);
    const messages = parsed.messages as UIMessage[];

    const result = await streamAgentMessages({
      agentId,
      messages,
      provider: parsed.provider,
    });

    result.pipeUIMessageStreamToResponse(res);
  } catch (error) {
    next(error);
  }
});
