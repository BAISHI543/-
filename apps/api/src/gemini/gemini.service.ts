import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { GeminiClient } from './gemini.client';

function stripCodeFences(s: string) {
  return s.replace(/^```[a-zA-Z]*\s*/g, '').replace(/\s*```$/g, '').trim();
}

@Injectable()
export class GeminiService {
  private readonly client: GeminiClient;

  constructor(private readonly config: ConfigService) {
    this.client = new GeminiClient(this.config.geminiApiKey);
  }

  /**
   * Planner: ask Gemini to output STRICT JSON.
   */
  async plannerJson<T>(opts: {
    system: string;
    user: string;
    schemaHint?: string;
    temperature?: number;
    maxOutputTokens?: number;
  }): Promise<{ json: T; text: string }> {
    const model = this.config.plannerModel;
    const contents = [
      {
        role: 'user',
        parts: [
          { text: `${opts.system}\n\n${opts.schemaHint ? `Schema/Format Hint:\n${opts.schemaHint}\n\n` : ''}${opts.user}` }
        ]
      }
    ];

    const { text } = await this.client.generateText({
      model,
      contents,
      temperature: opts.temperature ?? 0.2,
      maxOutputTokens: opts.maxOutputTokens ?? 8192
    });

    const cleaned = stripCodeFences(text);
    try {
      const json = JSON.parse(cleaned) as T;
      return { json, text };
    } catch (e) {
      // Second attempt: force JSON only.
      const retryUser = `${opts.user}\n\nIMPORTANT: Only output valid minified JSON. No markdown, no code fences, no explanations.`;
      const { text: text2 } = await this.client.generateText({
        model,
        contents: [{ role: 'user', parts: [{ text: `${opts.system}\n\n${retryUser}` }] }],
        temperature: 0.0,
        maxOutputTokens: opts.maxOutputTokens ?? 8192
      });
      const cleaned2 = stripCodeFences(text2);
      const json2 = JSON.parse(cleaned2) as T;
      return { json: json2, text: text2 };
    }
  }

  /**
   * Renderer: attempt to generate images (PNG by default).
   * This assumes the selected renderer model supports inline image outputs.
   */
  async renderImages(opts: {
    prompt: string;
    temperature?: number;
    maxOutputTokens?: number;
  }): Promise<{ images: { mimeType: string; dataBase64: string }[]; text?: string }> {
    const model = this.config.rendererModel;

    // For MVP, keep it simple: text prompt only.
    // Later we will add ref images (inlineData) based on render_plan.ref_plan.
    const contents = [
      {
        role: 'user',
        parts: [{ text: opts.prompt }]
      }
    ];

    const { images, text } = await this.client.generateImage({
      model,
      contents,
      temperature: opts.temperature ?? 0.2,
      maxOutputTokens: opts.maxOutputTokens ?? 4096
    });

    return { images, text };
  }
}
