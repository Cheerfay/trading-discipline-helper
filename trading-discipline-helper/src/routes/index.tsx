import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import type { Scene } from '@/lib/trading';

const SCENE_CHIPS: { value: Scene; label: string }[] = [
  { value: 'buy', label: '想买入' },
  { value: 'sell', label: '想卖出' },
  { value: 'add', label: '想加仓' },
  { value: 'cut', label: '想割肉' },
  { value: 'missed', label: '卖飞了' },
  { value: 'chase_loss', label: '追高亏了' },
  { value: 'unclear', label: '说不清，就是想动一下' },
];

function HomePage() {
  const navigate = useNavigate();
  const [thoughts, setThoughts] = useState('');
  const [scene, setScene] = useState<Scene | null>(null);
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (!thoughts.trim()) {
      setError(true);
      return;
    }
    // Pass the draft to the supplement page via sessionStorage (thoughts can be long).
    sessionStorage.setItem(
      'calm_card_draft',
      JSON.stringify({ thoughts: thoughts.trim(), scene: scene ?? 'unclear' })
    );
    navigate({ to: '/card/new', search: { scene: scene ?? 'unclear' } });
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
                if (error) setError(false);
              }}
              placeholder="把你现在真实的想法写下来，比如：我刚卖出一只股票，结果又涨了，很后悔，想买回来……"
              rows={5}
              className="w-full px-5 py-4 rounded-[20px] bg-white border border-stone-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.06)] focus:border-slate-300 focus:ring-0 outline-none transition-colors resize-none text-[15px] leading-relaxed placeholder:text-slate-400"
            />
            <p className="mt-2 text-[13px] text-slate-400 px-1">
              不用写得很专业，越真实越有帮助。
            </p>
            {error && (
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
                onClick={() => setScene(scene === chip.value ? null : chip.value)}
                className={`px-3.5 py-1.5 rounded-full text-[13px] transition-colors border ${
                  scene === chip.value
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white/60 text-slate-600 border-stone-200 hover:border-stone-300'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            className="mt-8 w-full py-3.5 rounded-2xl bg-slate-800 text-white font-medium hover:bg-slate-900 transition-colors"
          >
            生成冷静卡
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
