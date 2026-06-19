import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, ChevronDown, AlertCircle } from 'lucide-react';
import { saveCard, type Scene, type Emotion, type CalmCard } from '@/lib/trading';
import { apiPost, ApiError } from '@/lib/api-client';

const EMOTION_OPTIONS: { value: Emotion; label: string }[] = [
  { value: 'excited', label: '兴奋' },
  { value: 'anxious', label: '焦虑' },
  { value: 'fomo', label: '害怕错过' },
  { value: 'regret', label: '后悔' },
  { value: 'panic', label: '恐慌' },
  { value: 'unwilling', label: '不甘心' },
  { value: 'want_recover', label: '想回本' },
  { value: 'certain', label: '很确定' },
];

function CardNewPage() {
  const navigate = useNavigate();
  const { scene } = Route.useSearch();
  const tradeScene = (scene || 'unclear') as Scene;

  const [thoughts, setThoughts] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 3 core fields
  const [symbol, setSymbol] = useState('');
  const [plannedAmount, setPlannedAmount] = useState('');
  const [currentPositionRatio, setCurrentPositionRatio] = useState('');
  const [emotions, setEmotions] = useState<Emotion[]>([]);

  // Collapsed extras
  const [showMore, setShowMore] = useState(false);
  const [originalPlan, setOriginalPlan] = useState('');
  const [maxLossTolerance, setMaxLossTolerance] = useState('');
  const [counterView, setCounterView] = useState('');
  const [exitCondition, setExitCondition] = useState('');

  // Load draft (thoughts) from the homepage.
  useEffect(() => {
    const draft = sessionStorage.getItem('calm_card_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.thoughts) setThoughts(parsed.thoughts);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const toggleEmotion = (emotion: Emotion) => {
    setEmotions((prev) =>
      prev.includes(emotion) ? prev.filter((e) => e !== emotion) : [...prev, emotion]
    );
  };

  const handleSubmit = async () => {
    if (!thoughts.trim()) {
      setError('先写下你现在真实的想法，哪怕只有一句。');
      return;
    }
    setIsGenerating(true);
    setError(null);

    const input = {
      type: tradeScene,
      symbol: symbol.trim(),
      thoughts: thoughts.trim(),
      emotions,
      plannedAmount: plannedAmount.trim(),
      currentPositionRatio: currentPositionRatio.trim(),
      maxLossTolerance: maxLossTolerance.trim(),
      originalPlan: originalPlan.trim(),
      focusChecks: [],
      extraAnswers: {
        是否看过反方观点: counterView.trim(),
        退出条件: exitCondition.trim(),
      },
      createdAt: new Date().toISOString(),
    };

    try {
      const card: CalmCard = await apiPost('/api/trading/generate-report', input);
      saveCard(card);
      sessionStorage.removeItem('calm_card_draft');
      setIsGenerating(false);
      navigate({ to: '/card/$id', params: { id: card.id } });
    } catch (err) {
      setIsGenerating(false);
      setError(err instanceof ApiError ? err.message : '生成失败，请稍后重试');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F0] text-slate-900">
      {/* Header */}
      <header className="px-5 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2 hover:bg-black/5 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <span className="font-medium text-slate-800">再补充 3 个信息</span>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto px-5 pb-12 w-full">
        <p className="text-slate-500 text-[15px] mb-7">不需要精确，凭感觉写也可以。</p>

        <div className="space-y-5">
          <Field
            label="操作标的"
            placeholder="例如：腾讯控股 / 纳斯达克ETF / 某只股票"
            value={symbol}
            onChange={setSymbol}
          />
          <Field
            label="这次大概会动用多少金额或仓位？"
            placeholder="例如：5 万元 / 总资金 10% / 卖出一半"
            value={plannedAmount}
            onChange={setPlannedAmount}
          />
          <Field
            label="当前这只标的占你总投资资产多少？"
            placeholder="例如：0% / 15% / 40%"
            value={currentPositionRatio}
            onChange={setCurrentPositionRatio}
          />

          {/* Emotion */}
          <div>
            <label className="block text-[15px] text-slate-700 mb-3">现在最强的情绪是什么？</label>
            <div className="flex flex-wrap gap-2">
              {EMOTION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleEmotion(option.value)}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] transition-colors border ${
                    emotions.includes(option.value)
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white/60 text-slate-600 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Collapsed extras */}
        <div className="mt-7">
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            我想补充更多背景
            <ChevronDown className={`w-4 h-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
          </button>

          {showMore && (
            <div className="mt-5 space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
              <Field
                label="原计划是什么？"
                placeholder="如果有，写下来；没有也可以如实写"
                value={originalPlan}
                onChange={setOriginalPlan}
                textarea
              />
              <Field
                label="最多能接受亏多少？"
                placeholder="例如：亏 10% / 亏 2 万元"
                value={maxLossTolerance}
                onChange={setMaxLossTolerance}
              />
              <Field
                label="是否看过反方观点？"
                placeholder="如果看过，简单写下你了解到的反方理由"
                value={counterView}
                onChange={setCounterView}
                textarea
              />
              <Field
                label="退出条件是什么？"
                placeholder="什么情况下你会离场"
                value={exitCondition}
                onChange={setExitCondition}
                textarea
              />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 bg-[#FFF7ED] border border-amber-200/70 rounded-2xl flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{error}</p>
          </div>
        )}

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
      </main>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  textarea,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="block text-[15px] text-slate-700 mb-2">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full px-4 py-3 rounded-[18px] bg-white border border-stone-200/80 focus:border-slate-300 outline-none transition-colors resize-none text-[15px] leading-relaxed placeholder:text-slate-400"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-[18px] bg-white border border-stone-200/80 focus:border-slate-300 outline-none transition-colors text-[15px] placeholder:text-slate-400"
        />
      )}
    </div>
  );
}

export const Route = createFileRoute('/card/new')({
  component: CardNewPage,
  validateSearch: (search: Record<string, unknown>) => ({
    scene: (search.scene as string) || 'unclear',
  }),
  head: () => ({
    meta: [{ title: '再补充 3 个信息 — 交易冷静卡' }],
  }),
});
