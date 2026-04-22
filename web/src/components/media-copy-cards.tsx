'use client';

import { type MediaCopyCards } from '../lib/media-copy';

function EmptyField({ text }: { text: string }) {
  return <p className="text-sm text-muted">{text}</p>;
}

function BulletList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold tracking-[0.12em] text-accent-light uppercase">{title}</p>
      {items.length === 0 ? (
        <EmptyField text="等待流式内容..." />
      ) : (
        <ul className="m-0 grid gap-1.5 pl-4 text-sm leading-6 text-text">
          {items.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TextBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold tracking-[0.12em] text-accent-light uppercase">{title}</p>
      {value ? <p className="text-sm leading-7 text-text whitespace-pre-wrap">{value}</p> : <EmptyField text="等待流式内容..." />}
    </div>
  );
}

export function MediaCards({ cards }: { cards: MediaCopyCards }) {
  const baseCardClass =
    'rounded-2xl p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)] min-h-[24rem] max-h-[38rem] flex flex-col';

  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-3">
      <article className={`${baseCardClass} border border-border bg-surface-light/60`}>
        <p className="mb-3 text-sm font-semibold text-text">分析卡</p>
        <div className="grid gap-4 overflow-y-auto pr-1">
          <BulletList title="受众洞察" items={cards.analysis.audienceInsights} />
          <BulletList title="内容策略" items={cards.analysis.contentStrategy} />
        </div>
      </article>

      <article
        className={`${baseCardClass} border border-emerald-200/80 bg-[linear-gradient(170deg,rgba(255,255,255,0.94),rgba(236,253,245,0.95))] shadow-[0_12px_28px_rgba(16,185,129,0.13)]`}
      >
        <p className="mb-3 text-sm font-semibold text-text">小红书卡</p>
        <div className="grid gap-4 overflow-y-auto pr-1">
          <BulletList title="标题候选" items={cards.xiaohongshu.titleCandidates} />
          <TextBlock title="正文" value={cards.xiaohongshu.body} />
          <BulletList title="推荐标签" items={cards.xiaohongshu.tags} />
          <TextBlock title="互动引导" value={cards.xiaohongshu.cta} />
        </div>
      </article>

      <article
        className={`${baseCardClass} border border-sky-200/80 bg-[linear-gradient(170deg,rgba(255,255,255,0.94),rgba(239,246,255,0.96))] shadow-[0_12px_28px_rgba(41,151,255,0.14)]`}
      >
        <p className="mb-3 text-sm font-semibold text-text">公众号卡</p>
        <div className="grid gap-4 overflow-y-auto pr-1">
          <BulletList title="标题候选" items={cards.wechat.titleCandidates} />
          <TextBlock title="导语" value={cards.wechat.intro} />
          <TextBlock title="正文" value={cards.wechat.body} />
          <TextBlock title="结尾引导" value={cards.wechat.outro} />
        </div>
      </article>
    </div>
  );
}

export function MediaCardsSkeleton() {
  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-3">
      {['分析卡', '小红书卡', '公众号卡'].map(name => (
        <article
          className="flex min-h-[24rem] max-h-[38rem] flex-col rounded-2xl border border-border bg-surface-light/60 p-4"
          key={name}
        >
          <p className="mb-3 text-sm font-semibold text-text">{name}</p>
          <div className="grid gap-2 overflow-y-auto pr-1">
            <div className="h-3 w-2/3 animate-pulse rounded bg-accent/25" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-accent/20" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-accent/15" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-accent/15" />
          </div>
        </article>
      ))}
    </div>
  );
}
