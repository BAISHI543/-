# UI_SPEC｜页面与交互细节

## 总体信息架构
- 左侧：项目列表/镜头列表（含缩略图）
- 中间：表单编辑区（结构化字段）
- 右侧：关键帧预览/生成参数/历史版本

> 关键交互原则：**单镜可控**、**可复现**、**可回滚**、**锁定不被覆盖**。

---

## 页面1：Project / Bible（项目与资产）

### 1.1 项目基础信息
- 标题、描述
- 时长（30–180s）、比例（默认9:16）、fps
- 风格模板（STYLE_PRESET）
- 镜头数建议（min/max）
- 禁忌/限制（FORBIDDEN）

### 1.2 Bible资产库
#### 角色（Characters）
字段：
- 角色ID（自动生成/可编辑但需唯一）
- 名称
- appearance_anchors（多条tag）
- non_negotiables（禁改项，多条tag）
- outfit_variants、expression_set
- 参考图上传（正/侧/背、表情）
- 锁定（locked）

#### 场景（Scenes）
字段：
- 场景ID
- 名称
- lighting_rules（如“室内暖光+窗外冷光”）
- color_palette（色板tag）
- time_of_day
- 参考图
- 锁定

#### 道具（Props）
字段：
- 道具ID
- 名称
- non_negotiables
- 参考图

### 1.3 生成按钮
- 生成/补全Bible（会创建revision）
- 生成ShotList（跳转到Storyboard页）

---

## 页面2：Storyboard（分镜+关键帧一体）

### 2.1 镜头列表（左）
每行显示：
- shot_id + order
- 状态（draft/review/locked/final）
- 缩略图（主关键帧）
- 时长（秒）
- 锁定图标

支持：
- 拖拽排序（更新order并生成revision）
- 多选（用于批量操作）

### 2.2 镜头编辑（中）
字段：
- segment（hook/setup/turn/payoff/tag）
- scene_id（下拉选择Bible场景）
- character_ids（多选）
- prop_ids（多选）
- intent（观众必须看见什么）
- visual_brief（可视化描述）
- camera：shot_size/angle/movement/composition/lens_feel
- dialogue：按行编辑（speaker_character_id + text + type）
- audio：sfx、bgm_mood
- duration_s

关键校验：
- scene/character/prop 必须来自Bible
- Σduration_s 接近目标时长（顶部显示进度条）
- 前3秒Hook提示（若不满足给红色提示）

### 2.3 关键帧区（右）
- 当前镜头关键帧组预览（start/middle/end/main）
- **规则（你选择了C）**：`main` 默认不自动生成；由用户在 UI 中从 start/middle/end 中**点选一个“设为main”**（必要时也可单独重渲染main）。
- 镜头列表缩略图使用 `main`；若未设置main，则显示占位并提示“请选择main”
- 生成参数：
  - prompt / negative
  - seed / model
  - ref_asset_ids（从Bible选择：角色脸/服装、场景、道具、风格）
  - ref_strength（可按ref分别设置；也可提供“角色/场景/风格”三档滑条）
  - consistency_mode（strict_character / balanced / fast_draft，默认 strict_character）
  - render_mode（draft / final）
  - （strict_character 默认滑条）角色refs强度高、场景refs中等、风格refs中等偏低
- 历史版本列表（按revision时间，展示：缩略图、planner_revision_id、render_revision_id、ref_plan摘要、seed/trace、操作者）

按钮（两段式）：
- 生成计划（Planner：生成Render Plan）
- 出图（Renderer：按Render Plan渲染关键帧）
- 重试出图（沿用计划；可选“仅调整refs强度/按retry_plan调整”）
- 重做计划（仅当未 lock_render_plan）
- 设为主关键帧（main）（从 start/middle/end 选择其一；可撤销/重新选择）
- 复制生成配置（Render Plan + refs + seed/trace）
- 锁定计划（lock_render_plan）
- 锁定最终图（lock_image，锁定后禁止覆盖）

### 2.4 批量操作（多选镜头）
- 批量改：scene_id、光色标注、bgm_mood、镜头语言模板
- 批量重生关键帧（跳过locked镜头）
- 批量统一光色（同scene_id分组执行）

---

## 页面3：Export（导出交付）

### 3.1 导出配置
- 导出范围：全部 / 仅final / 仅locked
- 每镜关键帧数量：1 / 2 / 4
- 图片格式：png/jpg
- 是否包含：
  - CSV/Excel
  - JSON
  - 字幕稿（SRT/纯文本）

### 3.2 一键打包
- 输出一个zip：
  - `shots.csv` / `shots.xlsx`
  - `keyframes/` 图片
  - `project.json`
  - `bible.json`
  - `revisions.json`

### 3.3 导出前校验（你选择了A：强制）
- **强制**：若存在 `final/locked` 镜头未选择 `main` 关键帧 → 禁止导出，并提示缺失清单（shot_id列表）
- 是否存在未绑定关键帧的final镜头
- 命名规范是否可生成
- 是否有引用不存在的资产ID

---

## 必备系统能力（非UI但必须实现）
- revision日志：每次生成/批量操作/导出都记录
- 锁定保护：locked镜头禁止被批量覆盖
- 可复现：保存prompt/negative/seed/ref_asset_ids
