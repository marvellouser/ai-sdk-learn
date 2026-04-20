import { describe, expect, it } from 'vitest';

import { sharedTools } from './tools.js';

describe('sharedTools', () => {
  it('estimateStudyLoad returns total and weekly hours', async () => {
    const output = await sharedTools.estimateStudyLoad.execute!(
      {
        goal: 'Learn AI SDK',
        minutesPerDay: 90,
        daysAvailable: 14,
      },
      {
        toolCallId: 'test-1',
        messages: [],
      },
    );

    expect(output).toMatchObject({
      totalHours: 21,
      weeklyHours: 10.5,
    });
  });

  it('draftApiSurface returns at least three endpoints', async () => {
    const output = await sharedTools.draftApiSurface.execute!(
      {
        projectName: 'Requirement Copilot',
        primaryAction: 'requirement analysis',
      },
      {
        toolCallId: 'test-2',
        messages: [],
      },
    );

    if (!output || typeof output !== 'object' || !('endpoints' in output)) {
      throw new Error('Unexpected output from draftApiSurface');
    }

    const endpoints = (output as { endpoints: Array<{ path: string }> }).endpoints;
    expect(endpoints.length).toBeGreaterThanOrEqual(3);
    expect(endpoints[0]?.path).toBe('/api/projects/analyze');
  });
});
