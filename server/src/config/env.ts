import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env'), override: false });

const envSchema = z.object({
  QWEN_API_KEY: z.string().min(1).optional(),
  QWEN_BASE_URL: z.string().url(),
  QWEN_MODEL_NAME: z.string().min(1),
  DEEPSEEK_API_KEY: z.string().min(1).optional(),
  DEEPSEEK_BASE_URL: z.string().url(),
  DEEPSEEK_MODEL_NAME: z.string().min(1),
  AI_PROVIDER: z.enum(['qwen', 'deepseek']).default('qwen'),
  SERVER_PORT: z.coerce.number().default(8080),
});

const normalizedEnv = {
  QWEN_API_KEY: process.env.QWEN_API_KEY ?? process.env.ALIBABA_API_KEY,
  QWEN_BASE_URL:
    process.env.QWEN_BASE_URL ??
    process.env.ALIBABA_BASE_URL ??
    'https://dashscope.aliyuncs.com/compatible-mode/v1',
  QWEN_MODEL_NAME: process.env.QWEN_MODEL_NAME ?? process.env.ALIBABA_MODEL ?? 'qwen-plus',
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1',
  DEEPSEEK_MODEL_NAME: process.env.DEEPSEEK_MODEL_NAME ?? process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
  AI_PROVIDER: process.env.AI_PROVIDER === 'alibaba' ? 'qwen' : process.env.AI_PROVIDER,
  SERVER_PORT: process.env.SERVER_PORT,
};

export const env = envSchema.parse(normalizedEnv);
