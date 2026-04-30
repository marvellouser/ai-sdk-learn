import { describe, expect, it } from 'vitest';

import { featureCards } from './features';

describe('featureCards', () => {
  it('contains the expected feature entries', () => {
    expect(featureCards).toHaveLength(5);
    expect(featureCards[0]?.href).toBe('/ai-sdk-learning');
    expect(featureCards[1]?.href).toBe('/creator-copy');
    expect(featureCards[2]?.href).toBe('/ai-news');
    expect(featureCards[3]?.href).toBe('/video-analysis');
    expect(featureCards[4]?.href).toBe('/compound-interest');
  });
});
