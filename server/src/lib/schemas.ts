import { z } from 'zod';

const providerSchema = z.preprocess(value => (value === 'alibaba' ? 'qwen' : value), z.enum(['qwen', 'deepseek', 'claude']));

export const lessonInputSchema = z.object({
  prompt: z.string().min(3, 'Please provide a more specific prompt.'),
  provider: providerSchema.optional(),
  minutesPerDay: z.coerce.number().min(10).max(480).optional(),
  daysAvailable: z.coerce.number().min(1).max(365).optional(),
});

export const refinedGoalSchema = z.object({
  clarifiedGoal: z.string(),
  whyItMatters: z.string(),
  firstAction: z.string(),
});

export const studyPlanSchema = z.object({
  goal: z.string(),
  timeframe: z.string(),
  phases: z.array(
    z.object({
      name: z.string(),
      durationDays: z.coerce.number(),
      focus: z.string(),
      outcome: z.string(),
    }),
  ),
  dailyTasks: z.array(z.string()),
  risks: z.array(z.string()),
  nextAction: z.string(),
});

export const productAnalysisSchema = z.object({
  projectName: z.string(),
  targetUsers: z.array(z.string()),
  problemStatement: z.string(),
  coreFlow: z.array(z.string()),
  prdOutline: z.array(z.string()),
  apiEndpoints: z.array(
    z.object({
      method: z.preprocess(
        value => (typeof value === 'string' ? value.toUpperCase() : value),
        z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
      ),
      path: z.string(),
      purpose: z.string(),
    }),
  ),
  tasks: z.array(z.string()),
});

export const agentChatBodySchema = z.object({
  messages: z.array(z.any()),
  provider: providerSchema.optional(),
  context: z.record(z.string(), z.any()).optional(),
});

export const stylePresetSchema = z.enum(['story', 'professional', 'empathetic', 'casual']);

export const mediaCopyChatBodySchema = z.object({
  messages: z.array(z.any()),
  provider: providerSchema.optional(),
  profileId: z.string().trim().max(128).optional(),
  stylePreset: stylePresetSchema,
  customStyle: z.string().max(240).optional(),
});

export const aiNewsSourceSchema = z.enum(['openai', 'anthropic', 'altmanBlog']);

export const aiSummaryBodySchema = z.object({
  url: z.string().url(),
  source: aiNewsSourceSchema,
  itemId: z.string().trim().min(1),
});

export const emailDraftSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  html: z.string().trim().min(1),
  text: z.string().trim().min(1),
});

export const aiNewsEmailBodySchema = z.object({
  toEmail: z.string().trim().email(),
  draft: emailDraftSchema,
  context: z
    .object({
      kind: z.enum(['list', 'summary']),
      source: aiNewsSourceSchema.optional(),
      itemId: z.string().trim().optional(),
      url: z.string().url().optional(),
    })
    .strict(),
});

export type AiNewsSource = z.infer<typeof aiNewsSourceSchema>;
export type EmailDraft = z.infer<typeof emailDraftSchema>;
export type AiNewsEmailBody = z.infer<typeof aiNewsEmailBodySchema>;

export type StudyPlan = z.infer<typeof studyPlanSchema>;
export type ProductAnalysis = z.infer<typeof productAnalysisSchema>;
export type StylePreset = z.infer<typeof stylePresetSchema>;
