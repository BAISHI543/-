import { Injectable } from '@nestjs/common';
import { GeminiService } from '../gemini/gemini.service';
import { DbService } from '../db/db.service';
import { plannerSystemPrompt, plannerUserPrompt } from './storyboard.prompts';
import crypto from 'node:crypto';

type PlannerShot = {
  shot_id: string;
  seconds: number;
  scene: string;
  image_prompt: string;
  video_prompt: string;
  notes?: string;
};

type PlannerOutput = {
  project: { title: string };
  shots: PlannerShot[];
};

function nowISO() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

@Injectable()
export class StoryboardService {
  constructor(private readonly gemini: GeminiService, private readonly dbs: DbService) {}

  async generateStoryboard(input: {
    title: string;
    story_text: string;
    duration_s: number;
    style: string;
    pov: string;
  }) {
    const projectId = newId('P');

    const system = plannerSystemPrompt();
    const user = plannerUserPrompt({
      title: input.title,
      storyText: input.story_text,
      durationS: input.duration_s,
      style: input.style,
      pov: input.pov
    });

    const { json } = await this.gemini.plannerJson<PlannerOutput>({
      system,
      user,
      temperature: 0.2
    });

    // Persist project
    this.dbs.db
      .prepare(
        `INSERT INTO projects(project_id,title,story_text,duration_s,style,pov,created_at)
         VALUES(?,?,?,?,?,?,?)`
      )
      .run(projectId, input.title, input.story_text, input.duration_s, input.style, input.pov, nowISO());

    // Persist shots
    const insertShot = this.dbs.db.prepare(
      `INSERT INTO shots(project_id,shot_id,shot_order,duration_s,scene_desc,prompt_image,prompt_video,notes,created_at)
       VALUES(?,?,?,?,?,?,?,?,?)`
    );

    json.shots.forEach((s, idx) => {
      insertShot.run(
        projectId,
        s.shot_id,
        idx + 1,
        s.seconds,
        s.scene,
        s.image_prompt,
        s.video_prompt,
        s.notes ?? '',
        nowISO()
      );

      // Create placeholder keyframes (start/middle/end)
      const insertKf = this.dbs.db.prepare(
        `INSERT OR IGNORE INTO keyframes(project_id,shot_id,keyframe_id,kf_type,created_at)
         VALUES(?,?,?,?,?)`
      );
      ['start', 'middle', 'end'].forEach((t) => {
        insertKf.run(projectId, s.shot_id, `KF_${s.shot_id}_${t}`, t, nowISO());
      });
    });

    return this.getProject(projectId);
  }

  getProject(projectId: string) {
    const project = this.dbs.db.prepare(`SELECT * FROM projects WHERE project_id=?`).get(projectId);
    const shots = this.dbs.db
      .prepare(`SELECT * FROM shots WHERE project_id=? ORDER BY shot_order ASC`)
      .all(projectId);
    const keyframes = this.dbs.db.prepare(`SELECT * FROM keyframes WHERE project_id=?`).all(projectId);

    return { project, shots, keyframes };
  }

  async planKeyframes(projectId: string, shotId: string) {
    // MVP plan: use shot's image_prompt as render_plan.prompt
    const shot = this.dbs.db.prepare(`SELECT * FROM shots WHERE project_id=? AND shot_id=?`).get(projectId, shotId);
    if (!shot) throw new Error('shot not found');

    const update = this.dbs.db.prepare(
      `UPDATE keyframes SET render_plan_json=?, planner_trace_id=? WHERE project_id=? AND shot_id=? AND kf_type=?`
    );

    const types = ['start', 'middle', 'end'] as const;
    for (const t of types) {
      const renderPlan = {
        prompt: `${shot.prompt_image}\n(关键帧类型：${t}，保持角色一致，画面静态首帧)`
      };
      update.run(JSON.stringify(renderPlan), '', projectId, shotId, t);
    }

    return this.getProject(projectId);
  }
}
