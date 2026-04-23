'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { type AiNewsFeedResponse, sourceLabel, formatDateLabel, summaryPageHref } from '../lib/ai-news';
import { getServerUrl } from '../lib/config';

function SourceSection({
  title,
  items,
}: {
  title: string;
  items: AiNewsFeedResponse['itemsBySource'][keyof AiNewsFeedResponse['itemsBySource']];
}) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text">{title}</h2>
        <span className="text-xs text-muted">共 {items.length} 条</span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-light/40 p-4 text-sm text-muted">
          本周期暂无资讯。
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map(item => (
            <article className="rounded-2xl border border-border bg-surface p-4 shadow-[0_12px_30px_rgba(15,23,42,0.07)]" key={item.id}>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-accent-light">
                <span>{sourceLabel(item.source)}</span>
                <span>·</span>
                <span>{formatDateLabel(item.publishedAt)}</span>
              </div>
              <h3 className="text-lg font-semibold text-text">{item.titleZh}</h3>
              <p className="mt-1 text-sm text-muted">{item.titleEn}</p>
              <p className="mt-3 leading-7 text-text">{item.summaryZh}</p>
              <p className="mt-2 text-sm leading-7 text-muted">{item.summaryEn}</p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a
                  className="inline-flex items-center rounded-full border border-border bg-surface-light px-4 py-2 text-sm text-text transition hover:border-accent-light hover:text-accent-light"
                  href={item.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  阅读原文
                </a>
                <Link
                  className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-light"
                  href={summaryPageHref(item)}
                >
                  AI总结
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function AiNewsPage() {
  const [feed, setFeed] = useState<AiNewsFeedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState('');

  async function loadFeed() {
    try {
      setLoading(true);
      setLoadError('');
      const response = await fetch(`${getServerUrl()}/api/ai-news/feed`);
      if (!response.ok) {
        throw new Error(`读取资讯失败：${response.status}`);
      }
      const payload = (await response.json()) as AiNewsFeedResponse;
      setFeed(payload);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '读取资讯失败');
      setFeed(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeed();
  }, []);

  async function handleSendEmail() {
    if (!feed || !toEmail.trim()) {
      return;
    }

    try {
      setSending(true);
      setSendResult('');
      const response = await fetch(`${getServerUrl()}/api/ai-news/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toEmail: toEmail.trim(),
          draft: feed.listEmailDraft,
          context: {
            kind: 'list',
          },
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `发送失败：${response.status}`);
      }

      setSendResult('资讯邮件发送成功。');
    } catch (error) {
      setSendResult(error instanceof Error ? error.message : '发送失败');
    } finally {
      setSending(false);
    }
  }

  const sourceOrder = useMemo(
    () =>
      [
        { id: 'openai' as const, title: 'OpenAI 官方资讯' },
        { id: 'anthropic' as const, title: 'Anthropic 官方资讯' },
        { id: 'altmanBlog' as const, title: 'Sam Altman 博客' },
      ] as const,
    [],
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 md:px-6">
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-accent-light">AI NEWS</p>
            <h1 className="text-balance text-4xl leading-tight font-semibold text-text md:text-5xl">获取最新AI资讯</h1>
            <p className="mt-3 max-w-3xl leading-7 text-muted">
              聚合 OpenAI、Anthropic 与 Sam Altman 博客近30天官方动态，提供双语卡片和文章 AI 总结。
            </p>
            {feed ? (
              <p className="mt-2 text-xs text-muted">
                统计窗口：{feed.windowStart} ~ {feed.windowEnd}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center rounded-full border border-border bg-surface-light px-4 py-2 text-sm text-text transition hover:border-accent-light hover:text-accent-light"
              onClick={() => void loadFeed()}
              type="button"
            >
              刷新资讯
            </button>
            <Link
              className="inline-flex items-center rounded-full border border-border bg-surface-light px-4 py-2 text-sm text-text transition hover:border-accent-light hover:text-accent-light"
              href="/"
            >
              返回首页
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm font-semibold text-text">发送资讯邮件</p>
        <p className="mt-1 text-sm text-muted">发送当前页面资讯摘要（精美 HTML）到指定邮箱。</p>
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
            disabled={!feed || !toEmail.trim() || sending}
            onClick={() => void handleSendEmail()}
            type="button"
          >
            {sending ? '发送中...' : '发送邮箱'}
          </button>
        </div>
        {sendResult ? <p className="mt-2 text-sm text-muted">{sendResult}</p> : null}
      </section>

      {loading ? (
        <section className="rounded-2xl border border-border bg-surface-light/50 p-5 text-sm text-muted">资讯加载中...</section>
      ) : null}
      {loadError ? (
        <section className="rounded-2xl border border-error/35 bg-red-50 p-5 text-sm text-error">{loadError}</section>
      ) : null}

      {feed ? (
        <section className="grid gap-6 pb-8">
          {sourceOrder.map(source => (
            <SourceSection items={feed.itemsBySource[source.id]} key={source.id} title={source.title} />
          ))}
        </section>
      ) : null}
    </main>
  );
}
