import { describe, expect, it } from 'vitest';

import { featureCards } from './features';

describe('featureCards', () => {
  it('contains the 2 initial feature entries', () => {
    expect(featureCards).toHaveLength(2);
    expect(featureCards[0]?.href).toBe('/ai-sdk-learning');
    expect(featureCards[1]?.href).toBe('/creator-copy');
  });
});
