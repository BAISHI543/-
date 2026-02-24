# INTEGRATION_GEMINI｜Gemini 规划适配（strict_character 默认）

> 你选择了两段式方案（推荐）：
> - Step A：Gemini 生成 Render Plan（prompt/negative/ref_plan/retry_plan）
> - Step B：Gemini 根据 Render Plan 出关键帧图（失败只重试该镜）
>
> 本文定义：工具如何把“分镜/关键帧生成”落到 Gemini 的两段式实现上。
> 目标：可追溯（revision）、可复现（prompt/refs/seed）、可重试（预算与策略）。

## 1. 适配层原则
- **不要让前端直接调用 Gemini**：统一走你们后端服务层。
- Gemini 的职责分两段：
  - Planner（计划）：输出 Render Plan
  - Renderer（渲染）：读取 Render Plan，返回图片
- 所有输入统一归一到：
  - `bible` + `shot`
  - 可用参考资产列表（asset_id→uri）
  - 目标约束（ratio/size/render_mode/consistency_mode/forbidden）
- 所有输出统一归一到（Render Plan）：
  - `prompt`
  - `negative_prompt`
  - `ref_plan[]`（每个ref：asset_id/role/strength/priority/用途说明）
  - `retry_plan`（按失败类型给出下一次如何改prompt与ref_plan）
  - `trace_id` / `model_version` / `latency_ms` / `cost`（如可拿到）

> 真正出图由 **Gemini Renderer** 完成：输入 Render Plan（含refs与约束）→ 输出 image_uri + trace_id 等。

## 2. 输入字段映射（概念级）
- Shot → prompt 结构：镜头语言（景别/机位/构图）放在最前；角色锚点与non_negotiables紧随其后；场景与光色其后。
- Bible → refs：
  - `character_face`：角色脸部/发型参考（strict_character 最高优先级）
  - `character_outfit`：全身/服装标志物参考
  - `scene`：场景构图/色调参考
  - `style`：画风参考（在 strict_character 下默认较低强度，避免压过脸一致性）
  - `prop`：关键道具参考

## 3. strict_character 默认建议（工程可落默认值）
Gemini 生成的 `ref_plan` 建议默认强度（由 Gemini Renderer 支持的 strength 含义决定；若不支持，则在你们的渲染实现中把 strength 映射为“参考图选择/重复次数/提示词强调”等等）：
- character_face: 0.85
- character_outfit: 0.75
- scene: 0.55
- style: 0.35
- prop: 0.55

当检测到“角色漂移”重试：优先把 character_face 提到 0.90–0.95；同时精简prompt风格词。

## 4. 任务拆分与重试（Planner vs Renderer）

建议拆成两类任务：

### 4.1 Planner Job（Gemini：生成Render Plan）
- `plan_job_id`, `project_id`, `shot_id`, `render_mode`, `consistency_mode`
- 输出：Render Plan（prompt/negative/ref_plan/retry_plan）
- `input_hash`：bible+shot+约束的hash（用于缓存与去重）

### 4.2 Render Job（Gemini Renderer：真正出图）
- `render_job_id`, `project_id`, `shot_id`, `attempt`, `retry_budget`
- 输入：Render Plan + Gemini 渲染参数（size、质量档位、是否使用参考图、等）
- 输出：image_uri + trace_id + used_seed（若可得） + used_refs（若可得）

### 4.3 重试策略（建议实现为策略表）
- attempt=1：用 Gemini Planner 给出的默认 Render Plan
- attempt=2（角色漂移类）：按 retry_plan 上调 face strength + 精简风格词 + 限制人数（仍由 Gemini Renderer 出图）
- attempt=3（构图类）：锁定角色ref不变；改镜头语言描述；适当降低 scene/style 强度（仍由 Gemini Renderer 出图）

## 5. revision 落库要求（必须）
每次调用都写 `revision`，并区分 planner 与 renderer：

### 5.1 planner revision（Gemini）
- 输入：bible、shot、约束（render_mode/consistency_mode/ratio/size/forbidden）
- 输出：Render Plan（prompt/negative/ref_plan/retry_plan）+ trace_id/model_version/latency

### 5.2 render revision（Gemini Renderer）
- 输入：Render Plan + Gemini渲染参数（size、质量档位等）
- 输出：image_uri、trace_id、used_seed（若可得）、used_refs（若可得）、latency、错误码（如失败）

## 6. 注意事项
- 如果 Gemini 不支持严格seed：
  - UI 仍显示 seed 字段，但标注为“追溯ID/尝试号”；真正可复现依赖 prompt+refs+trace_id。
- 如果 Gemini 对多参考图有限制：
  - strict_character 下优先保留：face + outfit + scene（style可降级为纯文本风格模板）。
