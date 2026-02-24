import { z } from 'zod';

export const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_PLANNER_MODEL: z.string().default('gemini-2.0-flash'),
  GEMINI_RENDERER_MODEL: z.string().default('gemini-2.0-flash'),
  KEYFRAMES_DIR: z.string().default('C:/Users/Administrator/Desktop/分镜图'),
  KEYFRAMES_EXT: z.enum(['png', 'jpg', 'jpeg']).default('png')
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(processEnv: NodeJS.ProcessEnv): Env {
  const parsed = envSchema.safeParse({
    GEMINI_API_KEY: processEnv.GEMINI_API_KEY,
    GEMINI_PLANNER_MODEL: processEnv.GEMINI_PLANNER_MODEL,
    GEMINI_RENDERER_MODEL: processEnv.GEMINI_RENDERER_MODEL,
    KEYFRAMES_DIR: processEnv.KEYFRAMES_DIR,
    KEYFRAMES_EXT: processEnv.KEYFRAMES_EXT
  });
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment variables:\n${msg}`);
  }
  return parsed.data;
}
