import { describe, expect, it } from 'vitest';

import {
  buildAiNewsListEmailDraft,
  getAiNewsWindow,
  isAllowedAiNewsUrl,
  parseAnthropicNewsPage,
  parseOpenAiRssFeed,
  parseSamAltmanAtomFeed,
  type AiNewsItem,
} from './ai-news.js';

describe('ai-news parsing', () => {
  const window = getAiNewsWindow(new Date('2026-04-23T10:00:00.000Z'));

  it('parses OpenAI RSS and filters by 30-day window', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title><![CDATA[Recent Post]]></title>
        <description><![CDATA[Recent summary]]></description>
        <link>https://openai.com/index/recent-post</link>
        <pubDate>Wed, 22 Apr 2026 10:00:00 GMT</pubDate>
      </item>
      <item>
        <title><![CDATA[Old Post]]></title>
        <description><![CDATA[Old summary]]></description>
        <link>https://openai.com/index/old-post</link>
        <pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;

    const result = parseOpenAiRssFeed(xml, window, 3);
    expect(result).toHaveLength(1);
    expect(result[0]?.titleEn).toBe('Recent Post');
    expect(result[0]?.source).toBe('openai');
  });

  it('parses Anthropic publication list entries', () => {
    const html = `
      <a href="/news/claude-design-anthropic-labs" class="PublicationList-module-scss-module__KxYrHG__listItem">
        <time class="PublicationList-module-scss-module__KxYrHG__date body-3">Apr 17, 2026</time>
        <h3 class="headline-6">Introducing Claude Design by Anthropic Labs</h3>
      </a>
      <a href="/news/old-news" class="PublicationList-module-scss-module__KxYrHG__listItem">
        <time class="PublicationList-module-scss-module__KxYrHG__date body-3">Jan 01, 2024</time>
        <h3 class="headline-6">Old News</h3>
      </a>
    `;

    const result = parseAnthropicNewsPage(html, window, 3);
    expect(result).toHaveLength(1);
    expect(result[0]?.url).toContain('/news/claude-design-anthropic-labs');
    expect(result[0]?.source).toBe('anthropic');
  });

  it('parses Sam Altman atom feed and keeps items in range', () => {
    const atom = `
      <feed>
        <entry>
          <published>2026-04-10T22:55:13Z</published>
          <link rel="alternate" type="text/html" href="https://blog.samaltman.com/2279512" />
          <title>-</title>
          <content type="html"><![CDATA[<p>Hello world from Sam Altman blog.</p>]]></content>
        </entry>
        <entry>
          <published>2024-01-01T00:00:00Z</published>
          <link rel="alternate" type="text/html" href="https://blog.samaltman.com/old" />
          <title>Old</title>
          <content type="html"><![CDATA[<p>Old content.</p>]]></content>
        </entry>
      </feed>
    `;

    const result = parseSamAltmanAtomFeed(atom, window, 3);
    expect(result).toHaveLength(1);
    expect(result[0]?.url).toBe('https://blog.samaltman.com/2279512');
    expect(result[0]?.source).toBe('altmanBlog');
  });
});

describe('ai-news utilities', () => {
  it('validates url host whitelist', () => {
    expect(isAllowedAiNewsUrl('https://openai.com/index/example')).toBe(true);
    expect(isAllowedAiNewsUrl('https://www.anthropic.com/news/example')).toBe(true);
    expect(isAllowedAiNewsUrl('https://blog.samaltman.com/post')).toBe(true);
    expect(isAllowedAiNewsUrl('https://example.com/post')).toBe(false);
    expect(isAllowedAiNewsUrl('http://openai.com/index/example')).toBe(false);
  });

  it('builds list email draft with grouped items', () => {
    const sample: AiNewsItem = {
      id: 'openai:1',
      source: 'openai',
      url: 'https://openai.com/index/recent-post',
      publishedAt: '2026-04-22T10:00:00.000Z',
      titleEn: 'Recent Post',
      titleZh: '近期更新',
      summaryEn: 'Summary in English.',
      summaryZh: '中文摘要。',
    };

    const draft = buildAiNewsListEmailDraft({
      windowStart: '2026-03-24',
      windowEnd: '2026-04-23',
      itemsBySource: {
        openai: [sample],
        anthropic: [],
        altmanBlog: [],
      },
    });

    expect(draft.subject).toContain('2026-03-24');
    expect(draft.html).toContain('AI 资讯速览');
    expect(draft.text).toContain('Recent Post');
  });

  it('escapes dynamic html fields and blocks unsafe links in list email draft', () => {
    const sample: AiNewsItem = {
      id: 'openai:danger',
      source: 'openai',
      url: 'javascript:alert(1)',
      publishedAt: '2026-04-22T10:00:00.000Z',
      titleEn: '<img src=x onerror=1>',
      titleZh: '<script>alert(1)</script>中文标题',
      summaryEn: 'English <b>summary</b>',
      summaryZh: '中文摘要 <a href="javascript:alert(1)">点击</a>',
    };

    const draft = buildAiNewsListEmailDraft({
      windowStart: '2026-03-24',
      windowEnd: '2026-04-23',
      itemsBySource: {
        openai: [sample],
        anthropic: [],
        altmanBlog: [],
      },
    });

    expect(draft.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;中文标题');
    expect(draft.html).toContain('&lt;img src=x onerror=1&gt;');
    expect(draft.html).toContain('原文链接不可用');
    expect(draft.html).not.toContain('href="javascript:alert(1)');
    expect(draft.text).toContain('（原文链接不可用）');
  });
});
