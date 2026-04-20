import { describe, expect, it } from 'vitest';

import { lessonCards } from './catalog';

describe('lessonCards', () => {
  it('keeps all 8 planned lessons', () => {
    expect(lessonCards).toHaveLength(8);
    expect(lessonCards[0]?.id).toBe('lesson-1');
    expect(lessonCards[7]?.id).toBe('lesson-8');
  });
});
