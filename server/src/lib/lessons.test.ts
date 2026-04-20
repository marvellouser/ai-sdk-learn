import { describe, expect, it } from 'vitest';

import { lessonCatalog } from './lessons.js';

describe('lessonCatalog', () => {
  it('contains the planned runnable lessons', () => {
    expect(Object.keys(lessonCatalog)).toEqual([
      'lesson-1',
      'lesson-2',
      'lesson-3',
      'lesson-4',
      'lesson-5',
      'lesson-8',
    ]);
  });
});
