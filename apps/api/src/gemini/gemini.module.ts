import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { GeminiService } from './gemini.service';

@Module({
  imports: [ConfigModule],
  providers: [GeminiService],
  exports: [GeminiService]
})
export class GeminiModule {}
