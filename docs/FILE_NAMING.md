# FILE_NAMING｜命名规范（关键帧/导出包）

## 1. 基本原则
- 任意文件名必须可追溯：project + shot_id + keyframe_type + version。
- 目录结构固定，便于下游脚本读取。

## 2. 导出包结构（zip）

默认每镜 **3+1** 关键帧：`start/middle/end` + `main`。
- 其中 `main` 默认不自动生成，由人工从 start/middle/end 中选定（C规则）。

```
{project_id}_{title_slug}_v{export_version}_{yyyymmddHHMM}/
  shots.csv
  shots.xlsx               (可选)
  project.json
  bible.json
  revisions.json
  keyframes/
    {shot_id}/
      {project_id}_{shot_id}_start_r{revision_short}_{w}x{h}.png
      {project_id}_{shot_id}_middle_r{revision_short}_{w}x{h}.png
      {project_id}_{shot_id}_end_r{revision_short}_{w}x{h}.png
      {project_id}_{shot_id}_main_r{revision_short}_{w}x{h}.png
```

## 3. 关键帧图片文件名
模板：
- `{project_id}_{shot_id}_{kf_type}_r{revision_short}_{w}x{h}.{ext}`

示例：
- `P001_S012_main_rA1B2C3_1080x1920.png`
- `P001_S012_start_rA1B2C3_1080x1920.jpg`

字段说明：
- `project_id`：项目ID
- `shot_id`：镜头ID（S001…）
- `kf_type`：main/start/middle/end
- `revision_short`：revision_id短码（便于回溯）

## 4. shots.csv 字段建议（列）
- shot_id, order, segment, duration_s
- scene_id, character_ids, prop_ids
- intent, visual_brief
- camera.shot_size, camera.angle, camera.movement, camera.composition
- subtitle_text（可拼接dialogue中type=subtitle）
- sfx, bgm_mood
- main_keyframe_path

> 注意：CSV里路径应使用相对路径（相对导出根目录）。
