# STATE_MACHINE｜状态机与锁定规则（两段式：Plan → Render）

> 目标：把“能不能点按钮/能不能覆盖/失败怎么重试”讲清楚，工程实现不打架。

## 1. Shot 级状态

### 1.1 plan_status / render_status
- `none`：未生成
- `queued`：已入队
- `running`：生成中
- `succeeded`：成功（plan=有render_plan；render=有image_ref）
- `failed`：失败（保留失败revision）

建议 UI 显示：
- Plan：📝（计划）
- Render：🖼️（出图）

### 1.2 lock_render_plan / lock_image
- `lock_render_plan=true`：禁止“重做计划”（plan），允许“重试出图”（render）
- `lock_image=true`：禁止覆盖现有 image_ref（包括重试出图/批量重生）
- 兼容：`locked` 视为 `lock_image`

## 2. Keyframe 级状态（推荐实现）

建议把 Keyframe 也有 plan/render 状态（可直接复用 Shot 字段，或在 Keyframe 内部维护）：
- keyframe.plan_status
- keyframe.render_status

若你们不想在 Keyframe 层建状态，也至少要在 UI 里按 keyframe_id 展示计划与出图是否完成。

## 3. 按钮可用性（核心规则）

### 3.1 生成计划（Planner）
允许：
- shot.plan_status in [none, failed, succeeded] 且 lock_render_plan=false
禁止：
- lock_render_plan=true → 返回 `LOCKED`

### 3.2 出图（Renderer）
允许：
- 必须已有 render_plan
- lock_image=false
禁止：
- 无 render_plan → `VALIDATION_ERROR`
- lock_image=true → `LOCKED`

### 3.3 重试出图
允许：
- lock_image=false
- render_status=failed 或用户显式选择“重试”（会生成新render revision）
禁止：
- lock_image=true

### 3.4 设为 main（规则C）
- 允许从 start/middle/end 任意一个选择为 main
- main 的 image_ref 可指向所选 keyframe 的 image_ref（不复制文件）

## 4. 批量操作与锁定冲突
- 批量重生出图：
  - 跳过 lock_image=true 的镜头
  - 若 lock_render_plan=true，只允许 batch render，不允许 batch plan

## 5. 建议的服务端幂等与去重
- Planner：`input_hash = hash(bible + shot + constraints + ref_assets)`
  - 同 hash 的 plan 请求可直接返回缓存的 render_plan（可配置）
- Renderer：`input_hash = hash(render_plan + renderer_params)`
  - 同 hash 可复用上一次 image_ref（可配置）

## 6. 强制导出校验（A规则）
- scope=final_or_locked 时：每个 shot 必须有 main 关键帧，否则禁止导出
