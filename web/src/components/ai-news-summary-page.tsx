'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { buildSummaryEmailDraft, type AiNewsSource, sourceLabel } from '../lib/ai-news';
import { getServerUrl } from '../lib/config';

function isAiNewsSource(value: string | null): value is AiNewsSource {
  return value === 'openai' || value === 'anthropic' || value === 'altmanBlog';
}

export function AiNewsSummaryPage() {
  const searchParams = useSearchParams();
  const source = searchParams.get('source');
  const itemId = searchParams.get('itemId') ?? '';
  const url = searchParams.get('url') ?? '';
  const titleZh = searchParams.get('titleZh') ?? '';
  const titleEn = searchParams.get('titleEn') ?? '';

  const [summaryMarkdown, setSummaryMarkdown] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState('');

  const canLoad = useMemo(() => Boolean(isAiNewsSource(source) && itemId && url), [source, itemId, url]);

  useEffect(() => {
    if (!canLoad || !isAiNewsSource(source)) {
      return;
    }

    let disposed = false;

    async function loadSummaryStream() {
      try {
        setLoading(true);
        setLoadError('');
        setSummaryMarkdown('');

        const response = await fetch(`${getServerUrl()}/api/ai-news/summary/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            source,
            itemId,
            url,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? `总结请求失败：${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('浏览器未返回可读取流。');
        }
        const decoder = new TextDecoder();
        let collected = '';

        while (true) {
          const chunk = await reader.read();
          if (chunk.done) {
            break;
          }
          collected += decoder.decode(chunk.value, { stream: true });
          if (!disposed) {
            setSummaryMarkdown(collected);
          }
        }

        collected += decoder.decode();
        if (!disposed) {
          setSummaryMarkdown(collected);
        }
      } catch (error) {
        if (!disposed) {
          setLoadError(error instanceof Error ? error.message : 'AI总结失败');
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    void loadSummaryStream();

    return () => {
      disposed = true;
    };
  }, [canLoad, source, itemId, url]);

  async function handleSendEmail() {
    if (!summaryMarkdown || !toEmail.trim() || !isAiNewsSource(source)) {
      return;
    }

    try {
      setSending(true);
      setSendResult('');

      const draft = buildSummaryEmailDraft({
        titleZh,
        titleEn,
        url,
        summaryMarkdown,
      });

      const response = await fetch(`${getServerUrl()}/api/ai-news/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toEmail: toEmail.trim(),
          draft,
          context: {
            kind: 'summary',
            source,
            itemId,
            url,
          },
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `发送失败：${response.status}`);
      }

      setSendResult('总结邮件发送成功。');
    } catch (error) {
      setSendResult(error instanceof Error ? error.message : '发送失败');
    } finally {
      setSending(false);
    }
  }

  if (!canLoad || !isAiNewsSource(source)) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-10 md:px-6">
        <section className="rounded-2xl border border-error/35 bg-red-50 p-5 text-sm text-error">
          缺少必要参数，请从资讯列表页点击“AI总结”进入。
        </section>
        <Link
          className="inline-flex w-fit items-center rounded-full border border-border bg-surface-light px-4 py-2 text-sm text-text transition hover:border-accent-light hover:text-accent-light"
          href="/ai-news"
        >
          返回资讯列表
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-10 md:px-6">
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-accent-light">AI SUMMARY</p>
            <h1 className="text-balance text-3xl leading-tight font-semibold text-text md:text-4xl">
              {titleZh || titleEn || '文章总结'}
            </h1>
            <p className="mt-2 text-sm text-muted">{titleEn}</p>
            <p className="mt-2 text-xs text-accent-light">来源：{sourceLabel(source)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              className="inline-flex items-center rounded-full border border-border bg-surface-light px-4 py-2 text-sm text-text transition hover:border-accent-light hover:text-accent-light"
              href={url}
              rel="noreferrer"
              target="_blank"
            >
              阅读原文
            </a>
            <Link
              className="inline-flex items-center rounded-full border border-border bg-surface-light px-4 py-2 text-sm text-text transition hover:border-accent-light hover:text-accent-light"
              href="/ai-news"
            >
              返回资讯列表
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm font-semibold text-text">发送总结邮件</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className="min-w-[18rem] flex-1 rounded-xl border border-border bg-surface-light px-4 py-2.5 text-sm text-text outline-none transition focus:border-accent"
            onChange={event => setToEmail(event.target.value)}
            placeholder="请输入收件邮箱"
            type="email"
            value={toEmail}
          />
          <button
            className="inline-flex items-center rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!summaryMarkdown || !toEmail.trim() || sending}
            onClick={() => void handleSendEmail()}
            type="button"
          >
            {sending ? '发送中...' : '发送邮箱'}
          </button>
        </div>
        {sendResult ? <p className="mt-2 text-sm text-muted">{sendResult}</p> : null}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-3 text-sm font-semibold text-text">AI 分析结果（流式）</div>
        {loading && !summaryMarkdown ? <p className="text-sm text-muted">AI 正在分析中...</p> : null}
        {loadError ? <p className="text-sm text-error">{loadError}</p> : null}
        {summaryMarkdown ? <pre className="text-sm leading-7 text-text">{summaryMarkdown}</pre> : null}
      </section>
    </main>
  );
}
