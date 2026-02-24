import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { GeminiService } from '../gemini/gemini.service';
import { KeyframeStorageService } from '../storage/keyframe-storage.service';

function nowISO() {
  return new Date().toISOString();
}

function shortRev() {
  return Math.random().toString(16).slice(2, 8).toUpperCase();
}

@Injectable()
export class RenderService {
  constructor(
    private readonly dbs: DbService,
    private readonly gemini: GeminiService,
    private readonly storage: KeyframeStorageService
  ) {}

  async renderKeyframe(opts: { projectId: string; keyframeId: string }) {
    const kf = this.dbs.db
      .prepare(`SELECT * FROM keyframes WHERE project_id=? AND keyframe_id=?`)
      .get(opts.projectId, opts.keyframeId);
    if (!kf) throw new Error('keyframe not found');
    if (!kf.render_plan_json) throw new Error('render_plan_json missing - plan first');

    const plan = JSON.parse(kf.render_plan_json);
    const prompt = String(plan.prompt || '').trim();
    if (!prompt) throw new Error('render_plan.prompt empty');

    const res = await this.gemini.renderImages({ prompt, temperature: 0.2 });
    if (!res.images.length) {
      return {
        ok: false,
        message:
          'Gemini renderer did not return any inline image data. This model/account may not support image output via this SDK. Try another model or renderer approach.',
        debug: { text: res.text }
      };
    }

    // Use first image for MVP.
    const img = res.images[0];

    const shotId = kf.shot_id as string;
    const kfType = kf.kf_type as 'start' | 'middle' | 'end' | 'main';

    // width/height unknown from response; assume 1080x1920 for naming.
    const saved = await this.storage.save({
      projectId: opts.projectId,
      shotId,
      kfType,
      revisionShort: shortRev(),
      width: 1080,
      height: 1920,
      mimeType: img.mimeType,
      dataBase64: img.dataBase64
    });

    this.dbs.db
      .prepare(`UPDATE keyframes SET image_path=?, renderer_trace_id=?, created_at=? WHERE project_id=? AND keyframe_id=?`)
      .run(saved.path, '', nowISO(), opts.projectId, opts.keyframeId);

    return {
      ok: true,
      keyframe_id: opts.keyframeId,
      image_path: saved.path
    };
  }

  async renderShot3(opts: { projectId: string; shotId: string }) {
    const kfs = this.dbs.db
      .prepare(`SELECT * FROM keyframes WHERE project_id=? AND shot_id=? AND kf_type IN ('start','middle','end') ORDER BY kf_type ASC`)
      .all(opts.projectId, opts.shotId);

    const results: any[] = [];
    for (const kf of kfs) {
      results.push(await this.renderKeyframe({ projectId: opts.projectId, keyframeId: kf.keyframe_id }));
    }
    return { ok: true, results };
  }
}
