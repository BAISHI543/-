'use client';

import { useMemo, useState } from 'react';

type ProjectResponse = {
  project: any;
  shots: any[];
  keyframes: any[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

export default function HomePage() {
  const [title, setTitle] = useState('');
  const [storyText, setStoryText] = useState('');
  const [duration, setDuration] = useState(60);
  const [style, setStyle] = useState('动画风，日漫赛璐璐');
  const [pov, setPov] = useState<'第一人称' | '第三人称' | '自拍视角'>('第三人称');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProjectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shotsById = useMemo(() => {
    const map = new Map<string, any>();
    data?.shots?.forEach((s) => map.set(s.shot_id, s));
    return map;
  }, [data]);

  async function generateStoryboard() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/storyboard/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Untitled',
          story_text: storyText,
          duration_s: duration,
          style,
          pov
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as ProjectResponse;
      setData(json);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function planKeyframes(shotId: string) {
    if (!data?.project?.project_id) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/projects/${data.project.project_id}/shots/${shotId}/keyframes/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: data.project.project_id })
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as ProjectResponse;
      setData(json);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-semibold">小说 → 分镜 → 关键帧（MVP）</h1>
        <div className="rounded border p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm">标题</label>
              <input className="w-full border rounded px-2 py-1" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm">时长(秒)</label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min={30}
                  max={180}
                />
              </div>
              <div>
                <label className="text-sm">视角</label>
                <select className="w-full border rounded px-2 py-1" value={pov} onChange={(e) => setPov(e.target.value as any)}>
                  <option value="第一人称">第一人称</option>
                  <option value="第三人称">第三人称</option>
                  <option value="自拍视角">自拍视角</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm">风格</label>
            <input className="w-full border rounded px-2 py-1" value={style} onChange={(e) => setStyle(e.target.value)} />
          </div>

          <div>
            <label className="text-sm">故事内容</label>
            <textarea
              className="w-full border rounded px-2 py-2 h-40"
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              placeholder="粘贴小说/章节文本..."
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              className="rounded bg-black text-white px-3 py-2 disabled:opacity-50"
              disabled={loading || !storyText.trim()}
              onClick={generateStoryboard}
            >
              生成分镜
            </button>
            <span className="text-sm text-gray-600">API: {API_BASE}</span>
          </div>

          {error && <pre className="text-sm text-red-600 whitespace-pre-wrap">{error}</pre>}
        </div>

        {data && (
          <div className="space-y-4">
            <div className="rounded border p-4">
              <div className="text-sm text-gray-600">project_id: {data.project.project_id}</div>
              <div className="font-medium">{data.project.title}</div>
            </div>

            <div className="space-y-3">
              {data.shots.map((s) => (
                <div key={s.shot_id} className="rounded border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {s.shot_id} · {s.duration_s}s
                    </div>
                    <button className="rounded border px-3 py-1" disabled={loading} onClick={() => planKeyframes(s.shot_id)}>
                      生成计划(start/middle/end)
                    </button>
                  </div>
                  <div className="text-sm text-gray-700">{s.scene_desc}</div>
                  <details className="text-sm">
                    <summary className="cursor-pointer">提示词</summary>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <pre className="border rounded p-2 whitespace-pre-wrap">{s.prompt_image}</pre>
                      <pre className="border rounded p-2 whitespace-pre-wrap">{s.prompt_video}</pre>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
