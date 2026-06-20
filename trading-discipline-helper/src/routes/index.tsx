import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState, useEffect, type FormEvent } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { saveCard, type Scene, type CalmCard } from '@/lib/trading';
import { apiPost, ApiError } from '@/lib/api-client';
import {
  isUnsupportedTradingInput,
  UNSUPPORTED_INPUT_MESSAGE,
} from '@/lib/trading/input-guard';

const DRAFT_KEY = 'calm_card_home_draft';

const SCENE_CHIPS: { value: Scene; label: string }[] = [
  { value: 'buy', label: '想买入' },
  { value: 'add', label: '想加仓' },
  { value: 'take_profit', label: '大涨后想卖' },
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

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!hasRealContent(thoughts, scene)) {
      setHint(true);
      return;
    }
    if (isUnsupportedTradingInput(thoughts)) {
      setHint(false);
      setError(UNSUPPORTED_INPUT_MESSAGE);
      return;
    }
    setHint(false);
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
    <div className="brake-page min-h-screen flex flex-col text-slate-900">
      {/* Top nav */}
      <header className="brake-nav px-5 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="inline-flex items-center gap-3 font-semibold text-white drop-shadow-[0_1px_8px_rgba(5,54,99,0.24)]">
            <img src="/logo.svg" alt="" className="h-7 w-7 rounded-lg shadow-[0_6px_16px_rgba(5,54,99,0.22)]" />
            交易冷静卡
          </span>
          <Link
            to="/history"
            className="rounded-full border border-white/28 bg-white/10 px-3 py-1.5 text-sm font-medium text-white/95 shadow-[0_1px_10px_rgba(5,54,99,0.08)] hover:border-white/55 hover:bg-white/15 transition-colors"
          >
            我的记录
          </Link>
        </div>
      </header>

      {/* First screen */}
      <main className="flex-1 px-5 pb-10 lg:pb-16">
        <div className="max-w-6xl mx-auto w-full pt-8 sm:pt-10 lg:pt-16">
          <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:gap-12 xl:gap-16 items-start">
            {/* Title */}
            <section className="max-w-xl">
              <h1 className="metal-hero-title text-[2.15rem] sm:text-[2.7rem] lg:text-[3.2rem] font-bold leading-[1.36]">
                少犯一次大错，
                <br />
                胜过小赚几次
              </h1>
              <p className="mt-6 text-[16px] lg:text-[16.5px] font-semibold text-white/90 leading-[1.85] max-w-xl drop-shadow-[0_1px_10px_rgba(5,54,99,0.18)]">
                给冲动交易踩一脚刹车。出手前，先过一遍理由、仓位和情绪。
              </p>
            </section>

            {/* Main input */}
            <form onSubmit={handleSubmit} className="brake-workbench w-full rounded-[22px] p-4 sm:p-5 lg:p-6">
              <div className="brake-input rounded-[17px] p-5">
                <textarea
                  value={thoughts}
                  onChange={(e) => {
                    setThoughts(e.target.value);
                    if (hint) setHint(false);
                  }}
                  placeholder="把你现在真实的想法写下来，比如：我刚卖出一只股票，结果又涨了，很后悔，想买回来……"
                  rows={7}
                  disabled={isGenerating}
                  className="w-full min-h-[190px] px-0 py-0 bg-transparent border-0 focus:ring-0 outline-none resize-none text-[15px] leading-relaxed text-stone-800 placeholder:text-[#10344e]/35 disabled:opacity-60"
                />
              </div>

              <p className="mt-3 px-1 text-[13px] text-stone-500">
                不用写得很专业，越真实越有帮助。
              </p>

              {hint && (
                <p className="mt-2 text-[13px] text-neutral-700">
                  先写下你现在真实的想法，哪怕只有一句。
                </p>
              )}

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
                        ? 'bg-[#0877c7] text-white border-[#0877c7] shadow-[0_0_0_2px_rgba(8,119,199,0.1)]'
                        : 'bg-white/72 text-[#075b96] border-dashed border-[#7ec5f2]/80 shadow-[0_2px_10px_rgba(8,119,199,0.04)] hover:border-solid hover:border-[#2582be]/65 hover:bg-white hover:text-[#064f84] active:scale-[0.98]'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Error */}
              {error && <p className="mt-5 text-[13px] text-neutral-700 px-1">{error}</p>}

              {/* Submit */}
              <button
                type="submit"
                disabled={isGenerating}
                className="brake-primary mt-7 w-full py-3.5 rounded-xl text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    正在帮你看…
                  </>
                ) : (
                  '先别急，看一眼'
                )}
              </button>

              {/* Footer note */}
              <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-stone-500 text-center leading-relaxed">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span>
                  仅用于投资纪律检查与自我复盘，不预测涨跌，不提供买卖建议。记录只保存在当前设备。
                </span>
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute('/')({
  component: HomePage,
  head: () => ({
    meta: [
      { title: '交易冷静卡 — 少犯一次大错，胜过小赚几次' },
      {
        name: 'description',
        content: '出手前，先过一遍：理由、仓位、情绪。一个帮你守住交易纪律的工具，不预测涨跌，不给买卖建议，只帮你看清这笔操作站不站得住。',
      },
    ],
  }),
});
