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
      <p className="message-text" key={`text-${index}`}>
        {String(part.text ?? '')}
      </p>
    );
  }

  if (part.type === 'reasoning') {
    return (
      <details className="message-meta" key={`reasoning-${index}`}>
        <summary>查看 reasoning</summary>
        <pre>{String(part.text ?? '')}</pre>
      </details>
    );
  }

  if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
    return (
      <details className="message-meta" key={`tool-${index}`}>
        <summary>{part.type}</summary>
        <pre>{JSON.stringify(part, null, 2)}</pre>
      </details>
    );
  }

  return (
    <details className="message-meta" key={`meta-${index}`}>
      <summary>{String(part.type ?? 'part')}</summary>
      <pre>{JSON.stringify(part, null, 2)}</pre>
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
    <main className="agent-shell">
      <section className="agent-header">
        <div>
          <p className="eyebrow">AGENT MODE</p>
          <h1>{preset.title}</h1>
          <p className="hero-copy">{preset.subtitle}</p>
        </div>
        <div className="agent-controls">
          <select value={provider} onChange={event => setProvider(event.target.value as 'qwen' | 'deepseek')}>
            <option value="qwen">Qwen</option>
            <option value="deepseek">DeepSeek</option>
          </select>
          <Link className="ghost-button" href="/">
            返回课程页
          </Link>
        </div>
      </section>

      <section className="starter-panel">
        {preset.starterPrompts.map(prompt => (
          <button className="starter-chip" key={prompt} onClick={() => void submit(prompt)} type="button">
            {prompt}
          </button>
        ))}
      </section>

      <section className="chat-panel">
        <div className="message-list">
          {messages.length === 0 ? (
            <div className="empty-state">
              <p>还没有对话，先点一个预设问题，或者自己输入一个目标。</p>
            </div>
          ) : null}

          {messages.map(message => (
            <article className={`message-card ${message.role}`} key={message.id}>
              <div className="message-role">{message.role === 'user' ? '你' : 'Agent'}</div>
              <div className="message-body">
                {(message.parts ?? []).map((part, index) => renderPart(part as Record<string, unknown>, index))}
              </div>
            </article>
          ))}
        </div>

        <form
          className="composer"
          onSubmit={event => {
            event.preventDefault();
            void submit(input);
          }}
        >
          <textarea
            placeholder={agentId === 'coach' ? '输入你的学习目标...' : '输入你的产品想法...'}
            rows={4}
            value={input}
            onChange={event => setInput(event.target.value)}
          />
          <div className="composer-actions">
            <span className="status-pill">{status}</span>
            {error ? <span className="error-text">{error.message}</span> : null}
            <button className="ghost-button" disabled={status !== 'streaming'} onClick={() => stop()} type="button">
              停止
            </button>
            <button className="solid-button" disabled={!input.trim() || status === 'submitted'} type="submit">
              发送
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
