import { Module } from '@nestjs/common';
import { GeminiModule } from '../gemini/gemini.module';
import { DbModule } from '../db/db.module';
import { StoryboardController } from './storyboard.controller';
import { StoryboardService } from './storyboard.service';
import { RenderController } from './render.controller';
import { RenderService } from './render.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [GeminiModule, DbModule, StorageModule],
  controllers: [StoryboardController, RenderController],
  providers: [StoryboardService, RenderService]
})
export class StoryboardModule {}
