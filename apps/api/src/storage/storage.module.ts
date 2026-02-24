import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { KeyframeStorageService } from './keyframe-storage.service';

@Module({
  imports: [ConfigModule],
  providers: [KeyframeStorageService],
  exports: [KeyframeStorageService]
})
export class StorageModule {}
