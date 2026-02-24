# API_SPEC｜接口规范（Gemini 两段式：Planner → Renderer）

> 目标：给工程师可直接实现的请求/响应契约（示例以 JSON 表示）。
> 约定：所有写操作都必须落 `revision`。

## 0. 通用约定

### 0.1 鉴权
- 方案自定（JWT/Session/内网），本文不限定。

### 0.2 错误返回
统一：
```json
{ "error": { "code": "...", "message": "...", "details": {} } }
```
建议 code：
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `LOCKED`
- `RATE_LIMITED`
- `PROVIDER_ERROR`

### 0.3 状态字段
- Shot：`plan_status` / `render_status`：none/queued/running/succeeded/failed

---

## 1) Bible

### 1.1 生成/补全 Bible
`POST /api/bible/generate`

请求：
```json
{
  "project_id": "P001",
  "script_text": "...",
  "style_preset_id": "STYLE_ANIME_CEL",
  "constraints": {
    "duration_s": 60,
    "ratio": "9:16",
    "forbidden": ["..."],
    "consistency_mode": "strict_character"
  }
}
```

响应：
```json
{
  "project_id": "P001",
  "bible": { "characters": [], "scenes": [], "props": [], "global_rules": [], "forbidden": [] },
  "revision_id": "R_BIBLE_0001"
}
```

---

## 2) ShotList

### 2.1 生成 ShotList
`POST /api/shots/generate`

请求：
```json
{
  "project_id": "P001",
  "script_text": "...",
  "shot_count_hint": {"min": 18, "max": 30},
  "constraints": {"duration_s": 60, "ratio": "9:16"}
}
```

响应：
```json
{
  "project_id": "P001",
  "shots": [
    {
      "shot_id": "S001",
      "order": 1,
      "segment": "hook",
      "scene_id": "SC_...",
      "character_ids": ["CH_..."],
      "prop_ids": [],
      "intent": "...",
      "visual_brief": "...",
      "camera": {"shot_size": "close", "angle": "eye", "movement": "static", "composition": "centered"},
      "dialogue": [{"type": "subtitle", "text": "..."}],
      "audio": {"sfx": [], "bgm_mood": ""},
      "duration_s": 2.2,
      "keyframes": [],
      "plan_status": "none",
      "render_status": "none"
    }
  ],
  "revision_id": "R_SHOTLIST_0001"
}
```

---

## 3) Keyframe（两段式）

> 默认每镜 3+1：先生成 `start/middle/end` 三张；`main` 由人工从三者选择（规则C）。

### 3.1 生成 Render Plan（Planner）
`POST /api/shots/{shot_id}/keyframes/plan`

请求：
```json
{
  "project_id": "P001",
  "shot_id": "S012",
  "kf_type": "start",
  "constraints": {
    "ratio": "9:16",
    "size": {"width": 1080, "height": 1920},
    "render_mode": "draft",
    "consistency_mode": "strict_character",
    "forbidden": ["..."]
  },
  "ref_assets": [
    {"asset_id": "CH_A_face_01", "role": "character_face", "uri": "https://..."},
    {"asset_id": "SC_ROOM_01", "role": "scene", "uri": "https://..."}
  ]
}
```

响应：
```json
{
  "project_id": "P001",
  "shot_id": "S012",
  "keyframe_id": "KF_S012_start",
  "render_plan": {
    "prompt": "...",
    "negative_prompt": "...",
    "ref_plan": [
      {"asset_id": "CH_A_face_01", "role": "character_face", "strength": 0.85, "priority": 1, "purpose": "face consistency"},
      {"asset_id": "SC_ROOM_01", "role": "scene", "strength": 0.55, "priority": 2, "purpose": "scene mood"}
    ],
    "consistency_mode": "strict_character",
    "render_mode": "draft",
    "size": {"width": 1080, "height": 1920},
    "retry_plan": {"face_drift": {"ref_strength_delta": {"character_face": 0.1}}}
  },
  "planner": {"provider": "gemini", "model": "...", "trace_id": "T_PLAN_...", "revision_id": "R_PLAN_0001"},
  "plan_status": "succeeded"
}
```

### 3.2 按 Render Plan 出图（Renderer）
`POST /api/keyframes/{keyframe_id}/render`

请求：
```json
{
  "project_id": "P001",
  "keyframe_id": "KF_S012_start",
  "attempt": 1,
  "retry_budget": 3
}
```

响应：
```json
{
  "project_id": "P001",
  "keyframe_id": "KF_S012_start",
  "image_ref": {"type": "image", "uri": "https://.../P001_S012_start_rA1B2C3_1080x1920.png", "width": 1080, "height": 1920},
  "renderer": {"provider": "gemini", "model": "...", "trace_id": "T_RENDER_...", "seed": "", "revision_id": "R_RENDER_0001"},
  "render_status": "succeeded"
}
```

### 3.3 设定 main（规则C：人工选择）
`POST /api/shots/{shot_id}/keyframes/set-main`

请求：
```json
{
  "project_id": "P001",
  "shot_id": "S012",
  "from_keyframe_id": "KF_S012_middle"
}
```

响应：
```json
{
  "project_id": "P001",
  "shot_id": "S012",
  "main_keyframe_id": "KF_S012_main",
  "revision_id": "R_MANUAL_0007"
}
```

> 实现建议：
> - `KF_S012_main` 可以是“引用/别名”指向 `middle` 的 image_ref（不复制文件），并记录来源；或复制一份并写独立 keyframe_id。

### 3.4 锁定
- 锁定计划：`POST /api/shots/{shot_id}/lock-plan`（设置 `lock_render_plan=true`）
- 锁定最终图：`POST /api/shots/{shot_id}/lock-image`（设置 `lock_image=true`）

若锁定后触发重做/覆盖，应返回：
- `LOCKED`

---

## 4) 导出

### 4.1 导出前校验（强制，A规则）
`POST /api/exports/validate`

请求：
```json
{ "project_id": "P001", "scope": "final_or_locked" }
```

响应（失败示例）：
```json
{
  "ok": false,
  "errors": [
    {"code": "MISSING_MAIN_KEYFRAME", "shots": ["S005", "S012"]}
  ]
}
```

### 4.2 生成导出包
`POST /api/exports/build`

请求：
```json
{
  "project_id": "P001",
  "scope": "final_or_locked",
  "include": {"csv": true, "json": true, "images": true, "srt": false},
  "keyframe_set": "3+1"
}
```

响应：
```json
{
  "ok": true,
  "export_id": "EXP_0003",
  "zip_uri": "https://.../P001_xxx_v3_202602241530.zip",
  "revision_id": "R_EXPORT_0003"
}
```
