'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';

import { getServerUrl } from '../lib/config';

type AgentId = 'coach' | 'analyst';

const presets: Record<
  AgentId,
  {
    title: string;
    subtitle: string;
    starterPrompts: string[];
  }
> = {
  coach: {
    title: '学习教练 Agent',
    subtitle: '适合把一个学习目标拆成节奏、阶段和可执行动作。',
    starterPrompts: [
      '我想用 3 周时间学会 AI SDK，然后做一个 Next + Express 的 agent 项目',
      '我已经会 React，但不会 tool calling，帮我安排一条学习路线',
      '我每天只能学 1 小时，目标是做出一个学习教练 demo',
    ],
  },
  analyst: {
    title: '需求分析 Agent',
    subtitle: '适合把一个产品想法拆成 PRD 提纲、接口和开发任务。',
    starterPrompts: [
      '我想做一个帮助小团队快速拆需求的 agent，请帮我做 MVP 规划',
      '我想做一个 AI 学习伙伴应用，目标用户是转岗中的前端工程师',
      '帮我把一个课程生成器产品拆成核心流程、接口和任务清单',
    ],
  },
};

function renderPart(part: Record<string, unknown>, index: number) {
  if (part.type === 'text') {
    return (
      <p className="m-0 leading-7 text-text" key={`text-${index}`}>
        {String(part.text ?? '')}
      </p>
    );
  }

  if (part.type === 'reasoning') {
    return (
      <details className="rounded-xl border border-border bg-surface-light/80 px-4 py-3" key={`reasoning-${index}`}>
        <summary>查看 reasoning</summary>
        <pre className="mt-3 text-sm text-text">{String(part.text ?? '')}</pre>
      </details>
    );
  }

  if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
    return (
      <details className="rounded-xl border border-border bg-surface-light/80 px-4 py-3" key={`tool-${index}`}>
        <summary>{part.type}</summary>
        <pre className="mt-3 text-sm text-text">{JSON.stringify(part, null, 2)}</pre>
      </details>
    );
  }

  return (
    <details className="rounded-xl border border-border bg-surface-light/80 px-4 py-3" key={`meta-${index}`}>
      <summary>{String(part.type ?? 'part')}</summary>
      <pre className="mt-3 text-sm text-text">{JSON.stringify(part, null, 2)}</pre>
    </details>
  );
}

export function AgentChat({ agentId }: { agentId: AgentId }) {
  const preset = presets[agentId];
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<'qwen' | 'deepseek'>('qwen');

  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({
      api: `${getServerUrl()}/api/agents/${agentId}/chat`,
      body: () => ({
        provider,
      }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  async function submit(text: string) {
    const value = text.trim();

    if (!value) {
      return;
    }

    setInput('');
    await sendMessage({ text: value });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 md:px-6">
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_0_36px_rgba(59,130,246,0.15)] backdrop-blur-xl md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-accent-light">AGENT MODE</p>
            <h1 className="bg-gradient-to-r from-white via-sky-200 to-accent-light bg-clip-text text-4xl leading-tight font-semibold text-transparent md:text-5xl">
              {preset.title}
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-muted">{preset.subtitle}</p>
          </div>
          <div className="grid w-full max-w-52 gap-2">
            <select
              className="w-full rounded-xl border border-border bg-surface-light px-4 py-2.5 text-sm text-text outline-none transition focus:border-accent"
              value={provider}
              onChange={event => setProvider(event.target.value as 'qwen' | 'deepseek')}
            >
              <option value="qwen">Qwen</option>
              <option value="deepseek">DeepSeek</option>
            </select>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-border bg-surface-light px-4 py-2.5 text-sm text-text transition hover:border-accent-light hover:text-accent-light"
              href="/"
            >
              返回课程页
            </Link>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-3 rounded-2xl border border-border bg-surface p-5">
        {preset.starterPrompts.map(prompt => (
          <button
            className="rounded-full border border-border bg-surface-light px-4 py-2 text-sm text-text transition hover:-translate-y-0.5 hover:border-accent-light hover:text-accent-light"
            key={prompt}
            onClick={() => void submit(prompt)}
            type="button"
          >
            {prompt}
          </button>
        ))}
      </section>

      <section className="grid gap-4 rounded-3xl border border-border bg-surface p-5 md:p-6">
        <div className="grid gap-3">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface-light/45 p-5 text-sm text-muted">
              <p>还没有对话，先点一个预设问题，或者自己输入一个目标。</p>
            </div>
          ) : null}

          {messages.map(message => (
            <article
              className={`rounded-2xl border p-4 ${
                message.role === 'user'
                  ? 'border-accent/35 bg-accent-glow'
                  : 'border-border bg-surface-light/60'
              }`}
              key={message.id}
            >
              <div className="mb-2 text-xs font-semibold tracking-[0.1em] text-accent-light uppercase">
                {message.role === 'user' ? '你' : 'Agent'}
              </div>
              <div className="grid gap-3">
                {(message.parts ?? []).map((part, index) => renderPart(part as Record<string, unknown>, index))}
              </div>
            </article>
          ))}
        </div>

        <form
          className="grid gap-3"
          onSubmit={event => {
            event.preventDefault();
            void submit(input);
          }}
        >
          <textarea
            className="w-full rounded-xl border border-border bg-surface-light px-4 py-3 text-text outline-none transition focus:border-accent"
            placeholder={agentId === 'coach' ? '输入你的学习目标...' : '输入你的产品想法...'}
            rows={4}
            value={input}
            onChange={event => setInput(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent/10 px-3 py-1 text-sm text-accent-light">{status}</span>
            {error ? <span className="text-sm text-error">{error.message}</span> : null}
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
              disabled={!input.trim() || status === 'submitted'}
              type="submit"
            >
              发送
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
