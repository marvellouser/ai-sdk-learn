import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI SDK Learn',
  description: '一个围绕 Next + Express + AI SDK 的全栈 Agent 学习项目',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} min-h-screen bg-bg font-sans text-text antialiased`}>{children}</body>
    </html>
  );
}
