import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createAnthropic } from '@ai-sdk/anthropic';

import { env } from '../config/env.js';

export type ProviderId = 'qwen' | 'deepseek' | 'claude';

const qwen = createOpenAICompatible({
  name: 'qwen-compatible',
  apiKey: env.QWEN_API_KEY,
  baseURL: env.QWEN_BASE_URL,
});

const deepseek = createOpenAICompatible({
  name: 'deepseek-compatible',
  apiKey: env.DEEPSEEK_API_KEY,
  baseURL: env.DEEPSEEK_BASE_URL,
});

const claude = createAnthropic({
  apiKey: env.CLAUDE_API_KEY,
  ...(env.CLAUDE_BASE_URL ? { baseURL: env.CLAUDE_BASE_URL } : {}),
});

export function getDefaultProvider(): ProviderId {
  return env.AI_PROVIDER;
}

export function getProviderDisplayName(provider: ProviderId): string {
  if (provider === 'claude') return 'Claude (Anthropic)';
  return provider === 'qwen' ? 'Qwen (OpenAI Compatible)' : 'DeepSeek (OpenAI Compatible)';
}

export function getLanguageModel(options?: { provider?: ProviderId; thinking?: boolean }) {
  const provider = options?.provider ?? getDefaultProvider();

  if (provider === 'deepseek') {
    return {
      model: deepseek(env.DEEPSEEK_MODEL_NAME),
      providerOptions: undefined,
    };
  }

  if (provider === 'claude') {
    return {
      model: claude(env.CLAUDE_MODEL_NAME),
      providerOptions: undefined,
    };
  }

  return {
    model: qwen(env.QWEN_MODEL_NAME),
    providerOptions: undefined,
  };
}

export function ensureProviderConfigured(provider: ProviderId): string | null {
  if (provider === 'qwen' && !env.QWEN_API_KEY) {
    return 'Missing QWEN_API_KEY. Please set key, baseUrl and modelName in the root .env file.';
  }

  if (provider === 'deepseek' && !env.DEEPSEEK_API_KEY) {
    return 'Missing DEEPSEEK_API_KEY. Please set key, baseUrl and modelName in the root .env file.';
  }

  if (provider === 'claude' && !env.CLAUDE_API_KEY) {
    return 'Missing CLAUDE_API_KEY. Please set key and modelName in the root .env file.';
  }

  return null;
}
