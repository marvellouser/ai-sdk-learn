'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { getServerUrl } from '../lib/config';
import {
  createProfileId,
  parseMediaCopyMarkdown,
  PROFILE_STORAGE_KEY,
  type MediaCopyHistoryDetail,
  type MediaCopyHistoryListItem,
  type MediaCopyHistoryListResponse,
} from '../lib/media-copy';
import { MediaCards } from './media-copy-cards';

function isValidProfileId(value: string | null): value is string {
  return typeof value === 'string' && value.trim().length >= 6;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString('zh-CN', { hour12: false });
}

export function MediaCopyHistoryPage() {
  const [profileId, setProfileId] = useState('');
  const [historyItems, setHistoryItems] = useState<MediaCopyHistoryListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [selectedHistoryId, setSelectedHistoryId] = useState('');
  const [historyDetail, setHistoryDetail] = useState<MediaCopyHistoryDetail | null>(null);
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);
  const detailAnchorRef = useRef<HTMLDivElement | null>(null);

  function ensureProfileId(): string {
    if (isValidProfileId(profileId)) {
      return profileId;
    }

    if (typeof window !== 'undefined') {
      try {
        const existing = window.localStorage.getItem(PROFILE_STORAGE_KEY);
        if (isValidProfileId(existing)) {
          setProfileId(existing);
          return existing;
        }
      } catch {
        // Ignore localStorage read errors.
      }
    }

    const created = createProfileId();
    setProfileId(created);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(PROFILE_STORAGE_KEY, created);
      } catch {
        // Ignore localStorage write errors.
      }
    }

    return created;
  }

  async function loadHistoryDetail(currentProfileId: string, recordId: string) {
    if (!recordId) {
      setHistoryDetail(null);
      return;
    }

    try {
      setHistoryError('');
      setHistoryDetailLoading(true);
      const response = await fetch(
        `${getServerUrl()}/api/media-copy/history/${encodeURIComponent(currentProfileId)}/${encodeURIComponent(recordId)}`,
      );

      if (!response.ok) {
        throw new Error(`读取历史详情失败：${response.status}`);
      }

      const detail = (await response.json()) as MediaCopyHistoryDetail;
      setHistoryDetail(detail);
    } catch (loadError) {
      setHistoryError(loadError instanceof Error ? loadError.message : '读取历史详情失败');
      setHistoryDetail(null);
    } finally {
      setHistoryDetailLoading(false);
    }
  }

  async function loadHistoryList(currentProfileId: string) {
    try {
      setHistoryError('');
      setHistoryLoading(true);
      const response = await fetch(`${getServerUrl()}/api/media-copy/history/${encodeURIComponent(currentProfileId)}`);

      if (!response.ok) {
        throw new Error(`读取历史列表失败：${response.status}`);
      }

      const data = (await response.json()) as MediaCopyHistoryListResponse;
      setHistoryItems(data.items);

      if (data.items.length === 0) {
        setSelectedHistoryId('');
        setHistoryDetail(null);
        return;
      }

      const existingSelected = data.items.find(item => item.id === selectedHistoryId);
      const nextId = existingSelected?.id ?? data.items[0]!.id;
      setSelectedHistoryId(nextId);
      await loadHistoryDetail(currentProfileId, nextId);
    } catch (loadError) {
      setHistoryError(loadError instanceof Error ? loadError.message : '读取历史列表失败');
      setHistoryItems([]);
      setSelectedHistoryId('');
      setHistoryDetail(null);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const id = ensureProfileId();
    void loadHistoryList(id);
  }, []);

  async function handleRefresh() {
    const id = ensureProfileId();
    await loadHistoryList(id);
  }

  async function handleSelectHistory(recordId: string) {
    const id = ensureProfileId();
    setSelectedHistoryId(recordId);
    await loadHistoryDetail(id, recordId);
    detailAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const historyDetailCards = useMemo(
    () => (historyDetail ? parseMediaCopyMarkdown(historyDetail.outputMarkdown) : null),
    [historyDetail],
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 md:px-6">
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-accent-light">CONTENT STUDIO</p>
            <h1 className="text-balance text-4xl leading-tight font-semibold text-text md:text-5xl">历史记录</h1>
            <p className="mt-3 max-w-3xl leading-7 text-muted">查看之前发送的文案与完整生成详情，点击上方记录即可切换。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center rounded-full border border-border bg-surface-light px-4 py-2.5 text-sm text-text transition hover:border-accent-light hover:text-accent-light"
              onClick={() => void handleRefresh()}
              type="button"
            >
              刷新列表
            </button>
            <Link
              className="inline-flex items-center rounded-full border border-border bg-surface-light px-4 py-2.5 text-sm text-text transition hover:border-accent-light hover:text-accent-light"
              href="/creator-copy"
            >
              返回生成页
            </Link>
          </div>
        </div>
      </section>

      <section className="grid min-h-0 gap-4 rounded-2xl border border-border bg-surface p-5">
        <article className="min-h-0 rounded-xl border border-border bg-surface-light/55 p-4">
          <p className="mb-3 text-sm font-semibold text-text">历史文案列表</p>
          <p className="mb-3 text-xs text-muted">Profile: {profileId || '初始化中...'}</p>
          {historyLoading ? <p className="text-sm text-muted">加载中...</p> : null}
          {!historyLoading && historyItems.length === 0 ? <p className="text-sm text-muted">暂无历史记录。</p> : null}
          {historyError ? <p className="text-sm text-error">{historyError}</p> : null}
          <div className="grid max-h-[20rem] gap-2 overflow-y-auto pr-1">
            {historyItems.map(item => (
              <button
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  item.id === selectedHistoryId
                    ? 'border-accent/60 bg-accent/15'
                    : 'border-border bg-surface-light/40 hover:border-accent-light/60'
                }`}
                key={item.id}
                onClick={() => void handleSelectHistory(item.id)}
                type="button"
              >
                <p className="text-xs text-accent-light">{formatDateTime(item.createdAt)}</p>
                <p className="mt-1 text-sm font-medium text-text">{item.inputPreview || '未命名输入'}</p>
                <p className="mt-1 max-h-10 overflow-hidden text-xs leading-5 text-muted">{item.outputSummary}</p>
              </button>
            ))}
          </div>
        </article>

        <article className="min-h-0 rounded-xl border border-border bg-surface-light/55 p-4" ref={detailAnchorRef}>
          <p className="mb-3 text-sm font-semibold text-text">历史详情</p>
          <div className="grid max-h-[68vh] gap-4 overflow-y-auto pr-1">
            {historyDetailLoading ? <p className="text-sm text-muted">加载详情中...</p> : null}
            {!historyDetailLoading && !historyDetail ? <p className="text-sm text-muted">从上方列表选择一条记录查看详情。</p> : null}
            {historyError ? <p className="text-sm text-error">{historyError}</p> : null}
            {historyDetail ? (
              <div className="grid gap-4">
                <div className="grid gap-1 rounded-xl border border-border bg-surface p-3">
                  <p className="text-xs text-accent-light">
                    {formatDateTime(historyDetail.createdAt)} · 风格 {historyDetail.stylePreset}
                    {historyDetail.customStyle ? ` · ${historyDetail.customStyle}` : ''}
                  </p>
                  <p className="text-sm leading-7 text-text whitespace-pre-wrap">{historyDetail.inputText || '无输入内容'}</p>
                </div>
                {historyDetailCards ? <MediaCards cards={historyDetailCards} /> : null}
                <details className="rounded-xl border border-border bg-surface px-4 py-3">
                  <summary className="cursor-pointer text-sm text-muted">查看原始 Markdown</summary>
                  <pre className="mt-3 text-sm text-text">{historyDetail.outputMarkdown}</pre>
                </details>
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
