# 重构计划：首页拆分 + Tailwind 蓝色科技风

## Context

当前首页 (`page.tsx`) 把 hero、agent 卡片、以及全部 8 个 lesson 的交互运行器都堆在一个页面里，页面过长且职责不清。用户希望：
1. 首页只做入口导航，不承载具体 lesson 功能
2. 每个 lesson/demo 点击后跳转到独立子页面
3. 引入 Tailwind CSS，整体改为蓝色科技风格
4. 保留现有 API 调用逻辑不变

---

## Phase 1：安装 Tailwind CSS v4

Tailwind v4 采用 CSS-first 配置，不需要 `tailwind.config.ts`。

**新建文件：** `web/postcss.config.mjs`
```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

**安装依赖：**
```bash
pnpm --filter web add tailwindcss @tailwindcss/postcss postcss
```

**改写文件：** `web/src/app/globals.css`
- 删除全部 370 行原有 CSS
- 替换为 Tailwind v4 的 `@import "tailwindcss"` + `@theme` 块定义蓝色科技风调色板：

```css
@import "tailwindcss";

@theme {
  --color-bg: #0a0e1a;
  --color-surface: rgba(15, 23, 42, 0.85);
  --color-surface-light: rgba(30, 41, 59, 0.7);
  --color-text: #e2e8f0;
  --color-muted: #94a3b8;
  --color-accent: #3b82f6;
  --color-accent-light: #60a5fa;
  --color-accent-glow: rgba(59, 130, 246, 0.25);
  --color-border: rgba(59, 130, 246, 0.2);
  --color-error: #f87171;
  --font-sans: "Inter", "PingFang SC", sans-serif;
  --font-mono: "IBM Plex Mono", "Cascadia Code", monospace;
}
```

加上少量全局 base 样式（body 背景渐变、滚动条等），用 `@layer base {}` 写。

---

## Phase 2：创建 lesson 动态路由

**新建文件：** `web/src/app/lessons/[lessonId]/page.tsx`

- Server Component，接收 `params.lessonId`
- 从 `catalog.ts` 查找对应 lesson
- link 模式的 lesson（lesson-6 → `/coach`，lesson-7 → `/analyst`）直接 `redirect(lesson.href)`
- 其余 lesson 渲染 `<LessonRunner lesson={lesson} />`
- 添加 `generateStaticParams()` 返回 lesson-1 到 lesson-8，支持静态生成
- 顶部加返回首页的导航链接

```tsx
import { redirect, notFound } from 'next/navigation';
import { lessonCards } from '@/lib/catalog';
import { LessonRunner } from '@/components/lesson-runner';

export function generateStaticParams() {
  return lessonCards.map(l => ({ lessonId: l.id }));
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = lessonCards.find(l => l.id === lessonId);
  if (!lesson) notFound();
  if (lesson.mode === 'link' && lesson.href) redirect(lesson.href);
  return (
    <main> {/* Tailwind layout */}
      <LessonRunner lesson={lesson} />
    </main>
  );
}
```

---

## Phase 3：重构 LessonRunner 组件

**重命名文件：** `web/src/components/lesson-playground.tsx` → `web/src/components/lesson-runner.tsx`

改动内容：
1. **删除 `LessonPlayground` 组件**（底部的 grid wrapper），不再需要
2. **删除 `LessonRunner` 中 link 模式的分支**（`if (lesson.mode === 'link')`），因为路由层已处理
3. **保留 `LessonRunner` 的全部业务逻辑**：`useState`、`useTransition`、fetch、streaming reader、JSON 解析
4. **导出改为命名导出** `export function LessonRunner`
5. **CSS 类名全部替换为 Tailwind 工具类**，蓝色科技风格：
   - 卡片：`bg-surface border border-border rounded-2xl backdrop-blur-lg p-6`
   - 按钮：`bg-accent hover:bg-accent-light text-white rounded-full px-5 py-2.5 transition`
   - 输入框：`bg-surface-light border border-border rounded-xl text-text`
   - 结果面板：`bg-surface-light/50 border border-border rounded-xl p-4 font-mono text-sm`

---

## Phase 4：重写首页为纯导航页

**改写文件：** `web/src/app/page.tsx`

- **删除** `LessonPlayground` 的 import
- 保持 Server Component（无 `'use client'`）
- 结构：
  1. Hero 区域：标题、描述、CTA 按钮（Tailwind 蓝色渐变风格）
  2. Agent 卡片区：2 列 grid，每张卡片是 `<Link href={card.href}>` 跳转
  3. Lesson 卡片区：2 列 grid，每张卡片是 `<Link href={/lessons/${lesson.id}}>` 跳转
     - 只展示 lesson 的 `id`、`title`、`summary`
     - 不渲染 textarea、运行按钮、结果面板
     - link 模式的 lesson 直接链接到 `/coach` 或 `/analyst`

样式要点：
- 深色背景 + 蓝色光晕渐变
- 卡片半透明毛玻璃效果 (`backdrop-blur`)
- 蓝色边框发光 (`border-accent/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]`)
- hover 时微上移 + 边框变亮

---

## Phase 5：AgentChat 组件样式迁移

**改写文件：** `web/src/components/agent-chat.tsx`

- **逻辑完全不动**：`useChat`、`sendMessage`、`renderPart`、streaming 全部保留
- **CSS 类名全部替换为 Tailwind 工具类**，与整体蓝色科技风一致：
  - agent-header → flex justify-between + 蓝色渐变标题
  - starter-chip → `border border-border bg-surface-light rounded-full px-4 py-2 hover:border-accent-light`
  - message-card → `bg-surface border border-border rounded-2xl p-4`
  - message-card.user → `bg-accent-glow border-accent/30`
  - composer textarea → 深色输入框
  - status-pill → `bg-accent/10 text-accent-light rounded-full px-3 py-1 text-sm`

**不改动的文件：** `web/src/app/coach/page.tsx` 和 `web/src/app/analyst/page.tsx` 结构不变，只需把 CSS 类名换成 Tailwind（如果有的话，目前这两个文件很简单，几乎不需要改）。

---

## Phase 6：更新 Layout

**改写文件：** `web/src/app/layout.tsx`

- 引入 `next/font/google` 的 Inter 字体
- body 加 `className="bg-bg text-text antialiased font-sans min-h-screen"`
- 保留 `lang="zh-CN"`

---

## 不需要改动的文件

| 文件 | 原因 |
|------|------|
| `web/src/lib/catalog.ts` | 数据定义不变 |
| `web/src/lib/config.ts` | 服务端 URL 配置不变 |
| `web/src/lib/catalog.test.ts` | 测试不变 |
| `web/next.config.ts` | 无需修改 |
| `web/package.json` | 仅通过 pnpm add 自动更新 |
| `server/` 目录 | 后端完全不涉及 |

---

## 文件变更总览

| 操作 | 文件路径 |
|------|----------|
| 新建 | `web/postcss.config.mjs` |
| 新建 | `web/src/app/lessons/[lessonId]/page.tsx` |
| 重写 | `web/src/app/globals.css` |
| 重写 | `web/src/app/page.tsx` |
| 重命名+重写 | `web/src/components/lesson-playground.tsx` → `lesson-runner.tsx` |
| 改写 | `web/src/components/agent-chat.tsx` |
| 改写 | `web/src/app/layout.tsx` |

---

## 验证步骤

1. `pnpm --filter web build` — 确认编译通过
2. `pnpm --filter web test` — 确认 catalog 测试通过
3. `pnpm dev` — 启动前后端，浏览器验证：
   - 首页只显示导航卡片，无 lesson 运行器
   - 点击 lesson 卡片跳转到 `/lessons/lesson-N`
   - lesson 子页面可正常运行（输入 prompt → 调用后端 → 显示结果）
   - lesson-6 点击后跳转到 `/coach`，lesson-7 跳转到 `/analyst`
   - agent 聊天页面功能正常（发消息、streaming、tool call 展示）
   - 整体为深色蓝色科技风格，卡片有毛玻璃效果
