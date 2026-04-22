import Link from 'next/link';

import { agentCards, lessonCards } from '../../lib/catalog';

export default function AiSdkLearningPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-6 md:py-12">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-7 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-10">
        <div className="pointer-events-none absolute -top-16 -right-14 h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.65fr_0.9fr]">
          <div>
            <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-accent-light">AI SDK COURSE PROJECT</p>
            <h1 className="text-balance text-4xl leading-tight font-semibold text-text md:text-5xl">
              用 Next + Express 学会做一个真正可跑的 Agent 项目
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
              这套项目把 AI SDK 的核心能力拆成一组可运行 lesson，再把它们整合成两个综合 Agent：
              一个帮你规划学习路线，一个帮你拆解产品需求。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                className="inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-light"
                href="#lessons"
              >
                进入课程导航
              </a>
              <Link
                className="inline-flex items-center rounded-full border border-border bg-surface-light px-5 py-2.5 text-sm font-medium text-text transition hover:border-accent-light hover:text-accent-light"
                href="/"
              >
                返回功能入口
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-border bg-surface-light p-5">
              <p className="text-3xl font-semibold text-accent-light">8</p>
              <p className="mt-1 text-sm text-muted">个功能驱动 lesson</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-light p-5">
              <p className="text-3xl font-semibold text-accent-light">2</p>
              <p className="mt-1 text-sm text-muted">个综合 Agent demo</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-light p-5">
              <p className="text-3xl font-semibold text-accent-light">0</p>
              <p className="mt-1 text-sm text-muted">不使用 AI Gateway</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {agentCards.map(card => (
          <Link
            className="group rounded-2xl border border-border bg-surface p-6 shadow-[0_14px_32px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-1 hover:border-accent/55 hover:shadow-[0_20px_38px_rgba(0,113,227,0.14)]"
            href={card.href}
            key={card.id}
          >
            <p className="text-xs font-semibold tracking-[0.16em] text-accent-light">{card.id.toUpperCase()}</p>
            <h2 className="mt-3 text-2xl font-semibold text-text">{card.title}</h2>
            <p className="mt-3 leading-7 text-muted">{card.summary}</p>
            <p className="mt-5 text-sm font-medium text-accent-light transition group-hover:text-accent">打开 demo →</p>
          </Link>
        ))}
      </section>

      <section className="rounded-3xl border border-border bg-surface p-7 md:p-8" id="lessons">
        <p className="text-xs font-semibold tracking-[0.16em] text-accent-light">LESSON LAB</p>
        <h2 className="mt-3 text-3xl leading-tight font-semibold text-text md:text-4xl">
          每章都先做出一个可运行功能，再回头理解原理
        </h2>
        <p className="mt-4 max-w-3xl leading-8 text-muted">
          建议先从 lesson-1 跑到 lesson-5，再进入两个综合 Agent。lesson-6 和 lesson-7 直接对应到聊天页面和
          Express 流式接口。
        </p>
      </section>

      <section className="grid gap-4 pb-8 md:grid-cols-2">
        {lessonCards.map(lesson => {
          const href = lesson.mode === 'link' && lesson.href ? lesson.href : `/lessons/${lesson.id}`;

          return (
            <Link
              className="group rounded-2xl border border-border bg-surface p-6 shadow-[0_14px_32px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-1 hover:border-accent/55 hover:shadow-[0_20px_38px_rgba(0,113,227,0.14)]"
              href={href}
              key={lesson.id}
            >
              <p className="text-xs font-semibold tracking-[0.16em] text-accent-light">{lesson.id.toUpperCase()}</p>
              <h3 className="mt-3 text-2xl font-semibold text-text">{lesson.title}</h3>
              <p className="mt-3 leading-7 text-muted">{lesson.summary}</p>
              <p className="mt-5 text-sm font-medium text-accent-light transition group-hover:text-accent">进入子页面 →</p>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
