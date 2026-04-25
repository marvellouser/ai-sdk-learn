'use client';

import { useState, useTransition } from 'react';

import type { LessonCard } from '../lib/catalog';
import { requestJson, requestTextStream } from '../lib/api';
import { ProviderSelect, type ProviderId } from './provider-select';

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

export function LessonRunner({ lesson }: { lesson: LessonCard }) {
  const [prompt, setPrompt] = useState(lesson.defaultPrompt);
  const [minutesPerDay, setMinutesPerDay] = useState(90);
  const [daysAvailable, setDaysAvailable] = useState(14);
  const [provider, setProvider] = useState<ProviderId>('qwen');
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
      if (lesson.mode === 'text-stream') {
        await requestTextStream(
          `/api/lessons/${lesson.id}`,
          {
            method: 'POST',
            body,
          },
          collected => setState({ output: collected, error: null }),
        );
        return;
      }

      const data = await requestJson<unknown>(`/api/lessons/${lesson.id}`, {
        method: 'POST',
        body,
      });
      setState({ output: pretty(data), error: null });
    } catch (error) {
      setState({
        output: '',
        error: error instanceof Error ? error.message : '运行 lesson 时发生未知错误',
      });
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-surface p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-accent-light">{lesson.id.toUpperCase()}</p>
          <h3 className="text-2xl font-semibold text-text">{lesson.title}</h3>
        </div>
        <ProviderSelect value={provider} onChange={setProvider} className="w-full max-w-44 ring-0" />
      </div>

      <p className="mt-4 text-sm leading-7 text-muted">{lesson.summary}</p>

      <label className="mt-5 grid gap-2">
        <span className="text-sm font-semibold text-text">{lesson.promptLabel}</span>
        <textarea
          className="w-full rounded-xl border border-border bg-surface-light px-4 py-3 text-text outline-none transition focus:border-accent"
          value={prompt}
          onChange={event => setPrompt(event.target.value)}
          rows={4}
        />
      </label>

      {lesson.needsSchedule ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-text">每天投入分钟数</span>
            <input
              className="w-full rounded-xl border border-border bg-surface-light px-4 py-2.5 text-text outline-none transition focus:border-accent"
              type="number"
              value={minutesPerDay}
              min={10}
              max={480}
              onChange={event => setMinutesPerDay(Number(event.target.value))}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-text">总天数</span>
            <input
              className="w-full rounded-xl border border-border bg-surface-light px-4 py-2.5 text-text outline-none transition focus:border-accent"
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
        className="mt-5 inline-flex w-fit items-center justify-center rounded-full bg-accent px-5 py-2.5 text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending || !prompt.trim()}
        onClick={() => startTransition(() => void runLesson())}
        type="button"
      >
        {isPending ? '运行中...' : '运行示例'}
      </button>

      <div className="mt-5 min-h-44 rounded-xl border border-border bg-surface-light/50 p-4 font-mono text-sm text-text">
        {state.error ? <p className="text-error">{state.error}</p> : <pre>{state.output || '运行结果会显示在这里'}</pre>}
      </div>
    </article>
  );
}
