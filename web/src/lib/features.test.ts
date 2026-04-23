import { describe, expect, it } from 'vitest';

import { featureCards } from './features';

describe('featureCards', () => {
  it('contains the expected feature entries', () => {
    expect(featureCards).toHaveLength(3);
    expect(featureCards[0]?.href).toBe('/ai-sdk-learning');
    expect(featureCards[1]?.href).toBe('/creator-copy');
    expect(featureCards[2]?.href).toBe('/ai-news');
  });
});
