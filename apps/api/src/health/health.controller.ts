import { Controller, Get } from '@nestjs/common';
import { GeminiService } from '../gemini/gemini.service';

@Controller('/api/health')
export class HealthController {
  constructor(private readonly gemini: GeminiService) {}

  @Get('gemini-renderer')
  async geminiRenderer() {
    const prompt = '生成一张竖屏 9:16 的静态动漫插画：一只坐在桌上的橘猫，室内柔和光线，干净背景。请返回图片。';
    const res = await this.gemini.renderImages({ prompt, temperature: 0.2 });
    return {
      ok: true,
      images: res.images.map((i) => ({ mimeType: i.mimeType, bytes: i.dataBase64.length }))
    };
  }
}
