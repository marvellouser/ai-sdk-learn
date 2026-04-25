'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';

import { apiUrl, requestJson } from '../lib/api';
import { createProfileId, parseMediaCopyMarkdown, PROFILE_STORAGE_KEY, stylePresetOptions, type StylePreset } from '../lib/media-copy';
import { MediaCards, MediaCardsSkeleton } from './media-copy-cards';
import { ProviderSelect, type ProviderId } from './provider-select';

type MemoryProfileResponse = {
  sampleCount: number;
  portrait: {
    blendHint: string;
  };
};

function isValidProfileId(value: string | null): value is string {
  return typeof value === 'string' && value.trim().length >= 6;
}

function extractMessageText(message: UIMessage): string {
  return (message.parts ?? [])
    .map(part => (part.type === 'text' ? part.text : ''))
    .join('')
    .trim();
}

export function MediaCopyStudio() {
  const [provider, setProvider] = useState<ProviderId>('qwen');
  const [stylePreset, setStylePreset] = useState<StylePreset>('story');
  const [customStyle, setCustomStyle] = useState('');
  const [ideaInput, setIdeaInput] = useState('');
  const [profileId, setProfileId] = useState('');
  const [memoryCount, setMemoryCount] = useState(0);
  const [blendHint, setBlendHint] = useState('暂无历史样本，按本次风格生成。');
  const [memoryError, setMemoryError] = useState('');
  const previousStatusRef = useRef('ready');

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

  const { messages, sendMessage, status, error, stop } = useChat({
    id: `media-copy-${provider}`,
    transport: new DefaultChatTransport({
      api: apiUrl('/api/media-copy/chat'),
      body: () => ({
        provider,
        profileId: ensureProfileId(),
        stylePreset,
        customStyle: customStyle.trim() || undefined,
      }),
    }),
  });

  async function loadStyleMemory(currentProfileId: string) {
    try {
      setMemoryError('');
      const data = await requestJson<MemoryProfileResponse>(
        `/api/media-copy/style-memory/${encodeURIComponent(currentProfileId)}`,
      );
      setMemoryCount(data.sampleCount);
      setBlendHint(data.portrait.blendHint || '暂无历史样本，按本次风格生成。');
    } catch (loadError) {
      setMemoryError(loadError instanceof Error ? loadError.message : '读取风格记忆失败');
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    void ensureProfileId();
  }, []);

  useEffect(() => {
    if (!profileId) {
      return;
    }

    void loadStyleMemory(profileId);
  }, [profileId]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (profileId && previousStatus !== 'ready' && status === 'ready') {
      void loadStyleMemory(profileId);
    }
  }, [profileId, status]);

  async function handleResetMemory() {
    if (!profileId) {
      return;
    }

    setMemoryError('');
    await requestJson(`/api/media-copy/style-memory/${encodeURIComponent(profileId)}`, {
      method: 'DELETE',
    });

    setMemoryCount(0);
    setBlendHint('暂无历史样本，按本次风格生成。');
  }

  async function handleSubmit(text: string) {
    const value = text.trim();
    if (!value) {
      return;
    }

    const ensuredProfileId = ensureProfileId();
    if (!isValidProfileId(ensuredProfileId)) {
      setMemoryError('未能初始化 profileId，请刷新页面重试。');
      return;
    }

    await sendMessage({ text: value });
    setIdeaInput('');
  }

  const assistantMessages = useMemo(() => messages.filter(message => message.role === 'assistant'), [messages]);
  const latestAssistantText = assistantMessages.length > 0 ? extractMessageText(assistantMessages[assistantMessages.length - 1]!) : '';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 md:px-6">
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-accent-light">CONTENT STUDIO</p>
            <h1 className="text-balance text-4xl leading-tight font-semibold text-text md:text-5xl">自媒体文案生成</h1>
            <p className="mt-3 max-w-3xl leading-7 text-muted">
              输入一个想法或故事，AI 会流式生成分析卡、小红书卡和公众号卡。系统会自动学习你的常用风格，越用越像。
            </p>
          </div>
          <Link
            className="inline-flex items-center rounded-full border border-border bg-surface-light px-4 py-2.5 text-sm text-text transition hover:border-accent-light hover:text-accent-light"
            href="/"
          >
            返回功能入口
          </Link>
        </div>
      </section>

      <section className="grid items-start gap-4 rounded-2xl border border-border bg-surface p-5 md:grid-cols-[1.3fr_1fr_1fr]">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-text">风格模板</span>
          <select
            className="rounded-xl border border-border bg-surface-light px-4 py-2.5 text-sm text-text outline-none transition focus:border-accent"
            value={stylePreset}
            onChange={event => setStylePreset(event.target.value as StylePreset)}
          >
            {stylePresetOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs leading-6 text-muted">
            {stylePresetOptions.find(option => option.value === stylePreset)?.description}
          </p>
        </label>

        <label className="grid content-start gap-2 self-start">
          <span className="text-sm font-semibold text-text">模型</span>
          <ProviderSelect value={provider} onChange={setProvider} />
        </label>

        <label className="grid content-start gap-2 self-start">
          <span className="text-sm font-semibold text-text">自定义风格补充</span>
          <input
            className="rounded-xl border border-border bg-surface-light px-4 py-2.5 text-sm text-text outline-none transition focus:border-accent"
            value={customStyle}
            onChange={event => setCustomStyle(event.target.value)}
            placeholder="如：第一人称、克制语气、少用感叹号"
          />
        </label>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-accent/10 px-3 py-1 text-sm text-accent-light">已学习风格次数：{memoryCount}</span>
          <span className="rounded-full bg-surface-light px-3 py-1 text-sm text-muted">状态：{status}</span>
          <button
            className="inline-flex items-center rounded-full border border-border bg-surface-light px-4 py-2 text-sm text-text transition hover:border-accent-light hover:text-accent-light"
            onClick={() => void handleResetMemory()}
            type="button"
          >
            重置风格记忆
          </button>
          <Link
            className="inline-flex items-center rounded-full border border-border bg-surface-light px-4 py-2 text-sm text-text transition hover:border-accent-light hover:text-accent-light"
            href="/creator-copy/history"
          >
            查看历史记录
          </Link>
          {memoryError ? <span className="text-sm text-error">{memoryError}</span> : null}
        </div>
        <p className="mt-3 text-sm leading-7 text-muted">自动融合提示：{blendHint}</p>
      </section>

      <section className="grid gap-3 rounded-2xl border border-border bg-surface p-5">
        <form
          className="grid gap-3"
          onSubmit={event => {
            event.preventDefault();
            void handleSubmit(ideaInput);
          }}
        >
          <textarea
            className="w-full rounded-xl border border-border bg-surface-light px-4 py-3 text-text outline-none transition focus:border-accent"
            placeholder="输入你的想法、经历、观点或一段故事..."
            rows={5}
            value={ideaInput}
            onChange={event => setIdeaInput(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center rounded-full border border-border bg-surface-light px-4 py-2 text-sm text-text transition hover:border-accent-light hover:text-accent-light disabled:cursor-not-allowed disabled:opacity-55"
              disabled={status !== 'streaming'}
              onClick={() => stop()}
              type="button"
            >
              停止
            </button>
            <button
              className="inline-flex items-center rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!ideaInput.trim() || status === 'submitted'}
              type="submit"
            >
              生成文案
            </button>
            {error ? <span className="text-sm text-error">{error.message}</span> : null}
          </div>
        </form>
      </section>

      <section className="grid gap-4">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface-light/45 p-5 text-sm text-muted">
            还没有生成记录。输入一个主题后，文案会以卡片形式流式展示。
          </div>
        ) : null}

        {status === 'streaming' && !latestAssistantText ? <MediaCardsSkeleton /> : null}

        {messages.map(message => {
          if (message.role === 'user') {
            return (
              <article className="rounded-2xl border border-accent/35 bg-accent-glow p-4" key={message.id}>
                <div className="mb-2 text-xs font-semibold tracking-[0.1em] text-accent-light uppercase">你的输入</div>
                <p className="m-0 leading-7 text-text">{extractMessageText(message)}</p>
              </article>
            );
          }

          if (message.role === 'assistant') {
            const assistantText = extractMessageText(message);
            const cards = parseMediaCopyMarkdown(assistantText);

            return (
              <article className="rounded-2xl border border-border bg-surface p-4 shadow-[0_12px_30px_rgba(15,23,42,0.07)]" key={message.id}>
                <div className="mb-3 text-xs font-semibold tracking-[0.1em] text-accent-light uppercase">AI 生成结果</div>
                <MediaCards cards={cards} />
                <details className="mt-4 rounded-xl border border-border bg-surface-light/60 px-4 py-3">
                  <summary className="cursor-pointer text-sm text-muted">查看原始 Markdown</summary>
                  <pre className="mt-3 text-sm text-text">{assistantText || '流式内容生成中...'}</pre>
                </details>
              </article>
            );
          }

          return null;
        })}
      </section>
    </main>
  );
}
