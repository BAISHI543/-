import { z } from 'zod';

export const GenerateStoryboardDto = z.object({
  title: z.string().optional().default('Untitled'),
  story_text: z.string().min(1),
  duration_s: z.number().int().min(30).max(180),
  style: z.string().min(1),
  pov: z.enum(['第一人称', '第三人称', '自拍视角'])
});

export type GenerateStoryboardInput = z.infer<typeof GenerateStoryboardDto>;

export const PlanKeyframesDto = z.object({
  project_id: z.string().min(1)
});

export type PlanKeyframesInput = z.infer<typeof PlanKeyframesDto>;

export const RenderKeyframeDto = z.object({
  project_id: z.string().min(1)
});

export type RenderKeyframeInput = z.infer<typeof RenderKeyframeDto>;
