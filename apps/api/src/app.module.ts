import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { GeminiModule } from './gemini/gemini.module';
import { StorageModule } from './storage/storage.module';
import { DbModule } from './db/db.module';
import { StoryboardModule } from './storyboard/storyboard.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [ConfigModule, GeminiModule, StorageModule, DbModule, StoryboardModule, HealthModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
