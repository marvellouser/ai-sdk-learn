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
  CLAUDE_API_KEY: z.string().min(1).optional(),
  CLAUDE_BASE_URL: z.string().url().optional(),
  CLAUDE_MODEL_NAME: z.string().min(1),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_SECURE: z
    .preprocess(value => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1') return true;
        if (normalized === 'false' || normalized === '0') return false;
      }
      return value;
    }, z.boolean())
    .optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_FROM: z.string().min(1).optional(),
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
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
  CLAUDE_BASE_URL: process.env.CLAUDE_BASE_URL || undefined,
  CLAUDE_MODEL_NAME: process.env.CLAUDE_MODEL_NAME ?? 'claude-opus-4-7',
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,
  AI_PROVIDER: process.env.AI_PROVIDER === 'alibaba' ? 'qwen' : process.env.AI_PROVIDER,
  SERVER_PORT: process.env.SERVER_PORT,
};

export const env = envSchema.parse(normalizedEnv);
