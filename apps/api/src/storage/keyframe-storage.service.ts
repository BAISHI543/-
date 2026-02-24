import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

@Injectable()
export class KeyframeStorageService {
  constructor(private readonly config: ConfigService) {}

  async ensureDir() {
    await fs.mkdir(this.config.keyframesDir, { recursive: true });
  }

  /**
   * Save base64 image data to KEYFRAMES_DIR using a predictable name.
   * ext defaults to env KEYFRAMES_EXT, but mimeType can override.
   */
  async save(opts: {
    projectId: string;
    shotId: string;
    kfType: 'start' | 'middle' | 'end' | 'main';
    revisionShort: string;
    width: number;
    height: number;
    mimeType?: string;
    dataBase64: string;
  }) {
    await this.ensureDir();

    const extFromMime = opts.mimeType?.includes('png') ? 'png' : opts.mimeType?.includes('jpeg') ? 'jpg' : undefined;
    const ext = extFromMime ?? this.config.keyframesExt;

    const filename = `${opts.projectId}_${opts.shotId}_${opts.kfType}_r${opts.revisionShort}_${opts.width}x${opts.height}.${ext}`;
    const outPath = path.join(this.config.keyframesDir, filename);

    const buf = Buffer.from(opts.dataBase64, 'base64');
    await fs.writeFile(outPath, buf);

    return {
      path: outPath,
      filename
    };
  }
}
