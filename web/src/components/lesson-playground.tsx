'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { lessonCards, type LessonCard } from '../lib/catalog';
import { getServerUrl } from '../lib/config';

type LessonState = {
  output: string;
  error: string | null;
};

function pretty(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

function LessonRunner({ lesson }: { lesson: LessonCard }) {
  const [prompt, setPrompt] = useState(lesson.defaultPrompt);
  const [minutesPerDay, setMinutesPerDay] = useState(90);
  const [daysAvailable, setDaysAvailable] = useState(14);
  const [provider, setProvider] = useState<'qwen' | 'deepseek'>('qwen');
  const [state, setState] = useState<LessonState>({ output: '', error: null });
  const [isPending, startTransition] = useTransition();

  async function runLesson() {
    setState({ output: '', error: null });

    const body = {
      prompt,
      provider,
      minutesPerDay,
      daysAvailable,
    };

    try {
      const response = await fetch(`${getServerUrl()}/api/lessons/${lesson.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(error?.error || `请求失败: ${response.status}`);
      }

      if (lesson.mode === 'text-stream') {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let collected = '';

        if (!reader) {
          throw new Error('浏览器未返回可读取的流。');
        }

        while (true) {
          const chunk = await reader.read();
          if (chunk.done) {
            break;
          }

          collected += decoder.decode(chunk.value, { stream: true });
          setState({ output: collected, error: null });
        }

        return;
      }

      const data = await response.json();
      setState({ output: pretty(data), error: null });
    } catch (error) {
      setState({
        output: '',
        error: error instanceof Error ? error.message : '运行 lesson 时发生未知错误',
      });
    }
  }

  if (lesson.mode === 'link' && lesson.href) {
    return (
      <article className="lesson-card lesson-card-link">
        <div>
          <p className="eyebrow">{lesson.id.toUpperCase()}</p>
          <h3>{lesson.title}</h3>
          <p className="muted">{lesson.summary}</p>
        </div>
        <Link className="solid-button" href={lesson.href}>
          打开示例
        </Link>
      </article>
    );
  }

  return (
    <article className="lesson-card">
      <div className="lesson-head">
        <div>
          <p className="eyebrow">{lesson.id.toUpperCase()}</p>
          <h3>{lesson.title}</h3>
        </div>
        <select value={provider} onChange={event => setProvider(event.target.value as 'qwen' | 'deepseek')}>
          <option value="qwen">Qwen</option>
          <option value="deepseek">DeepSeek</option>
        </select>
      </div>

      <p className="muted">{lesson.summary}</p>

      <label className="field">
        <span>{lesson.promptLabel}</span>
        <textarea value={prompt} onChange={event => setPrompt(event.target.value)} rows={4} />
      </label>

      {lesson.needsSchedule ? (
        <div className="grid-two">
          <label className="field">
            <span>每天投入分钟数</span>
            <input
              type="number"
              value={minutesPerDay}
              min={10}
              max={480}
              onChange={event => setMinutesPerDay(Number(event.target.value))}
            />
          </label>
          <label className="field">
            <span>总天数</span>
            <input
              type="number"
              value={daysAvailable}
              min={1}
              max={365}
              onChange={event => setDaysAvailable(Number(event.target.value))}
            />
          </label>
        </div>
      ) : null}

      <button
        className="solid-button"
        disabled={isPending || !prompt.trim()}
        onClick={() => startTransition(() => void runLesson())}
        type="button"
      >
        {isPending ? '运行中...' : '运行示例'}
      </button>

      <div className="result-panel">
        {state.error ? <p className="error-text">{state.error}</p> : <pre>{state.output || '运行结果会显示在这里'}</pre>}
      </div>
    </article>
  );
}

export function LessonPlayground() {
  return (
    <section className="lesson-grid">
      {lessonCards.map(lesson => (
        <LessonRunner key={lesson.id} lesson={lesson} />
      ))}
    </section>
  );
}
