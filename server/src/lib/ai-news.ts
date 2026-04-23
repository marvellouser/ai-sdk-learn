import { generateText, streamText, tool } from 'ai';
import { z } from 'zod';

import { sendEmailWithSmtp } from './email.js';
import {
  ensureProviderConfigured,
  getDefaultProvider,
  getLanguageModel,
  type ProviderId,
} from './provider.js';
import type { AiNewsSource, EmailDraft } from './schemas.js';

const OPENAI_RSS_URL = 'https://openai.com/news/rss.xml';
const ANTHROPIC_NEWS_URL = 'https://www.anthropic.com/news';
const SAM_ALTMAN_ATOM_URL = 'https://blog.samaltman.com/posts.atom';
const DEFAULT_FETCH_TIMEOUT_MS = 20_000;
const DEFAULT_PER_SOURCE_LIMIT = 3;
const MAX_SUMMARY_INPUT_LENGTH = 15_000;

const htmlEntityMap: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
};

type NewsWindow = {
  windowStart: Date;
  windowEnd: Date;
};

type RawNewsItem = {
  id: string;
  source: AiNewsSource;
  url: string;
  publishedAt: string;
  titleEn: string;
  summaryEn: string;
};

export type AiNewsItem = {
  id: string;
  source: AiNewsSource;
  url: string;
  publishedAt: string;
  titleEn: string;
  titleZh: string;
  summaryEn: string;
  summaryZh: string;
};

export type AiNewsFeedResponse = {
  windowStart: string;
  windowEnd: string;
  generatedAt: string;
  itemsBySource: Record<AiNewsSource, AiNewsItem[]>;
  listEmailDraft: EmailDraft;
};

type SendAiNewsEmailOptions = {
  provider?: ProviderId;
  toEmail: string;
  draft: EmailDraft;
  context: {
    kind: 'list' | 'summary';
    source?: AiNewsSource;
    itemId?: string;
    url?: string;
  };
};

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z0-9]+);/g, (_match, entity) => {
      const normalized = String(entity);
      if (normalized.startsWith('#x') || normalized.startsWith('#X')) {
        const codePoint = Number.parseInt(normalized.slice(2), 16);
        return Number.isNaN(codePoint) ? _match : String.fromCodePoint(codePoint);
      }

      if (normalized.startsWith('#')) {
        const codePoint = Number.parseInt(normalized.slice(1), 10);
        return Number.isNaN(codePoint) ? _match : String.fromCodePoint(codePoint);
      }

      return htmlEntityMap[normalized] ?? _match;
    })
    .replace(/\u00a0/g, ' ');
}

function stripHtml(raw: string): string {
  const withoutTags = raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');

  return compactWhitespace(decodeHtmlEntities(withoutTags));
}

function safeDate(dateText: string): Date | null {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function getAiNewsWindow(now = new Date()): NewsWindow {
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const windowStart = new Date(todayUtc);
  windowStart.setUTCDate(windowStart.getUTCDate() - 30);

  const windowEnd = new Date(todayUtc);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);
  windowEnd.setUTCMilliseconds(windowEnd.getUTCMilliseconds() - 1);

  return {
    windowStart,
    windowEnd,
  };
}

function isInWindow(date: Date, window: NewsWindow): boolean {
  return date >= window.windowStart && date <= window.windowEnd;
}

async function fetchTextWithTimeout(url: string, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ai-sdk-learn/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function extractTagValue(block: string, tagName: string): string {
  const withCdata = new RegExp(`<${tagName}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, 'i');
  const normal = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  return decodeHtmlEntities(compactWhitespace(block.match(withCdata)?.[1] ?? block.match(normal)?.[1] ?? ''));
}

export function parseOpenAiRssFeed(xml: string, window: NewsWindow, perSourceLimit = DEFAULT_PER_SOURCE_LIMIT): RawNewsItem[] {
  const items: RawNewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const seen = new Set<string>();

  for (const match of xml.matchAll(itemRegex)) {
    const block = match[1] ?? '';
    const link = extractTagValue(block, 'link');
    const title = extractTagValue(block, 'title');
    const description = stripHtml(extractTagValue(block, 'description'));
    const pubDateRaw = extractTagValue(block, 'pubDate');
    const publishedDate = safeDate(pubDateRaw);

    if (!link || !title || !publishedDate) {
      continue;
    }
    if (!isInWindow(publishedDate, window)) {
      continue;
    }
    if (seen.has(link)) {
      continue;
    }
    seen.add(link);

    items.push({
      id: `openai:${Buffer.from(link).toString('base64url')}`,
      source: 'openai',
      url: link,
      publishedAt: publishedDate.toISOString(),
      titleEn: title,
      summaryEn: description || 'Read the official OpenAI update.',
    });
  }

  return items
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, perSourceLimit);
}

function parseHumanDate(dateText: string): Date | null {
  const normalized = compactWhitespace(dateText);
  const date = safeDate(`${normalized} UTC`);
  return date ?? safeDate(normalized);
}

function parseAnthropicAnchorEntries(html: string, classPrefix: string): RawNewsItem[] {
  const items: RawNewsItem[] = [];
  const anchorRegex = new RegExp(
    `<a href="\\/news\\/([^"]+)" class="${classPrefix}[^"]*">([\\s\\S]*?)<\\/a>`,
    'gi',
  );

  for (const match of html.matchAll(anchorRegex)) {
    const slug = match[1]?.trim();
    const block = match[2] ?? '';
    if (!slug) {
      continue;
    }

    const dateText = decodeHtmlEntities(block.match(/<time[^>]*>([\s\S]*?)<\/time>/i)?.[1] ?? '');
    const titleText =
      decodeHtmlEntities(block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? '') ||
      decodeHtmlEntities(block.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1] ?? '') ||
      decodeHtmlEntities(block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? '');
    const summaryText = stripHtml(decodeHtmlEntities(block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? ''));

    const publishedDate = parseHumanDate(dateText);
    if (!publishedDate || !titleText) {
      continue;
    }

    const url = `https://www.anthropic.com/news/${slug}`;
    items.push({
      id: `anthropic:${slug}`,
      source: 'anthropic',
      url,
      publishedAt: publishedDate.toISOString(),
      titleEn: compactWhitespace(stripHtml(titleText)),
      summaryEn: summaryText,
    });
  }

  return items;
}

export function parseAnthropicNewsPage(
  html: string,
  window: NewsWindow,
  perSourceLimit = DEFAULT_PER_SOURCE_LIMIT,
): RawNewsItem[] {
  const merged = [
    ...parseAnthropicAnchorEntries(html, 'PublicationList'),
    ...parseAnthropicAnchorEntries(html, 'FeaturedGrid'),
  ];
  const deduped: RawNewsItem[] = [];
  const seen = new Set<string>();

  for (const item of merged) {
    if (!isInWindow(new Date(item.publishedAt), window)) {
      continue;
    }
    if (seen.has(item.url)) {
      continue;
    }
    seen.add(item.url);
    deduped.push(item);
  }

  return deduped
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, perSourceLimit);
}

export function parseSamAltmanAtomFeed(
  atomXml: string,
  window: NewsWindow,
  perSourceLimit = DEFAULT_PER_SOURCE_LIMIT,
): RawNewsItem[] {
  const items: RawNewsItem[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;

  for (const match of atomXml.matchAll(entryRegex)) {
    const block = match[1] ?? '';
    const publishedRaw = decodeHtmlEntities(block.match(/<published>([\s\S]*?)<\/published>/i)?.[1] ?? '');
    const link = decodeHtmlEntities(
      block.match(/<link rel="alternate"[^>]*href="([^"]+)"[^>]*\/?>/i)?.[1] ?? '',
    );
    const titleRaw = decodeHtmlEntities(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '');
    const contentRaw = block.match(/<content[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/content>/i)?.[1] ?? '';
    const contentText = stripHtml(contentRaw);

    const publishedDate = safeDate(publishedRaw);
    if (!publishedDate || !link || !isInWindow(publishedDate, window)) {
      continue;
    }

    const titleEn =
      compactWhitespace(stripHtml(titleRaw)) && compactWhitespace(stripHtml(titleRaw)) !== '-'
        ? compactWhitespace(stripHtml(titleRaw))
        : compactWhitespace(contentText.slice(0, 80)) || 'Sam Altman blog update';
    const summaryEn =
      compactWhitespace(contentText.slice(0, 240)) ||
      'Read the latest blog update from Sam Altman.';

    items.push({
      id: `altman:${Buffer.from(link).toString('base64url')}`,
      source: 'altmanBlog',
      url: link,
      publishedAt: publishedDate.toISOString(),
      titleEn,
      summaryEn,
    });
  }

  return items
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, perSourceLimit);
}

async function fetchMetaDescription(url: string): Promise<string> {
  const html = await fetchTextWithTimeout(url);
  const description =
    html.match(/<meta name="description" content="([^"]*)"/i)?.[1] ??
    html.match(/<meta property="og:description" content="([^"]*)"/i)?.[1] ??
    '';

  return stripHtml(decodeHtmlEntities(description));
}

function ensureSummary(rawSummary: string): string {
  const normalized = compactWhitespace(rawSummary);
  if (!normalized) {
    return 'Read the official update for full details.';
  }
  return normalized;
}

function buildFallbackBilingual(items: RawNewsItem[]): AiNewsItem[] {
  return items.map(item => ({
    ...item,
    titleZh: item.titleEn,
    summaryZh: item.summaryEn,
    summaryEn: ensureSummary(item.summaryEn),
  }));
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

async function enrichBilingualItems(items: RawNewsItem[], provider?: ProviderId): Promise<AiNewsItem[]> {
  if (items.length === 0) {
    return [];
  }

  const resolvedProvider = provider ?? getDefaultProvider();
  const providerError = ensureProviderConfigured(resolvedProvider);
  if (providerError) {
    return buildFallbackBilingual(items);
  }

  const { model, providerOptions } = getLanguageModel({
    provider: resolvedProvider,
  });

  const fallback = buildFallbackBilingual(items);
  const fallbackMap = new Map(fallback.map(item => [item.id, item]));

  const schema = z.object({
    items: z.array(
      z.object({
        id: z.string(),
        titleZh: z.string(),
        summaryZh: z.string(),
        titleEn: z.string().optional(),
        summaryEn: z.string().optional(),
      }),
    ),
  });

  const prompt = `你是 AI 资讯编辑。请把输入资讯整理为中英双语卡片字段。

要求：
1. 保持事实，不要编造不存在的信息。
2. 标题保留原意，中文自然简洁。
3. 中文概要和英文概要都控制在 2~3 句话。
4. 仅返回 JSON，不要输出 Markdown。
5. 顶层必须是 {"items":[...]}，每一项必须包含 id, titleZh, summaryZh，可选 titleEn, summaryEn。

输入：
${JSON.stringify(
  items.map(item => ({
    id: item.id,
    source: item.source,
    titleEn: item.titleEn,
    summaryEn: ensureSummary(item.summaryEn),
    url: item.url,
    publishedAt: item.publishedAt,
  })),
  null,
  2,
)}`;

  try {
    const first = await generateText({
      model,
      providerOptions,
      prompt,
    });

    const parsed = schema.parse(extractFirstJsonObject(first.text));
    const outputMap = new Map(parsed.items.map(item => [item.id, item]));

    return items.map(item => {
      const candidate = outputMap.get(item.id);
      const base = fallbackMap.get(item.id)!;
      if (!candidate) {
        return base;
      }

      return {
        ...base,
        titleZh: compactWhitespace(candidate.titleZh || base.titleZh),
        summaryZh: compactWhitespace(candidate.summaryZh || base.summaryZh),
        titleEn: compactWhitespace(candidate.titleEn || base.titleEn),
        summaryEn: compactWhitespace(candidate.summaryEn || base.summaryEn),
      };
    });
  } catch {
    return fallback;
  }
}

function formatIsoDate(iso: string): string {
  return iso.slice(0, 10);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toSafeEmailHref(rawUrl: string): string | null {
  if (!isAllowedAiNewsUrl(rawUrl)) {
    return null;
  }

  try {
    return new URL(rawUrl).toString();
  } catch {
    return null;
  }
}

export function buildAiNewsListEmailDraft(options: {
  itemsBySource: Record<AiNewsSource, AiNewsItem[]>;
  windowStart: string;
  windowEnd: string;
}): EmailDraft {
  const sourceLabels: Record<AiNewsSource, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    altmanBlog: 'Sam Altman Blog',
  };

  const orderedSources: AiNewsSource[] = ['openai', 'anthropic', 'altmanBlog'];

  const subject = `AI 资讯速览（${options.windowStart} ~ ${options.windowEnd}）`;
  const sectionsHtml = orderedSources
    .map(source => {
      const items = options.itemsBySource[source];
      if (items.length === 0) {
        return `<section><h2>${escapeHtml(sourceLabels[source])}</h2><p>本周期暂无可展示资讯。</p></section>`;
      }

      const cards = items
        .map(item => {
          const safeDate = escapeHtml(formatIsoDate(item.publishedAt));
          const safeSource = escapeHtml(sourceLabels[source]);
          const safeTitleZh = escapeHtml(item.titleZh);
          const safeTitleEn = escapeHtml(item.titleEn);
          const safeSummaryZh = escapeHtml(item.summaryZh);
          const safeSummaryEn = escapeHtml(item.summaryEn);
          const safeHref = toSafeEmailHref(item.url);
          const linkContent = safeHref
            ? `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noreferrer">阅读原文</a>`
            : '<span style="color:#6b7280;">原文链接不可用</span>';

          return `
<article style="padding:12px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:12px;">
  <p style="margin:0 0 6px;color:#6b7280;font-size:12px;">${safeDate} · ${safeSource}</p>
  <h3 style="margin:0 0 6px;font-size:16px;">${safeTitleZh}</h3>
  <p style="margin:0 0 8px;font-size:13px;color:#374151;">${safeTitleEn}</p>
  <p style="margin:0 0 8px;line-height:1.6;">${safeSummaryZh}</p>
  <p style="margin:0 0 10px;line-height:1.6;color:#4b5563;">${safeSummaryEn}</p>
  ${linkContent}
</article>`;
        })
        .join('\n');

      return `<section><h2>${escapeHtml(sourceLabels[source])}</h2>${cards}</section>`;
    })
    .join('\n');

  const html = `<!doctype html>
<html lang="zh-CN">
  <body style="font-family:Inter,PingFang SC,Arial,sans-serif;background:#f8fafc;color:#111827;padding:24px;">
    <main style="max-width:760px;margin:0 auto;background:#ffffff;padding:20px;border-radius:14px;border:1px solid #dbe3ee;">
      <header style="margin-bottom:16px;">
        <h1 style="margin:0 0 8px;font-size:22px;">AI 资讯速览</h1>
        <p style="margin:0;color:#4b5563;">窗口：${escapeHtml(options.windowStart)} ~ ${escapeHtml(options.windowEnd)}（近30天）</p>
      </header>
      ${sectionsHtml}
      <footer style="margin-top:16px;color:#6b7280;font-size:12px;">
        本邮件由 AI SDK Learn 自动生成。
      </footer>
    </main>
  </body>
</html>`;

  const textLines: string[] = [
    `AI 资讯速览`,
    `窗口：${options.windowStart} ~ ${options.windowEnd}`,
    '',
  ];

  for (const source of orderedSources) {
    textLines.push(`【${sourceLabels[source]}】`);
    for (const item of options.itemsBySource[source]) {
      const safeHref = toSafeEmailHref(item.url);
      textLines.push(`- ${formatIsoDate(item.publishedAt)} ${item.titleZh}`);
      textLines.push(`  EN: ${item.titleEn}`);
      textLines.push(`  概要: ${item.summaryZh}`);
      textLines.push(`  Summary: ${item.summaryEn}`);
      textLines.push(`  ${safeHref ?? '（原文链接不可用）'}`);
    }
    if (options.itemsBySource[source].length === 0) {
      textLines.push('- 本周期暂无可展示资讯');
    }
    textLines.push('');
  }

  return {
    subject,
    html,
    text: textLines.join('\n').trim(),
  };
}

export async function getAiNewsFeed(options?: {
  provider?: ProviderId;
  now?: Date;
  perSourceLimit?: number;
}): Promise<AiNewsFeedResponse> {
  const perSourceLimit = options?.perSourceLimit ?? DEFAULT_PER_SOURCE_LIMIT;
  const window = getAiNewsWindow(options?.now);

  const [openAiXmlResult, anthropicHtmlResult, altmanAtomResult] = await Promise.allSettled([
    fetchTextWithTimeout(OPENAI_RSS_URL),
    fetchTextWithTimeout(ANTHROPIC_NEWS_URL, 30_000),
    fetchTextWithTimeout(SAM_ALTMAN_ATOM_URL, 30_000),
  ]);

  const openAiRaw =
    openAiXmlResult.status === 'fulfilled'
      ? parseOpenAiRssFeed(openAiXmlResult.value, window, perSourceLimit)
      : [];
  const anthropicRaw =
    anthropicHtmlResult.status === 'fulfilled'
      ? parseAnthropicNewsPage(anthropicHtmlResult.value, window, perSourceLimit)
      : [];
  const altmanRaw =
    altmanAtomResult.status === 'fulfilled'
      ? parseSamAltmanAtomFeed(altmanAtomResult.value, window, perSourceLimit)
      : [];

  const anthropicWithSummary = await Promise.all(
    anthropicRaw.map(async item => {
      if (item.summaryEn) {
        return item;
      }
      try {
        const summary = await fetchMetaDescription(item.url);
        return {
          ...item,
          summaryEn: summary || 'Read the official Anthropic update.',
        };
      } catch {
        return {
          ...item,
          summaryEn: 'Read the official Anthropic update.',
        };
      }
    }),
  );

  const rawItems = [...openAiRaw, ...anthropicWithSummary, ...altmanRaw];
  const bilingualItems = await enrichBilingualItems(rawItems, options?.provider);

  const grouped: Record<AiNewsSource, AiNewsItem[]> = {
    openai: [],
    anthropic: [],
    altmanBlog: [],
  };

  for (const item of bilingualItems) {
    grouped[item.source].push(item);
  }

  for (const source of Object.keys(grouped) as AiNewsSource[]) {
    grouped[source] = grouped[source]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, perSourceLimit);
  }

  const windowStart = formatIsoDate(window.windowStart.toISOString());
  const windowEnd = formatIsoDate(window.windowEnd.toISOString());

  return {
    windowStart,
    windowEnd,
    generatedAt: new Date().toISOString(),
    itemsBySource: grouped,
    listEmailDraft: buildAiNewsListEmailDraft({
      itemsBySource: grouped,
      windowStart,
      windowEnd,
    }),
  };
}

const allowedUrlHosts = ['openai.com', 'anthropic.com', 'blog.samaltman.com'] as const;

export function isAllowedAiNewsUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') {
      return false;
    }

    const host = parsed.hostname.toLowerCase();
    if (host === 'blog.samaltman.com') {
      return true;
    }
    if (host === 'openai.com' || host.endsWith('.openai.com')) {
      return true;
    }
    if (host === 'anthropic.com' || host.endsWith('.anthropic.com')) {
      return true;
    }

    return allowedUrlHosts.includes(host as (typeof allowedUrlHosts)[number]);
  } catch {
    return false;
  }
}

async function fetchArticleSummaryInput(url: string) {
  const html = await fetchTextWithTimeout(url, 30_000);
  const title = stripHtml(decodeHtmlEntities(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? ''));
  const description = stripHtml(
    decodeHtmlEntities(
      html.match(/<meta name="description" content="([^"]*)"/i)?.[1] ??
        html.match(/<meta property="og:description" content="([^"]*)"/i)?.[1] ??
        '',
    ),
  );

  const bodyHtml = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const bodyText = stripHtml(bodyHtml).slice(0, MAX_SUMMARY_INPUT_LENGTH);

  return {
    title: title || 'Untitled article',
    description,
    bodyText: bodyText || description || 'No extractable article content.',
  };
}

export async function streamAiNewsSummary(options: {
  url: string;
  source: AiNewsSource;
  itemId: string;
  provider?: ProviderId;
}) {
  if (!isAllowedAiNewsUrl(options.url)) {
    throw new Error('仅支持 openai.com、anthropic.com、blog.samaltman.com 的文章链接。');
  }

  const provider = options.provider ?? getDefaultProvider();
  const providerError = ensureProviderConfigured(provider);
  if (providerError) {
    throw new Error(providerError);
  }

  const articleInput = await fetchArticleSummaryInput(options.url);
  const { model, providerOptions } = getLanguageModel({
    provider,
  });

  return streamText({
    model,
    providerOptions,
    prompt: `你是技术资讯分析助手。请基于以下文章内容输出中文 Markdown 总结。

输出要求：
1. 使用以下标题结构：
## 文章概览
## 关键要点
## 深入解读
## 实践建议
## 一句话总结
2. “关键要点”至少 5 条，使用无序列表。
3. “深入解读”中解释文章背后的产品或技术意义，避免空话。
4. 不编造原文没有的信息。

文章元信息：
- itemId: ${options.itemId}
- source: ${options.source}
- url: ${options.url}
- title: ${articleInput.title}
- description: ${articleInput.description}

正文摘录：
${articleInput.bodyText}`,
  });
}

export async function sendAiNewsEmailWithModel(options: SendAiNewsEmailOptions) {
  const provider = options.provider ?? getDefaultProvider();
  const providerError = ensureProviderConfigured(provider);
  if (providerError) {
    throw new Error(providerError);
  }

  let sentResult:
    | {
        messageId: string;
        accepted: unknown;
        rejected: unknown;
      }
    | null = null;

  const sendPrebuiltEmailTool = tool({
    description: 'Send the prebuilt newsletter email via SMTP. Do not generate new email body.',
    inputSchema: z.object({
      toEmail: z.string().email(),
      confirmUsePrebuiltContent: z.boolean().optional(),
    }),
    execute: async ({ toEmail }) => {
      if (toEmail.trim().toLowerCase() !== options.toEmail.trim().toLowerCase()) {
        throw new Error('收件人邮箱不匹配，已拒绝发送。');
      }

      const dispatched = await sendEmailWithSmtp({
        toEmail,
        subject: options.draft.subject,
        html: options.draft.html,
        text: options.draft.text,
      });
      sentResult = dispatched;

      return {
        ok: true,
        messageId: dispatched.messageId,
      };
    },
  });

  const { model, providerOptions } = getLanguageModel({ provider });
  const result = await generateText({
    model,
    providerOptions,
    tools: {
      send_prebuilt_email: sendPrebuiltEmailTool,
    },
    prompt: `You must call the tool "send_prebuilt_email" exactly once.
Do not rewrite, summarize, or alter email content.
Use only the recipient email given below:

toEmail: ${options.toEmail}
context: ${JSON.stringify(options.context)}

After calling the tool, answer with a short success message.`,
  });

  if (!sentResult) {
    throw new Error('模型未触发 send_prebuilt_email 工具。');
  }
  const dispatched = sentResult as {
    messageId: string;
    accepted: unknown;
    rejected: unknown;
  };

  return {
    ok: true,
    messageId: dispatched.messageId,
    accepted: dispatched.accepted,
    rejected: dispatched.rejected,
    assistantText: result.text,
    steps: result.steps.length,
  };
}
