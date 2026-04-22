import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { LessonRunner } from '../../../components/lesson-runner';
import { lessonCards } from '../../../lib/catalog';

export function generateStaticParams() {
  return lessonCards.map(lesson => ({ lessonId: lesson.id }));
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = lessonCards.find(item => item.id === lessonId);

  if (!lesson) {
    notFound();
  }

  if (lesson.mode === 'link' && lesson.href) {
    redirect(lesson.href);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">LESSON DETAIL</p>
        <Link
          className="inline-flex items-center rounded-full border border-border bg-surface-light px-4 py-2 text-sm text-text transition hover:border-accent-light hover:text-accent-light"
          href="/"
        >
          返回首页
        </Link>
      </div>
      <LessonRunner lesson={lesson} />
    </main>
  );
}
