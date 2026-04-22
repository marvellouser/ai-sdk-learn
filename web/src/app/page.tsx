import Link from 'next/link';

import { featureCards } from '../lib/features';

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 md:px-6 md:py-16">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-7 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-10">
        <div className="pointer-events-none absolute -top-16 -right-14 h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="relative max-w-3xl">
          <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-accent-light">FEATURE HUB</p>
          <h1 className="text-balance text-4xl leading-tight font-semibold text-text md:text-5xl">功能入口</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
            首页仅展示功能入口。当前提供 AI SDK 学习路径与自媒体文案生成工作台，后续会持续扩展新的功能模块。
          </p>
        </div>
      </section>

      <section className="grid gap-4 pb-8 md:grid-cols-2">
        {featureCards.map(card => (
          <Link
            className="group rounded-2xl border border-border bg-surface p-6 shadow-[0_14px_32px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-1 hover:border-accent/55 hover:shadow-[0_20px_38px_rgba(0,113,227,0.14)]"
            href={card.href}
            key={card.id}
          >
            <p className="text-xs font-semibold tracking-[0.16em] text-accent-light">{card.badge}</p>
            <h2 className="mt-3 text-2xl font-semibold text-text">{card.title}</h2>
            <p className="mt-3 leading-7 text-muted">{card.summary}</p>
            <p className="mt-5 text-sm font-medium text-accent-light transition group-hover:text-accent">进入功能 →</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
