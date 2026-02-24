import { GoogleGenerativeAI, GenerativeModel, SafetySetting } from '@google/generative-ai';

export type GeminiTextResult = {
  text: string;
  raw?: unknown;
};

export type GeminiImagePart = {
  mimeType: string;
  dataBase64: string;
};

export type GeminiRenderResult = {
  images: GeminiImagePart[];
  text?: string;
  raw?: unknown;
};

export class GeminiClient {
  private readonly genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  model(modelName: string, safetySettings?: SafetySetting[]): GenerativeModel {
    return this.genAI.getGenerativeModel({ model: modelName, safetySettings });
  }

  /**
   * Text-only generation helper.
   */
  async generateText(opts: {
    model: string;
    contents: any; // SDK types are a bit loose; keep generic.
    temperature?: number;
    maxOutputTokens?: number;
  }): Promise<GeminiTextResult> {
    const model = this.model(opts.model);
    const res = await model.generateContent({
      contents: opts.contents,
      generationConfig: {
        temperature: opts.temperature,
        maxOutputTokens: opts.maxOutputTokens
      }
    } as any);

    const text = res.response.text();
    return { text, raw: res };
  }

  /**
   * Image generation helper.
   *
   * NOTE: Gemini image outputs depend on model capability. This function attempts to
   * extract inlineData parts with image mimeTypes from the response.
   */
  async generateImage(opts: {
    model: string;
    contents: any;
    temperature?: number;
    maxOutputTokens?: number;
  }): Promise<GeminiRenderResult> {
    const model = this.model(opts.model);
    const res = await model.generateContent({
      contents: opts.contents,
      generationConfig: {
        temperature: opts.temperature,
        maxOutputTokens: opts.maxOutputTokens
      }
    } as any);

    const responseAny: any = res.response as any;
    const images: GeminiImagePart[] = [];

    // Try to traverse candidates -> content -> parts
    const candidates = responseAny?.candidates ?? [];
    for (const c of candidates) {
      const parts = c?.content?.parts ?? [];
      for (const p of parts) {
        const inline = p?.inlineData;
        if (inline?.mimeType?.startsWith('image/') && inline?.data) {
          images.push({ mimeType: inline.mimeType, dataBase64: inline.data });
        }
      }
    }

    const text = typeof responseAny?.text === 'function' ? responseAny.text() : undefined;
    return { images, text, raw: res };
  }
}
