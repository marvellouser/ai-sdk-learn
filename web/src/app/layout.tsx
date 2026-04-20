import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI SDK Learn',
  description: '一个围绕 Next + Express + AI SDK 的全栈 Agent 学习项目',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
