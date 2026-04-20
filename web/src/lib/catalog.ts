export type LessonId =
  | 'lesson-1'
  | 'lesson-2'
  | 'lesson-3'
  | 'lesson-4'
  | 'lesson-5'
  | 'lesson-6'
  | 'lesson-7'
  | 'lesson-8';

export type LessonCard = {
  id: LessonId;
  title: string;
  summary: string;
  mode: 'json' | 'text-stream' | 'link';
  promptLabel: string;
  defaultPrompt: string;
  needsSchedule?: boolean;
  href?: string;
};

export const lessonCards: LessonCard[] = [
  {
    id: 'lesson-1',
    title: '第 1 章：Provider 接入',
    summary: '把一句模糊目标澄清成更可执行的学习目标。',
    mode: 'json',
    promptLabel: '学习目标',
    defaultPrompt: '我想系统学习 AI SDK，然后用 Next + Express 做一个 agent 项目',
  },
  {
    id: 'lesson-2',
    title: '第 2 章：流式输出',
    summary: '体验 streamText，把学习建议逐字流出来。',
    mode: 'text-stream',
    promptLabel: '学习目标',
    defaultPrompt: '我已经会一些 Next.js，想尽快学会 AI SDK 的流式输出',
  },
  {
    id: 'lesson-3',
    title: '第 3 章：结构化输出',
    summary: '把目标转成可展示的 7 天学习计划对象。',
    mode: 'json',
    promptLabel: '学习目标',
    defaultPrompt: '我想用 AI SDK 学会做一个多步 agent 学习项目',
    needsSchedule: true,
  },
  {
    id: 'lesson-4',
    title: '第 4 章：Tool Calling',
    summary: '让模型先调用工具估算学习负载，再输出建议。',
    mode: 'json',
    promptLabel: '学习目标',
    defaultPrompt: '我想 3 周内学会用 AI SDK 做一个前后端分离的 agent',
    needsSchedule: true,
  },
  {
    id: 'lesson-5',
    title: '第 5 章：ToolLoopAgent',
    summary: '用多步 Agent 自动拆学习路径。',
    mode: 'json',
    promptLabel: '学习目标',
    defaultPrompt: '我想边学 AI SDK 边做项目，最后做成一个可演示的学习教练 agent',
    needsSchedule: true,
  },
  {
    id: 'lesson-6',
    title: '第 6 章：Next 聊天层',
    summary: '直接进入 useChat 驱动的学习教练页面。',
    mode: 'link',
    promptLabel: '学习目标',
    defaultPrompt: '',
    href: '/coach',
  },
  {
    id: 'lesson-7',
    title: '第 7 章：Express 流式 API',
    summary: '进入需求分析 Agent，观察 Next 和 Express 的流式协作。',
    mode: 'link',
    promptLabel: '产品想法',
    defaultPrompt: '',
    href: '/analyst',
  },
  {
    id: 'lesson-8',
    title: '第 8 章：Provider 切换',
    summary: '切换到不同 provider，比较结构化结果差异。',
    mode: 'json',
    promptLabel: '产品想法',
    defaultPrompt: '做一个帮助独立开发者快速拆 PRD、接口和任务的需求分析 agent',
  },
];

export const agentCards = [
  {
    id: 'coach',
    title: '学习教练 Agent',
    summary: '把学习目标拆成阶段计划、每日任务和下一步动作。',
    href: '/coach',
  },
  {
    id: 'analyst',
    title: '需求分析 Agent',
    summary: '把产品想法拆成 PRD 提纲、接口草案和任务拆解。',
    href: '/analyst',
  },
] as const;
