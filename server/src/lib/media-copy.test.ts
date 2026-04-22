import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  appendGenerationRecord,
  buildStylePortrait,
  getMediaCopyHistory,
  getMediaCopyHistoryDetail,
  getStyleMemoryProfile,
  resetStyleMemory,
} from './media-copy.js';

const tempDirs: string[] = [];

async function createStoreDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'media-copy-memory-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

describe('media copy style memory', () => {
  it('stores and reads style samples', async () => {
    const baseDir = await createStoreDir();

    await appendGenerationRecord({
      profileId: 'profile-1',
      stylePreset: 'story',
      customStyle: '第一人称 共情',
      inputText: '测试输入',
      modelOutput: '太真实了！先讲故事，再给读者具体建议。',
      store: { baseDir },
    });

    const profile = await getStyleMemoryProfile('profile-1', { baseDir });
    expect(profile.sampleCount).toBe(1);
    expect(profile.portrait.dominantPreset).toBe('story');
  });

  it('keeps only latest 20 samples', async () => {
    const baseDir = await createStoreDir();

    for (let index = 0; index < 23; index += 1) {
      await appendGenerationRecord({
        profileId: 'profile-2',
        stylePreset: index % 2 === 0 ? 'casual' : 'professional',
        customStyle: `风格${index}`,
        inputText: `第${index}次输入`,
        modelOutput: `第${index}次输出，先拆解步骤再给建议。`,
        store: { baseDir },
      });
    }

    const profile = await getStyleMemoryProfile('profile-2', { baseDir });
    expect(profile.sampleCount).toBe(20);
  });

  it('resets memory by profile', async () => {
    const baseDir = await createStoreDir();

    await appendGenerationRecord({
      profileId: 'profile-3',
      stylePreset: 'empathetic',
      customStyle: '温暖表达',
      inputText: '测试输入',
      modelOutput: '先理解读者，再给行动建议。',
      store: { baseDir },
    });

    await resetStyleMemory('profile-3', { baseDir });
    const profile = await getStyleMemoryProfile('profile-3', { baseDir });

    expect(profile.sampleCount).toBe(0);
    expect(profile.portrait.dominantPreset).toBeNull();
  });

  it('builds portrait with dominant preset and keywords', () => {
    const portrait = buildStylePortrait([
      {
        createdAt: new Date('2026-01-01').toISOString(),
        stylePreset: 'professional',
        customStyle: '结构化 实操',
        toneTrend: 'rational',
        outputSummary: 'summary-a',
      },
      {
        createdAt: new Date('2026-01-02').toISOString(),
        stylePreset: 'professional',
        customStyle: '结构化 清晰',
        toneTrend: 'rational',
        outputSummary: 'summary-b',
      },
      {
        createdAt: new Date('2026-01-03').toISOString(),
        stylePreset: 'story',
        customStyle: '第一人称',
        toneTrend: 'balanced',
        outputSummary: 'summary-c',
      },
    ]);

    expect(portrait.dominantPreset).toBe('professional');
    expect(portrait.toneTrend).toBe('rational');
    expect(portrait.topCustomKeywords).toContain('结构化');
  });

  it('stores history list and detail records', async () => {
    const baseDir = await createStoreDir();

    await appendGenerationRecord({
      profileId: 'profile-history-1',
      stylePreset: 'story',
      customStyle: '真实口语',
      inputText: '我想写一篇讲述转岗经历的内容，强调真实感。',
      modelOutput: '## 分析卡\n### 受众洞察\n- 转岗人群',
      store: { baseDir },
    });

    const list = await getMediaCopyHistory('profile-history-1', { baseDir });
    expect(list.items.length).toBe(1);
    expect(list.items[0]?.inputPreview).toContain('转岗经历');

    const detail = await getMediaCopyHistoryDetail('profile-history-1', list.items[0]!.id, { baseDir });
    expect(detail?.outputMarkdown).toContain('## 分析卡');
  });

  it('keeps only latest 50 history records', async () => {
    const baseDir = await createStoreDir();

    for (let index = 0; index < 55; index += 1) {
      await appendGenerationRecord({
        profileId: 'profile-history-2',
        stylePreset: 'casual',
        customStyle: '',
        inputText: `第${index}次输入`,
        modelOutput: `第${index}次输出`,
        store: { baseDir },
      });
    }

    const list = await getMediaCopyHistory('profile-history-2', { baseDir });
    expect(list.items.length).toBe(50);
  });
});
