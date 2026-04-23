export type AiNewsSource = 'openai' | 'anthropic' | 'altmanBlog';

export type EmailDraft = {
  subject: string;
  html: string;
  text: string;
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

export function sourceLabel(source: AiNewsSource) {
  if (source === 'openai') return 'OpenAI';
  if (source === 'anthropic') return 'Anthropic';
  return 'Sam Altman Blog';
}

export function formatDateLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function summaryPageHref(item: AiNewsItem) {
  const params = new URLSearchParams({
    source: item.source,
    itemId: item.id,
    url: item.url,
    titleZh: item.titleZh,
    titleEn: item.titleEn,
  });

  return `/ai-news/summary?${params.toString()}`;
}

function stripMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[>*-]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildSummaryEmailDraft(item: {
  titleZh: string;
  titleEn: string;
  url: string;
  summaryMarkdown: string;
}): EmailDraft {
  const summaryPlain = stripMarkdown(item.summaryMarkdown);
  const shortSummary = summaryPlain.slice(0, 320) || '请查看邮件中的完整 AI 总结内容。';

  const subject = `AI文章总结：${item.titleZh || item.titleEn}`;
  const html = `<!doctype html>
<html lang="zh-CN">
  <body style="font-family:Inter,PingFang SC,Arial,sans-serif;background:#f8fafc;color:#111827;padding:24px;">
    <main style="max-width:760px;margin:0 auto;background:#ffffff;padding:20px;border-radius:14px;border:1px solid #dbe3ee;">
      <header style="margin-bottom:14px;">
        <h1 style="margin:0 0 6px;font-size:22px;">AI 文章总结</h1>
        <p style="margin:0 0 6px;color:#374151;">${escapeHtml(item.titleZh)}</p>
        <p style="margin:0 0 10px;color:#6b7280;font-size:13px;">${escapeHtml(item.titleEn)}</p>
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">阅读原文</a>
      </header>
      <section style="line-height:1.7;white-space:pre-wrap;border:1px solid #e5e7eb;border-radius:10px;padding:12px;">
${escapeHtml(item.summaryMarkdown)}
      </section>
    </main>
  </body>
</html>`;

  const text = [
    'AI 文章总结',
    item.titleZh,
    item.titleEn,
    item.url,
    '',
    shortSummary,
    '',
    '完整总结内容：',
    item.summaryMarkdown,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject,
    html,
    text,
  };
}
