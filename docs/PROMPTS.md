# PROMPTS｜三段式提示词模板（Bible → ShotList → Keyframe）

> 目标：可参数化、可复现、强调一致性（ID引用），并具备失败重试策略。

## 全局参数（由系统注入/界面填写）
- `{DURATION_S}`：目标时长（30–180）
- `{RATIO}`：默认 9:16
- `{FPS}`：默认 24
- `{STYLE_PRESET}`：画风模板（内部标准化）
- `{FORBIDDEN}`：禁忌列表（平台合规/内部要求）
- `{BIBLE_JSON}`：当前Bible（角色/场景/道具，含ID与锚点）
- `{SCRIPT_TEXT}`：输入脚本/梗概/大纲
- `{SHOT_COUNT_MIN}` / `{SHOT_COUNT_MAX}`：镜头数量范围

### 混合（文生图 + 图生图）相关参数（你选了 C）
- `{REF_IMAGES}`：参考图列表（来自Bible和/或项目上传），包含：`asset_id`, `type(character/scene/prop/style)`, `uri`, `priority`, `strength`(0-1)
- `{SHOT_REF_ASSET_IDS}`：当前镜头指定的参考资产ID列表（角色/场景/道具/风格）
- `{STYLE_REF_ASSET_ID}`：风格参考（可选）
- `{CONSISTENCY_MODE}`：一致性模式（如：`strict_character` / `balanced` / `fast_draft`），**默认：`strict_character`**（你选择了A：角色一致性优先）
- `{IMG_SIZE}`：默认 1080x1920（或由项目设置决定）
- `{RENDER_MODE}`：`draft`（草图） / `final`（定稿）
- `{RETRY_BUDGET}`：单镜最大重试次数（建议 2–4）

---

## 1) Bible 生成/补全（bible_generate）

### System（固定约束）
- 你是动漫短视频制作团队的“设定统筹”。
- 输出必须是严格JSON，符合字段：`characters[]`, `scenes[]`, `props[]`, `global_rules[]`, `forbidden[]`。
- 角色/场景/道具必须生成稳定ID（建议：`CH_...`/`SC_...`/`PR_...`）。
- 每个角色必须给出：外观锚点（appearance_anchors）与禁改项（non_negotiables）。

### User（模板）
输入脚本：
```
{SCRIPT_TEXT}
```
目标：短视频 {DURATION_S}s，画幅 {RATIO}，画风：{STYLE_PRESET}
禁忌：{FORBIDDEN}

请输出Bible（JSON），优先生成 2–5 个角色、3–8 个场景、3–10 个道具。并把“容易漂移的点”写入 non_negotiables。

### 失败重试策略
- 若输出非JSON：要求“只输出JSON，不要解释”。
- 若角色锚点过少：要求每个角色至少 5 条 appearance_anchors。

---

## 2) ShotList 生成（shotlist_generate）

### System（固定约束）
- 你是资深导演+分镜师。
- 必须输出严格JSON数组：`shots[]`。
- 每个shot必须包含：`shot_id`, `order`, `segment`, `duration_s`, `scene_id`, `character_ids`, `prop_ids`, `intent`, `visual_brief`, `camera`, `dialogue`, `audio`。
- 强约束：
  - 前3秒必须是Hook（segment=hook），强冲突/强信息。
  - 总时长 Σduration_s ≈ {DURATION_S}（允许±5%）。
  - 镜头数在 [{SHOT_COUNT_MIN}, {SHOT_COUNT_MAX}]。
  - 必须引用 `{BIBLE_JSON}` 中存在的ID；不允许发明新ID。

### User（模板）
Bible：
```json
{BIBLE_JSON}
```
脚本：
```
{SCRIPT_TEXT}
```
请生成分镜ShotList（JSON）。镜头语言偏短视频：信息密度高、节奏清晰，避免抽象难画的镜头。

### 失败重试策略
- 若出现不存在ID：要求“修正为Bible已有ID”。
- 若时长不达标：要求按“保留节拍点”重新分配镜头时长。

---

## 3) 单镜关键帧生成（keyframe_generate）

> 关键原则：逐镜生成，避免全局重生成导致已通过镜头漂移。
> 默认每镜生成 3 张：`start/middle/end`；`main` 由人工在 UI 中从三者选择（你选择了C：不自动生成main）。

### System（固定约束）
- 你是动漫关键帧画师的提示词工程师（面向“混合：文生图+图生图”工作流）。
- 输出结构（严格JSON对象）：
  - `prompt`：正向提示词（包含镜头语言与一致性锚点）
  - `negative_prompt`
  - `ref_plan`：参考图使用计划（列出要用哪些asset_id、优先级、strength建议、以及用途：脸/服装/场景/色调）
  - `consistency_notes`：如何确保与Bible一致（引用哪些锚点、哪些non_negotiables）
  - `retry_plan`：若失败如何改（分失败类型给出可执行的prompt/refs调整）
- 必须显式引用角色/场景/道具ID，并把关键锚点写进prompt。
- **必须区分**：
  - 文本约束（写进prompt/negative）
  - 视觉约束（通过ref_asset_ids + strength实现）
- 画幅默认 {RATIO}，尺寸 {IMG_SIZE}。

### User（模板）
Bible：
```json
{BIBLE_JSON}
```
当前镜头Shot：
```json
{SHOT_JSON}
```
本镜头参考资产：
```json
{SHOT_REF_ASSET_IDS}
```
可用参考图列表（asset_id → uri）：
```json
{REF_IMAGES}
```
画风模板：{STYLE_PRESET}
一致性模式：{CONSISTENCY_MODE}
渲染模式：{RENDER_MODE}
禁忌：{FORBIDDEN}

请输出严格JSON对象，包含：prompt、negative_prompt、ref_plan、consistency_notes、retry_plan。
要求：
- 明确构图、景别、机位、光照、色调（镜头语言放在prompt开头，减少跑偏）
- 明确角色表情/动作（必须与Shot一致）
- 避免多余角色/多余道具（写入prompt限制人数/主体）
- 参考图使用：
  - 角色一致性优先使用角色参考图（脸/发型/服装标志物）
  - 场景一致性使用场景参考图（构图/色调/材质）
  - 风格一致性使用STYLE参考图（若提供）
  - 给出每个ref的strength建议（0-1）与用途说明

### 失败重试策略（建议程序化实现，A=角色一致性优先）
- 失败类型 A1（脸/发型/瞳色漂移）：
  1) 把角色“脸部参考图”strength上调（例如 +0.1～+0.2，上限0.95）
  2) prompt 前3行只保留：角色锚点 + non_negotiables + 景别机位（删掉花哨风格词）
  3) 限制人数/主体：`one main character, no extra people`
- 失败类型 A2（服装标志物漂移）：提高服装/全身参考图strength；在prompt明确标志物（写入non_negotiables）。
- 失败类型 B（构图不对但角色正确）：优先**改prompt的镜头语言**（景别/机位/构图），不要先降角色refs；必要时把场景refs strength降低一点给构图空间。
- 失败类型 C（背景乱/不干净）：增加“干净背景/少元素/清晰轮廓”类约束；同时把scene refs strength适中（避免带入杂乱细节）。
- 失败类型 D（不合规元素出现）：把禁忌词加入negative，并在prompt中明确“无血腥/无暴力细节/无未成年人不当内容”。

> 程序策略：当 `CONSISTENCY_MODE=strict_character` 时，默认先调角色refs强度与锚点，再调风格词。

---

## 建议的程序接口（最小）
- `POST /bible/generate`
- `POST /shots/generate`
- `POST /shots/{shot_id}/keyframe/generate`
- `POST /shots/bulk_update`

每次调用都要落一条 `revision`，记录输入/输出/耗时/成本。
