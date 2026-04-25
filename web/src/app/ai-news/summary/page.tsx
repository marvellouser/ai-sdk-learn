import { Suspense } from 'react';

import { AiNewsSummaryPage } from '../../../components/ai-news-summary-page';

export default function AiNewsSummaryRoutePage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-5xl px-4 py-10 text-muted md:px-6">正在加载总结页...</main>}>
      <AiNewsSummaryPage />
    </Suspense>
  );
}
