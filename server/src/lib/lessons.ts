import { convertToModelMessages, generateText, streamText, type UIMessage } from 'ai';
import { z } from 'zod';

import { createAgent } from './agents.js';
import {
  ensureProviderConfigured,
  getDefaultProvider,
  getLanguageModel,
  getProviderDisplayName,
  type ProviderId,
} from './provider.js';
import {
  lessonInputSchema,
  productAnalysisSchema,
  refinedGoalSchema,
  studyPlanSchema,
} from './schemas.js';
import { sharedTools } from './tools.js';

type LessonHandler =
  | {
      type: 'json';
      run: (input: unknown) => Promise<unknown>;
    }
  | {
      type: 'text-stream';
      run: (input: unknown) => Promise<ReturnType<typeof streamText>>;
    };

function resolveProvider(inputProvider?: ProviderId): ProviderId {
  return inputProvider ?? getDefaultProvider();
}

function extractFirstJsonObject(raw: string): unknown {
  const trimmed = raw.trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return JSON.parse(trimmed);
  }

  const codeFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeFenceMatch?.[1]) {
    const fenced = codeFenceMatch[1].trim();
    if (fenced.startsWith('{') && fenced.endsWith('}')) {
      return JSON.parse(fenced);
    }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  }

  throw new Error('No JSON object found in model response.');
}

async function generateStructuredWithFallback<T>(params: {
  model: ReturnType<typeof getLanguageModel>['model'];
  schema: z.ZodSchema<T>;
  prompt: string;
  requiredTopLevelKeys: string[];
  providerOptions?: ReturnType<typeof getLanguageModel>['providerOptions'];
}) {
  const strictPrompt = `${params.prompt}

Important:
- Return JSON only.
- Do not wrap in markdown.
- Top-level keys must include exactly: ${params.requiredTopLevelKeys.join(', ')}.`;

  try {
    const first = await generateText({
      model: params.model,
      providerOptions: params.providerOptions,
      prompt: strictPrompt,
    });

    const parsed = extractFirstJsonObject(first.text);
    return params.schema.parse(parsed);
  } catch {
    const repaired = await generateText({
      model: params.model,
      providerOptions: params.providerOptions,
      prompt: `${strictPrompt}

Return a valid JSON object that strictly matches the required schema keys.
Use concise values and avoid trailing commas.`,
    });

    const parsed = extractFirstJsonObject(repaired.text);
    return params.schema.parse(parsed);
  }
}

export const lessonCatalog: Record<string, LessonHandler> = {
  'lesson-1': {
    type: 'json',
    async run(input) {
      const parsed = lessonInputSchema.parse(input);
      const provider = resolveProvider(parsed.provider);
      const providerError = ensureProviderConfigured(provider);
      if (providerError) {
        return { error: providerError };
      }

      const { model } = getLanguageModel({ provider });
      const output = await generateStructuredWithFallback({
        model,
        schema: refinedGoalSchema,
        requiredTopLevelKeys: ['clarifiedGoal', 'whyItMatters', 'firstAction'],
        prompt: `Respond in Chinese.
Rewrite this learning goal into a clearer target and provide why it matters and the first action:
${parsed.prompt}`,
      });

      return {
        provider,
        providerLabel: getProviderDisplayName(provider),
        lesson: 'provider-and-first-call',
        output,
      };
    },
  },
  'lesson-2': {
    type: 'text-stream',
    async run(input) {
      const parsed = lessonInputSchema.parse(input);
      const provider = resolveProvider(parsed.provider);
      const providerError = ensureProviderConfigured(provider);
      if (providerError) {
        throw new Error(providerError);
      }

      const { model } = getLanguageModel({ provider });
      return streamText({
        model,
        prompt: `Respond in Chinese.
Give 5 practical learning suggestions for this goal:
${parsed.prompt}`,
      });
    },
  },
  'lesson-3': {
    type: 'json',
    async run(input) {
      const parsed = lessonInputSchema.parse(input);
      const provider = resolveProvider(parsed.provider);
      const providerError = ensureProviderConfigured(provider);
      if (providerError) {
        return { error: providerError };
      }

      const { model } = getLanguageModel({ provider });
      const output = await generateStructuredWithFallback({
        model,
        schema: studyPlanSchema,
        requiredTopLevelKeys: ['goal', 'timeframe', 'phases', 'dailyTasks', 'risks', 'nextAction'],
        prompt: `Respond in Chinese.
Create a practical study plan.
Goal: ${parsed.prompt}
Minutes per day: ${parsed.minutesPerDay ?? 90}
Days available: ${parsed.daysAvailable ?? 7}`,
      });

      return {
        provider,
        providerLabel: getProviderDisplayName(provider),
        output,
      };
    },
  },
  'lesson-4': {
    type: 'json',
    async run(input) {
      const parsed = lessonInputSchema.parse(input);
      const provider = resolveProvider(parsed.provider);
      const providerError = ensureProviderConfigured(provider);
      if (providerError) {
        return { error: providerError };
      }

      const { model } = getLanguageModel({ provider });
      const result = await generateText({
        model,
        tools: sharedTools,
        prompt: `Respond in Chinese.
Use tools first to estimate study load, then provide stage suggestions.
Goal: ${parsed.prompt}
Minutes per day: ${parsed.minutesPerDay ?? 120}
Days available: ${parsed.daysAvailable ?? 21}`,
      });

      return {
        provider,
        providerLabel: getProviderDisplayName(provider),
        text: result.text,
        steps: result.steps.length,
      };
    },
  },
  'lesson-5': {
    type: 'json',
    async run(input) {
      const parsed = lessonInputSchema.parse(input);
      const provider = resolveProvider(parsed.provider);
      const providerError = ensureProviderConfigured(provider);
      if (providerError) {
        return { error: providerError };
      }

      const agent = createAgent('coach', provider);
      const result = await agent.generate({
        prompt: `Please respond in Chinese and build an actionable study path.
Goal: ${parsed.prompt}
Minutes per day: ${parsed.minutesPerDay ?? 90}
Days available: ${parsed.daysAvailable ?? 14}`,
      });

      return {
        provider,
        providerLabel: getProviderDisplayName(provider),
        text: result.text,
        steps: result.steps.length,
      };
    },
  },
  'lesson-8': {
    type: 'json',
    async run(input) {
      const parsed = lessonInputSchema.parse(input);
      const provider = resolveProvider(parsed.provider);
      const providerError = ensureProviderConfigured(provider);
      if (providerError) {
        return { error: providerError };
      }

      const { model, providerOptions } = getLanguageModel({
        provider,
        thinking: true,
      });

      const output = await generateStructuredWithFallback({
        model,
        providerOptions,
        schema: productAnalysisSchema,
        requiredTopLevelKeys: [
          'projectName',
          'targetUsers',
          'problemStatement',
          'coreFlow',
          'prdOutline',
          'apiEndpoints',
          'tasks',
        ],
        prompt: `Respond in Chinese.
Use tool results where helpful.
Turn this product idea into PRD outline, API suggestions and task breakdown:
${parsed.prompt}`,
      });

      return {
        provider,
        providerLabel: getProviderDisplayName(provider),
        output,
      };
    },
  },
};

export async function streamAgentMessages(options: {
  agentId: 'coach' | 'analyst';
  messages: UIMessage[];
  provider?: ProviderId;
}) {
  const provider = resolveProvider(options.provider);
  const providerError = ensureProviderConfigured(provider);
  if (providerError) {
    throw new Error(providerError);
  }

  const agent = createAgent(options.agentId, provider);
  return agent.stream({
    messages: await convertToModelMessages(options.messages),
  });
}
