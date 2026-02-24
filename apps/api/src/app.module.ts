import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { GeminiModule } from './gemini/gemini.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [ConfigModule, GeminiModule, StorageModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
