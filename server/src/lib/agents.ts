import { ToolLoopAgent, stepCountIs } from 'ai';

import { getLanguageModel, type ProviderId } from './provider.js';
import { sharedTools } from './tools.js';

export type AgentId = 'coach' | 'analyst';

const coachInstructions = `
You are an AI SDK learning coach.
Turn a vague learning goal into a practical learning path.
Use tools first when you need to estimate study load or split stages.
Always respond in Chinese with concise and actionable suggestions.
`;

const analystInstructions = `
You are a product requirement analyst agent.
Turn product ideas into practical MVP scope, API outlines, and tasks.
Use tools when drafting endpoints or prioritizing backlog items.
Always respond in Chinese and stay specific.
`;

export function createAgent(agentId: AgentId, provider?: ProviderId) {
  const { model, providerOptions } = getLanguageModel({
    provider,
    thinking: agentId === 'analyst',
  });

  const instructions = agentId === 'coach' ? coachInstructions : analystInstructions;

  return new ToolLoopAgent({
    model,
    instructions,
    tools: sharedTools,
    stopWhen: stepCountIs(agentId === 'coach' ? 5 : 6),
    providerOptions,
    prepareStep: ({ stepNumber }) => {
      if (stepNumber === 0 && agentId === 'coach') {
        return {
          activeTools: ['estimateStudyLoad', 'buildStageTemplate'],
        };
      }

      if (stepNumber === 0 && agentId === 'analyst') {
        return {
          activeTools: ['draftApiSurface', 'prioritizeBacklog'],
        };
      }

      return {};
    },
  });
}
