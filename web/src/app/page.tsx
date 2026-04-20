import Link from 'next/link';

import { agentCards } from '../lib/catalog';
import { LessonPlayground } from '../components/lesson-playground';

export default function HomePage() {
  return (
    <main className="home-shell">
      <section className="hero-panel">
        <div className="hero-copy-block">
          <p className="eyebrow">AI SDK COURSE PROJECT</p>
          <h1>用 Next + Express 学会做一个真正可跑的 Agent 项目</h1>
          <p className="hero-copy">
            这套项目把 AI SDK 的核心能力拆成一组可运行 lesson，再把它们整合成两个综合 Agent：
            一个帮你规划学习路线，一个帮你拆解产品需求。
          </p>
          <div className="hero-actions">
            <a className="solid-button" href="#lessons">
              开始跑课程示例
            </a>
            <Link className="ghost-button" href="/coach">
              直接进入学习教练
            </Link>
          </div>
        </div>
        <div className="hero-aside">
          <div className="stat-card">
            <span>8</span>
            <p>个功能驱动 lesson</p>
          </div>
          <div className="stat-card">
            <span>2</span>
            <p>个综合 Agent demo</p>
          </div>
          <div className="stat-card">
            <span>0</span>
            <p>不使用 AI Gateway</p>
          </div>
        </div>
      </section>

      <section className="agent-grid">
        {agentCards.map(card => (
          <article className="agent-card" key={card.id}>
            <p className="eyebrow">{card.id.toUpperCase()}</p>
            <h2>{card.title}</h2>
            <p className="muted">{card.summary}</p>
            <Link className="solid-button" href={card.href}>
              打开 demo
            </Link>
          </article>
        ))}
      </section>

      <section className="section-heading" id="lessons">
        <p className="eyebrow">LESSON LAB</p>
        <h2>每章都先做出一个可运行功能，再回头理解原理</h2>
        <p className="muted">
          建议先从 lesson-1 跑到 lesson-5，再进入两个综合 Agent。lesson-6 和 lesson-7
          直接对应到聊天页面和 Express 流式接口。
        </p>
      </section>

      <LessonPlayground />
    </main>
  );
}
