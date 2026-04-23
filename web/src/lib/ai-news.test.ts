import { describe, expect, it } from 'vitest';

import { buildSummaryEmailDraft, summaryPageHref, type AiNewsItem } from './ai-news';

describe('ai-news helpers', () => {
  const sampleItem: AiNewsItem = {
    id: 'openai:1',
    source: 'openai',
    url: 'https://openai.com/index/example',
    publishedAt: '2026-04-22T10:00:00.000Z',
    titleEn: 'Introducing Example',
    titleZh: '发布示例',
    summaryEn: 'English summary.',
    summaryZh: '中文摘要。',
  };

  it('builds summary page href with query params', () => {
    const href = summaryPageHref(sampleItem);
    expect(href.startsWith('/ai-news/summary?')).toBe(true);
    expect(href).toContain('source=openai');
    expect(href).toContain('itemId=openai%3A1');
  });

  it('builds summary email draft from markdown', () => {
    const draft = buildSummaryEmailDraft({
      titleZh: sampleItem.titleZh,
      titleEn: sampleItem.titleEn,
      url: sampleItem.url,
      summaryMarkdown: '## 关键要点\n- 要点A\n- 要点B',
    });

    expect(draft.subject).toContain('发布示例');
    expect(draft.html).toContain('AI 文章总结');
    expect(draft.text).toContain('关键要点');
  });
});
