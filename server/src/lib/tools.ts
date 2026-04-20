import { tool } from 'ai';
import { z } from 'zod';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export const sharedTools = {
  estimateStudyLoad: tool({
    description: 'Estimate total study load from daily minutes and available days.',
    inputSchema: z.object({
      goal: z.string(),
      minutesPerDay: z.number().min(10).max(480),
      daysAvailable: z.number().min(1).max(365),
    }),
    execute: async ({ goal, minutesPerDay, daysAvailable }, _options) => {
      const totalHours = Number(((minutesPerDay * daysAvailable) / 60).toFixed(1));
      const weeklyHours = Number(((minutesPerDay * 7) / 60).toFixed(1));

      return {
        goal,
        totalHours,
        weeklyHours,
        recommendation:
          totalHours < 12
            ? 'Total time is tight. Narrow the scope or build a smaller first milestone.'
            : totalHours < 40
              ? 'Time budget is suitable for an end-to-end learning project.'
              : 'Time budget is enough for deeper learning and a polished demo.',
      };
    },
  }),
  buildStageTemplate: tool({
    description: 'Generate a 3-stage execution template based on days and total hours.',
    inputSchema: z.object({
      topic: z.string(),
      daysAvailable: z.number().min(1).max(365),
      totalHours: z.number().min(1).max(1000),
    }),
    execute: async ({ topic, daysAvailable, totalHours }, _options) => {
      const foundationDays = clamp(Math.round(daysAvailable * 0.3), 1, daysAvailable);
      const buildDays = clamp(Math.round(daysAvailable * 0.45), 1, daysAvailable);
      const polishDays = Math.max(daysAvailable - foundationDays - buildDays, 1);

      return {
        topic,
        totalHours,
        stages: [
          {
            name: 'Foundation',
            durationDays: foundationDays,
            focus: `Learn core ${topic} APIs and mental models`,
          },
          {
            name: 'Build',
            durationDays: buildDays,
            focus: `Implement 3 to 5 feature-oriented examples for ${topic}`,
          },
          {
            name: 'Integrate',
            durationDays: polishDays,
            focus: 'Combine lessons into one complete demo',
          },
        ],
      };
    },
  }),
  draftApiSurface: tool({
    description: 'Draft a minimal API surface from a product concept.',
    inputSchema: z.object({
      projectName: z.string(),
      primaryAction: z.string(),
    }),
    execute: async ({ projectName, primaryAction }, _options) => {
      return {
        projectName,
        endpoints: [
          {
            method: 'POST',
            path: '/api/projects/analyze',
            purpose: `Submit ${projectName} context and produce ${primaryAction} results`,
          },
          {
            method: 'POST',
            path: '/api/projects/chat',
            purpose: 'Continue streaming discussion with the analyst agent',
          },
          {
            method: 'GET',
            path: '/api/projects/templates',
            purpose: 'Return reusable templates and output contracts',
          },
        ],
      };
    },
  }),
  prioritizeBacklog: tool({
    description: 'Generate simple priority suggestions for a backlog list.',
    inputSchema: z.object({
      tasks: z.array(z.string()).min(1),
    }),
    execute: async ({ tasks }, _options) => {
      return {
        priorities: tasks.map((task, index) => ({
          task,
          priority: index === 0 ? 'P0' : index < 3 ? 'P1' : 'P2',
        })),
      };
    },
  }),
};
