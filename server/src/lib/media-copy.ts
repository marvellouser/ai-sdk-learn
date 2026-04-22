import path from 'node:path';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';

import { ensureProviderConfigured, getLanguageModel, type ProviderId } from './provider.js';

export type StylePreset = 'story' | 'professional' | 'empathetic' | 'casual';

type ToneTrend = 'expressive' | 'rational' | 'balanced';

type StyleSample = {
  createdAt: string;
  stylePreset: StylePreset;
  customStyle: string;
  toneTrend: ToneTrend;
  outputSummary: string;
};

export type MediaCopyHistoryRecord = {
  id: string;
  createdAt: string;
  stylePreset: StylePreset;
  customStyle: string;
  inputText: string;
  outputMarkdown: string;
  outputSummary: string;
};

type StyleMemoryFile = {
  profileId: string;
  samples: StyleSample[];
  historyRecords: MediaCopyHistoryRecord[];
};

export type StyleMemoryPortrait = {
  sampleCount: number;
  dominantPreset: StylePreset | null;
  topCustomKeywords: string[];
  toneTrend: ToneTrend;
  blendHint: string;
};

type MemoryStoreOptions = {
  baseDir?: string;
};

type StreamMediaCopyMessagesOptions = {
  messages: UIMessage[];
  provider: ProviderId;
  profileId: string;
  stylePreset: StylePreset;
  customStyle?: string;
};

type AppendGenerationRecordOptions = {
  profileId: string;
  stylePreset: StylePreset;
  customStyle?: string;
  inputText: string;
  modelOutput: string;
  store?: MemoryStoreOptions;
};

export type MediaCopyHistoryListItem = {
  id: string;
  createdAt: string;
  stylePreset: StylePreset;
  customStyle: string;
  inputPreview: string;
  outputSummary: string;
};

const MAX_MEMORY_SAMPLES = 20;
const MAX_HISTORY_RECORDS = 50;
const DEFAULT_MEMORY_DIR = path.resolve(process.cwd(), '.data', 'media-copy-style-memory');

const stylePresetLabels: Record<StylePreset, string> = {
  story: '故事叙述',
  professional: '专业干货',
  empathetic: '共情治愈',
  casual: '轻松口语',
};

const toneKeywords: Record<ToneTrend, string[]> = {
  expressive: ['太', '真的', '必须', '马上', '冲', '爆改', '绝了'],
  rational: ['步骤', '方法', '数据', '拆解', '建议', '重点', '首先', '其次'],
  balanced: [],
};

function getMemoryDir(options?: MemoryStoreOptions): string {
  return options?.baseDir ?? DEFAULT_MEMORY_DIR;
}

function sanitizeProfileId(profileId: string): string {
  const normalized = profileId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!normalized) {
    return 'anonymous';
  }

  return normalized.slice(0, 96);
}

function getMemoryFilePath(profileId: string, options?: MemoryStoreOptions): string {
  return path.join(getMemoryDir(options), `${sanitizeProfileId(profileId)}.json`);
}

function normalizeCustomStyle(value?: string): string {
  return (value ?? '').trim().slice(0, 240);
}

function normalizeContent(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function summarizeOutput(output: string): string {
  const compact = normalizeContent(output);
  if (compact.length <= 180) {
    return compact;
  }

  return `${compact.slice(0, 177)}...`;
}

function summarizeInput(input: string): string {
  const compact = normalizeContent(input);
  if (compact.length <= 80) {
    return compact;
  }

  return `${compact.slice(0, 77)}...`;
}

function detectToneTrend(output: string): ToneTrend {
  const normalized = normalizeContent(output);
  const expressiveScore =
    (normalized.match(/[!！]/g)?.length ?? 0) +
    toneKeywords.expressive.reduce((score, keyword) => score + (normalized.includes(keyword) ? 1 : 0), 0);
  const rationalScore = toneKeywords.rational.reduce(
    (score, keyword) => score + (normalized.includes(keyword) ? 1 : 0),
    0,
  );

  if (expressiveScore >= rationalScore + 1 && expressiveScore >= 2) {
    return 'expressive';
  }

  if (rationalScore >= expressiveScore + 1 && rationalScore >= 2) {
    return 'rational';
  }

  return 'balanced';
}

function extractKeywords(texts: string[]): string[] {
  const counter = new Map<string, number>();

  for (const text of texts) {
    const normalized = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\u4e00-\u9fff]+/gu, ' ')
      .trim();

    if (!normalized) {
      continue;
    }

    const tokens = normalized.split(/\s+/).filter(token => token.length >= 2 && token.length <= 16);

    for (const token of tokens) {
      counter.set(token, (counter.get(token) ?? 0) + 1);
    }
  }

  return [...counter.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      return a[0].localeCompare(b[0], 'zh-Hans-CN');
    })
    .slice(0, 5)
    .map(([keyword]) => keyword);
}

async function readStyleMemory(profileId: string, options?: MemoryStoreOptions): Promise<StyleMemoryFile> {
  const filePath = getMemoryFilePath(profileId, options);

  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StyleMemoryFile>;

    return {
      profileId,
      samples: Array.isArray(parsed?.samples) ? parsed.samples.slice(-MAX_MEMORY_SAMPLES) : [],
      historyRecords: Array.isArray(parsed?.historyRecords) ? parsed.historyRecords.slice(-MAX_HISTORY_RECORDS) : [],
    };
  } catch {
    return {
      profileId,
      samples: [],
      historyRecords: [],
    };
  }
}

async function writeStyleMemory(memory: StyleMemoryFile, options?: MemoryStoreOptions): Promise<void> {
  const dir = getMemoryDir(options);
  const filePath = getMemoryFilePath(memory.profileId, options);

  await mkdir(dir, { recursive: true });

  const payload: StyleMemoryFile = {
    profileId: memory.profileId,
    samples: memory.samples.slice(-MAX_MEMORY_SAMPLES),
    historyRecords: memory.historyRecords.slice(-MAX_HISTORY_RECORDS),
  };

  await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

export function buildStylePortrait(samples: StyleSample[]): StyleMemoryPortrait {
  if (samples.length === 0) {
    return {
      sampleCount: 0,
      dominantPreset: null,
      topCustomKeywords: [],
      toneTrend: 'balanced',
      blendHint: '暂无历史样本，按本次选择风格生成。',
    };
  }

  const presetCounter = new Map<StylePreset, number>();
  const toneCounter = new Map<ToneTrend, number>();
  const customStyleTexts: string[] = [];

  for (const sample of samples) {
    presetCounter.set(sample.stylePreset, (presetCounter.get(sample.stylePreset) ?? 0) + 1);
    toneCounter.set(sample.toneTrend, (toneCounter.get(sample.toneTrend) ?? 0) + 1);
    if (sample.customStyle) {
      customStyleTexts.push(sample.customStyle);
    }
  }

  const dominantPreset =
    [...presetCounter.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const toneTrend = [...toneCounter.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'balanced';
  const topCustomKeywords = extractKeywords(customStyleTexts);

  const blendHintParts = [
    dominantPreset ? `主要偏好「${stylePresetLabels[dominantPreset]}」` : null,
    topCustomKeywords.length > 0 ? `高频关键词：${topCustomKeywords.join('、')}` : null,
    `语气倾向：${toneTrend}`,
  ].filter(Boolean);

  return {
    sampleCount: samples.length,
    dominantPreset,
    topCustomKeywords,
    toneTrend,
    blendHint: blendHintParts.join('；'),
  };
}

export async function getStyleMemoryProfile(profileId: string, options?: MemoryStoreOptions) {
  const memory = await readStyleMemory(profileId, options);
  const portrait = buildStylePortrait(memory.samples);

  return {
    profileId: sanitizeProfileId(profileId),
    sampleCount: portrait.sampleCount,
    portrait,
  };
}

export async function getMediaCopyHistory(profileId: string, options?: MemoryStoreOptions) {
  const normalizedProfileId = sanitizeProfileId(profileId);
  const memory = await readStyleMemory(normalizedProfileId, options);

  const items: MediaCopyHistoryListItem[] = memory.historyRecords
    .slice()
    .reverse()
    .map(record => ({
      id: record.id,
      createdAt: record.createdAt,
      stylePreset: record.stylePreset,
      customStyle: record.customStyle,
      inputPreview: summarizeInput(record.inputText),
      outputSummary: record.outputSummary,
    }));

  return {
    profileId: normalizedProfileId,
    items,
  };
}

export async function getMediaCopyHistoryDetail(
  profileId: string,
  recordId: string,
  options?: MemoryStoreOptions,
): Promise<MediaCopyHistoryRecord | null> {
  const normalizedProfileId = sanitizeProfileId(profileId);
  const memory = await readStyleMemory(normalizedProfileId, options);

  return memory.historyRecords.find(record => record.id === recordId) ?? null;
}

export async function appendGenerationRecord(options: AppendGenerationRecordOptions): Promise<void> {
  const normalizedProfileId = sanitizeProfileId(options.profileId);
  const customStyle = normalizeCustomStyle(options.customStyle);
  const memory = await readStyleMemory(normalizedProfileId, options.store);
  const outputSummary = summarizeOutput(options.modelOutput);

  const sample: StyleSample = {
    createdAt: new Date().toISOString(),
    stylePreset: options.stylePreset,
    customStyle,
    toneTrend: detectToneTrend(options.modelOutput),
    outputSummary,
  };

  const historyRecord: MediaCopyHistoryRecord = {
    id: `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: sample.createdAt,
    stylePreset: options.stylePreset,
    customStyle,
    inputText: options.inputText.trim(),
    outputMarkdown: options.modelOutput,
    outputSummary,
  };

  memory.samples.push(sample);
  memory.historyRecords.push(historyRecord);
  await writeStyleMemory(memory, options.store);
}

export async function resetStyleMemory(profileId: string, options?: MemoryStoreOptions): Promise<void> {
  const filePath = getMemoryFilePath(profileId, options);
  await rm(filePath, { force: true });
}

function buildSystemPrompt(options: {
  stylePreset: StylePreset;
  customStyle?: string;
  portrait: StyleMemoryPortrait;
}) {
  const selectedStyle = stylePresetLabels[options.stylePreset];
  const customStyle = normalizeCustomStyle(options.customStyle);
  const portrait = options.portrait;
  const dominantStyle = portrait.dominantPreset ? stylePresetLabels[portrait.dominantPreset] : '暂无';

  return `你是一名中国自媒体内容策划助手，擅长把用户输入的想法或故事改写成“可直接发布”的平台文案。
请全程使用中文，且必须遵循固定 Markdown 结构输出。

当前风格设定：
- 本次选择风格：${selectedStyle}
- 用户自定义风格补充：${customStyle || '无'}
- 历史风格样本数：${portrait.sampleCount}
- 历史主偏好风格：${dominantStyle}
- 历史高频关键词：${portrait.topCustomKeywords.join('、') || '无'}
- 历史语气倾向：${portrait.toneTrend}
- 自动融合提示：${portrait.blendHint}

写作规则：
1. 同时输出“小红书”和“微信公众号”两套成稿，语气和结构贴合平台特性。
2. 保留用户原始内容的核心观点，不要杜撰事实数据。
3. 内容要有传播感，但避免标题党和过度承诺。
4. 当历史样本 >= 2 时，优先贴近历史风格画像。
5. 输出必须严格使用以下 Markdown 标题层级与字段，不得省略标题：

## 分析卡
### 受众洞察
- ...
### 内容策略
- ...

## 小红书卡
### 标题候选
- ...
- ...
### 正文
...
### 推荐标签
- #...
- #...
### 互动引导
...

## 公众号卡
### 标题候选
- ...
- ...
### 导语
...
### 正文
...
### 结尾引导
...
`;
}

function extractLatestUserInput(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== 'user') {
      continue;
    }

    const text = (message.parts ?? [])
      .map(part => (part.type === 'text' ? part.text : ''))
      .join('')
      .trim();

    if (text) {
      return text;
    }
  }

  return '';
}

export async function streamMediaCopyMessages(options: StreamMediaCopyMessagesOptions) {
  const providerError = ensureProviderConfigured(options.provider);
  if (providerError) {
    throw new Error(providerError);
  }

  const profileId = sanitizeProfileId(options.profileId);
  const { model, providerOptions } = getLanguageModel({
    provider: options.provider,
  });
  const memoryProfile = await getStyleMemoryProfile(profileId);
  const latestUserInput = extractLatestUserInput(options.messages);

  return streamText({
    model,
    providerOptions,
    system: buildSystemPrompt({
      stylePreset: options.stylePreset,
      customStyle: options.customStyle,
      portrait: memoryProfile.portrait,
    }),
    messages: await convertToModelMessages(options.messages),
    onFinish: async ({ text }) => {
      if (!text.trim()) {
        return;
      }

      try {
        await appendGenerationRecord({
          profileId,
          stylePreset: options.stylePreset,
          customStyle: options.customStyle,
          inputText: latestUserInput,
          modelOutput: text,
        });
      } catch {
        // Ignore memory persistence errors so streaming UX stays stable.
      }
    },
  });
}
