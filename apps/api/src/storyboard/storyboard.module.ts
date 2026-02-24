import { Module } from '@nestjs/common';
import { GeminiModule } from '../gemini/gemini.module';
import { DbModule } from '../db/db.module';
import { StoryboardController } from './storyboard.controller';
import { StoryboardService } from './storyboard.service';

@Module({
  imports: [GeminiModule, DbModule],
  controllers: [StoryboardController],
  providers: [StoryboardService]
})
export class StoryboardModule {}
