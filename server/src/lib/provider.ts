import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

import { env } from '../config/env.js';

export type ProviderId = 'qwen' | 'deepseek';

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

export function getDefaultProvider(): ProviderId {
  return env.AI_PROVIDER;
}

export function getProviderDisplayName(provider: ProviderId): string {
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

  return null;
}
