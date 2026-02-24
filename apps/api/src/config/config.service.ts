import { Injectable } from '@nestjs/common';
import { Env, loadEnv } from './env';

@Injectable()
export class ConfigService {
  private readonly env: Env;

  constructor() {
    this.env = loadEnv(process.env);
  }

  get geminiApiKey() {
    return this.env.GEMINI_API_KEY;
  }
  get plannerModel() {
    return this.env.GEMINI_PLANNER_MODEL;
  }
  get rendererModel() {
    return this.env.GEMINI_RENDERER_MODEL;
  }
  get keyframesDir() {
    return this.env.KEYFRAMES_DIR;
  }
  get keyframesExt() {
    return this.env.KEYFRAMES_EXT;
  }
}
