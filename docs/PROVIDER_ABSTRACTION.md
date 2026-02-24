# PROVIDER_ABSTRACTION｜可插拔：Planner（Gemini）+ Renderer（出图引擎）

你选择了架构（两段式）：
- Planner：Gemini（负责理解脚本/镜头，产出 Render Plan）
- Renderer：Gemini（负责把 Render Plan 变成关键帧图）

说明：我们仍保留 Render Plan 这层“中间语言”，因为它能让你做到：单镜可控、锁定不漂移、失败只重试该镜、全链路可追溯。

## 1. 统一数据契约：Render Plan
Render Plan 是 Planner → Renderer 的“中间语言”，建议结构：
```json
{
  "prompt": "...",
  "negative_prompt": "...",
  "ref_plan": [
    {"asset_id":"CH_A_face_01","role":"character_face","strength":0.85,"priority":1,"purpose":"face consistency"}
  ],
  "size": {"width":1080,"height":1920},
  "consistency_mode": "strict_character",
  "render_mode": "draft",
  "retry_plan": {
    "face_drift": {"prompt_patch":"...","ref_strength_delta": {"character_face": 0.1}},
    "bad_composition": {"prompt_patch":"...","ref_strength_delta": {"scene": -0.1}}
  }
}
```

## 2. Planner 接口（Gemini）
- `POST /plan/keyframe`
  - 输入：Bible + Shot + 可用refs列表 + 约束
  - 输出：Render Plan + trace_id

## 3. Renderer 接口（可替换）
- `POST /render/keyframe`
  - 输入：Render Plan + renderer_specific_params
  - 输出：image_uri + used_seed + metrics

## 4. 为什么要拆分
- Gemini 擅长“理解与规划”，不一定是最强的像素渲染器。
- Renderer 可替换：你想换 SD/商用 API/自研都不需要重写上游分镜逻辑。
- 复现与追溯更清晰：planner revision 与 render revision 分开记。
