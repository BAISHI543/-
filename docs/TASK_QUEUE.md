# TASK_QUEUE｜任务队列与并发建议（Gemini Planner + Gemini Renderer）

> 目标：让工程师实现“可排队、可重试、可观测”的生成系统。

## 1. 任务类型

### 1.1 PlanJob（生成Render Plan）
- 触发：点击“生成计划”、批量生成计划
- 输入：project_id, shot_id, kf_type(start/middle/end), constraints, ref_assets
- 输出：render_plan + planner trace_id

### 1.2 RenderJob（按Render Plan出图）
- 触发：点击“出图”、批量出图、重试出图
- 输入：keyframe_id, render_plan, attempt, retry_budget, renderer_params
- 输出：image_ref + renderer trace_id

## 2. 队列设计（最小可用）

建议两条队列：
- `planner-queue`
- `renderer-queue`

原因：
- Planner 通常更快、更轻
- Renderer 更耗时/更贵，需要单独限流

## 3. 并发与限流建议
- Planner：并发 5–20（视Gemini配额）
- Renderer：并发 1–5（先保守，避免爆成本）
- 对同一 project_id：限制并发（避免一次批量把配额打穿）

## 4. 重试模型

### 4.1 attempt 与 retry_budget
- 每个 RenderJob 带 attempt（从1开始）和 retry_budget（例如3）
- 失败时：根据 render_plan.retry_plan 或策略表生成下一次 RenderJob

### 4.2 失败分类（建议在render revision记录）
- `FACE_DRIFT`
- `OUTFIT_DRIFT`
- `BAD_COMPOSITION`
- `BACKGROUND_MESSY`
- `FORBIDDEN_CONTENT`
- `PROVIDER_TIMEOUT`
- `PROVIDER_RATE_LIMIT`

### 4.3 策略优先级（A=角色一致性优先）
- FACE/OUTFIT 类：优先上调角色 refs strength + 精简风格词
- COMPOSITION 类：保持角色 refs，改镜头语言，适当降低 scene/style

## 5. 可观测性（必须有）
- 每个 job：job_id、shot_id、keyframe_id、attempt、开始/结束时间、耗时
- 每次调用：保存 trace_id、model_version、错误码
- 成本：如能拿到token/价格，写入 revision.metrics

## 6. 取消与中断
- UI 支持取消 queued/running 任务（如果Gemini不支持中断，至少标记 job cancelled，回收结果）

## 7. 批量操作建议
- 批量生成计划：按 shot 顺序入队，优先 hook 段落
- 批量出图：先 start/middle/end 都出，再要求人工选 main
