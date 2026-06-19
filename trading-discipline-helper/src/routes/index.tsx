import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { saveCard, type Scene, type CalmCard } from '@/lib/trading';
import { apiPost, ApiError } from '@/lib/api-client';

const DRAFT_KEY = 'calm_card_home_draft';

const SCENE_CHIPS: { value: Scene; label: string }[] = [
  { value: 'buy', label: '想买入' },
  { value: 'sell', label: '想卖出' },
  { value: 'add', label: '想加仓' },
  { value: 'cut', label: '想割肉' },
  { value: 'missed', label: '卖飞了' },
  { value: 'chase_loss', label: '追高亏了' },
  { value: 'unclear', label: '说不清，就是想动一下' },
];

// Minimal local pre-check: only block obviously-empty input — no model call.
// "Real content" = at least a short genuine sentence, OR a scene chip picked.
function hasRealContent(thoughts: string, scene: Scene | null): boolean {
  const t = thoughts.trim();
  if (scene && t.length >= 2) return true; // chip + a couple chars is enough
  return t.length >= 6; // otherwise need a short real sentence
}

function HomePage() {
  const navigate = useNavigate();
  const [thoughts, setThoughts] = useState('');
  const [scene, setScene] = useState<Scene | null>(null);
  const [hint, setHint] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore a draft saved before navigating away (e.g. browser back button).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (typeof d.thoughts === 'string') setThoughts(d.thoughts);
        if (d.scene) setScene(d.scene);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist the draft as the user types/picks, so back navigation keeps it.
  useEffect(() => {
    if (!thoughts && !scene) {
      sessionStorage.removeItem(DRAFT_KEY);
      return;
    }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ thoughts, scene }));
  }, [thoughts, scene]);

  const handleSubmit = async () => {
    if (!hasRealContent(thoughts, scene)) {
      setHint(true);
      return;
    }
    setIsGenerating(true);
    setError(null);

    const input = {
      type: scene ?? 'unclear',
      symbol: '',
      thoughts: thoughts.trim(),
      emotions: [],
      plannedAmount: '',
      currentPositionRatio: '',
      maxLossTolerance: '',
      originalPlan: '',
      focusChecks: [],
      extraAnswers: {},
      createdAt: new Date().toISOString(),
    };

    try {
      const card: CalmCard = await apiPost('/api/trading/generate-report', input);
      saveCard(card);
      sessionStorage.removeItem(DRAFT_KEY); // generated successfully — clear draft
      setIsGenerating(false);
      navigate({ to: '/card/$id', params: { id: card.id } });
    } catch (err) {
      setIsGenerating(false);
      setError(err instanceof ApiError ? err.message : '生成失败，请稍后重试');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F0] text-slate-900">
      {/* Top nav */}
      <header className="px-5 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <span className="font-medium text-slate-800">交易冷静卡</span>
          <Link
            to="/history"
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            历史记录
          </Link>
        </div>
      </header>

      {/* First screen */}
      <main className="flex-1 flex flex-col justify-center px-5 pb-10">
        <div className="max-w-xl mx-auto w-full">
          {/* Title */}
          <h1 className="text-[2rem] sm:text-4xl font-semibold text-slate-900 leading-tight tracking-tight">
            现在很想操作？
            <br />
            先停 30 秒。
          </h1>
          <p className="mt-4 text-slate-500 leading-relaxed">
            我不会告诉你买什么、卖什么。
            <br />
            只帮你分清：这是计划，还是情绪。
          </p>

          {/* Main input */}
          <div className="mt-8">
            <textarea
              value={thoughts}
              onChange={(e) => {
                setThoughts(e.target.value);
                if (hint) setHint(false);
              }}
              placeholder="把你现在真实的想法写下来，比如：我刚卖出一只股票，结果又涨了，很后悔，想买回来……"
              rows={5}
              disabled={isGenerating}
              className="w-full px-5 py-4 rounded-[20px] bg-white border border-stone-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.06)] focus:border-slate-300 focus:ring-0 outline-none transition-colors resize-none text-[15px] leading-relaxed placeholder:text-slate-400 disabled:opacity-60"
            />
            <p className="mt-2 text-[13px] text-slate-400 px-1">
              不用写得很专业，越真实越有帮助。
            </p>
            {hint && (
              <p className="mt-2 text-[13px] text-amber-700 px-1">
                先写下你现在真实的想法，哪怕只有一句。
              </p>
            )}
          </div>

          {/* Scene chips */}
          <div className="mt-5 flex flex-wrap gap-2">
            {SCENE_CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                disabled={isGenerating}
                onClick={() => setScene(scene === chip.value ? null : chip.value)}
                className={`px-3.5 py-1.5 rounded-full text-[13px] transition-colors border disabled:opacity-60 ${
                  scene === chip.value
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white/60 text-slate-600 border-stone-200 hover:border-stone-300'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && <p className="mt-5 text-[13px] text-amber-700 px-1">{error}</p>}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isGenerating}
            className="mt-8 w-full py-3.5 rounded-2xl bg-slate-800 text-white font-medium hover:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                正在生成冷静卡…
              </>
            ) : (
              '生成冷静卡'
            )}
          </button>

          {/* Footer note */}
          <p className="mt-6 text-[13px] text-slate-400 text-center leading-relaxed">
            仅用于投资纪律检查与自我复盘，不构成投资建议。
          </p>
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute('/')({
  component: HomePage,
  head: () => ({
    meta: [
      { title: '交易冷静卡 — 先停 30 秒' },
      {
        name: 'description',
        content: '一个在交易上头时帮你先停下来的工具。不预测涨跌，不给买卖建议，只帮你分清这是计划，还是情绪。',
      },
    ],
  }),
});
