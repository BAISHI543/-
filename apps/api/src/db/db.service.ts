import { Injectable } from '@nestjs/common';
import Database from 'better-sqlite3';
import * as path from 'node:path';
import * as fs from 'node:fs';

@Injectable()
export class DbService {
  public readonly db: Database.Database;

  constructor() {
    // MVP: store sqlite in apps/api/storage/app.db
    const storageDir = path.join(process.cwd(), 'storage');
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

    const dbPath = path.join(storageDir, 'app.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        project_id TEXT PRIMARY KEY,
        title TEXT,
        story_text TEXT NOT NULL,
        duration_s INTEGER NOT NULL,
        style TEXT NOT NULL,
        pov TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS shots (
        project_id TEXT NOT NULL,
        shot_id TEXT NOT NULL,
        shot_order INTEGER NOT NULL,
        duration_s REAL NOT NULL,
        scene_desc TEXT NOT NULL,
        prompt_image TEXT NOT NULL,
        prompt_video TEXT NOT NULL,
        notes TEXT,
        main_keyframe_id TEXT,
        created_at TEXT NOT NULL,
        PRIMARY KEY(project_id, shot_id)
      );

      CREATE TABLE IF NOT EXISTS keyframes (
        project_id TEXT NOT NULL,
        shot_id TEXT NOT NULL,
        keyframe_id TEXT NOT NULL,
        kf_type TEXT NOT NULL,
        render_plan_json TEXT,
        image_path TEXT,
        planner_trace_id TEXT,
        renderer_trace_id TEXT,
        created_at TEXT NOT NULL,
        PRIMARY KEY(project_id, keyframe_id)
      );
    `);
  }
}
