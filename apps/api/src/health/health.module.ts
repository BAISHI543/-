import { Module } from '@nestjs/common';
import { GeminiModule } from '../gemini/gemini.module';
import { HealthController } from './health.controller';

@Module({
  imports: [GeminiModule],
  controllers: [HealthController]
})
export class HealthModule {}
