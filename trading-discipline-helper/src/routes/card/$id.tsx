import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, ChevronDown, Trash2, Loader2 } from 'lucide-react';
import {
  getCardById,
  deleteCard,
  updateCard,
  SCENE_LABELS,
  type CalmStatus,
  type CalmCard,
} from '@/lib/trading';
import { apiPost, ApiError } from '@/lib/api-client';
import { useState, useEffect } from 'react';

// Status visuals — muted, never alarming. No high-saturation red/green.
const STATUS_STYLE: Record<CalmStatus, { dot: string; text: string; bg: string }> = {
  can_think_but_wait: { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100' },
  pause_first: { dot: 'bg-amber-500', text: 'text-amber-800', bg: 'bg-[#FFF7ED]' },
  strong_pause: { dot: 'bg-orange-600', text: 'text-orange-900', bg: 'bg-orange-50' },
  review_not_trade: { dot: 'bg-slate-500', text: 'text-slate-700', bg: 'bg-stone-100' },
};

function CardDetailPage() {
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const [card, setCard] = useState(getCardById(id));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  // Optional position-info supplement
  const [positionInput, setPositionInput] = useState('');
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

  useEffect(() => {
    setCard(getCardById(id));
  }, [id]);

  if (!card) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F5F0] text-slate-900">
        <header className="px-5 py-4">
          <div className="max-w-xl mx-auto">
            <span className="font-medium text-slate-800">没有找到这张卡</span>
          </div>
        </header>
        <main className="flex-1 max-w-xl mx-auto px-5 py-12 w-full text-center">
          <p className="text-slate-600 mb-4">这张冷静卡不存在或已被删除。</p>
          <Link to="/" className="text-slate-800 underline underline-offset-4">
            回到首页
          </Link>
        </main>
      </div>
    );
  }

  const handleDelete = () => {
    deleteCard(id);
    navigate({ to: '/history' });
  };

  // Merge the supplemented position info with the original thought and
  // regenerate a fresh card in place (same id, same list position).
  const handleRefine = async () => {
    if (!card || !positionInput.trim()) return;
    setRefining(true);
    setRefineError(null);

    const input = {
      type: card.type,
      symbol: card.symbol,
      thoughts: card.userThought,
      emotions: [],
      plannedAmount: '',
      currentPositionRatio: positionInput.trim(),
      maxLossTolerance: '',
      originalPlan: '',
      focusChecks: [],
      extraAnswers: { 仓位补充: positionInput.trim() },
      createdAt: new Date().toISOString(),
    };

    try {
      const next: CalmCard = await apiPost('/api/trading/generate-report', input);
      // Keep the original id so the list position and the URL stay stable.
      const merged: CalmCard = { ...next, id: card.id, needsPositionInfo: false };
      updateCard(card.id, merged);
      setCard(merged);
      setPositionInput('');
      setRefining(false);
    } catch (err) {
      setRefining(false);
      setRefineError(err instanceof ApiError ? err.message : '更新失败，请稍后重试');
    }
  };

  const statusStyle = STATUS_STYLE[card.calmStatus] ?? STATUS_STYLE.pause_first;

  // Scene-aware supplement copy + placeholder. "Buy/add" users may be flat or
  // lightly held, so don't presume they hold it; "sell/cut" users do hold it.
  const buyLike = card.type === 'buy' || card.type === 'add';
  const positionPrompt = buyLike
    ? '想让我看得更准一点？用一句话说说你的仓位情况——比如目前空仓、或这只已经占了多少，这次大概想动多少。'
    : '想让我看得更准一点？用一句话告诉我：这只现在占你多少，这次大概想动多少。';
  const positionPlaceholder = buyLike
    ? '例如：目前空仓，想先买 10 万试试'
    : '例如：现在占 20%，这次想卖一半';

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F0] text-slate-900">
      {/* Header */}
      <header className="px-5 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="p-2 -ml-2 hover:bg-black/5 rounded-lg transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-medium text-slate-800 leading-tight">冷静卡</h1>
              <p className="text-[12px] text-slate-400 truncate">
                {SCENE_LABELS[card.type]}
                {card.symbol ? ` · ${card.symbol}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 -mr-2 hover:bg-black/5 rounded-lg transition-colors text-slate-400 hover:text-slate-600 shrink-0"
            title="删除"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto px-5 pb-12 w-full">
        {/* ===== First-screen: minimal — headline + one action + status ===== */}
        <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-stone-100 p-6 sm:p-8">
          {/* Status badge */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${statusStyle.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
            <span className={`text-[12px] font-medium ${statusStyle.text}`}>{card.calmStatusText}</span>
          </span>

          {/* Title */}
          <h2 className="text-[22px] font-semibold text-slate-900 mt-5 mb-4">先别急</h2>

          {/* Headline — the single most important thing on the screen */}
          <p className="text-[18px] sm:text-[19px] text-slate-800 leading-[1.85]">
            {card.headline || [card.emotionalOpening, card.coreInsight].filter(Boolean).join(' ')}
          </p>

          {/* Lesson (review scenes only) */}
          {card.lesson && (
            <p className="mt-5 text-[14px] text-slate-500 leading-[1.8] italic">{card.lesson}</p>
          )}

          {/* One action */}
          <div className="mt-7 p-5 rounded-[18px] bg-[#FAFAF7] border border-stone-100">
            <p className="text-[13px] text-slate-400 mb-2">现在只做一件事</p>
            <p className="text-[15px] text-slate-800 leading-[1.8]">{card.oneAction}</p>
          </div>
        </div>

        {/* ===== Optional position supplement (shown only when the card
             would be more accurate with position info) ===== */}
        {card.needsPositionInfo && (
          <div className="mt-4 p-5 rounded-[20px] bg-[#FAFAF7] border border-stone-200/70">
            <p className="text-[14px] text-slate-600 leading-relaxed mb-3">
              {positionPrompt}
            </p>
            <input
              type="text"
              value={positionInput}
              onChange={(e) => setPositionInput(e.target.value)}
              placeholder={positionPlaceholder}
              disabled={refining}
              className="w-full px-4 py-3 rounded-[16px] bg-white border border-stone-200/80 focus:border-slate-300 outline-none transition-colors text-[15px] placeholder:text-slate-400 disabled:opacity-60"
            />
            {refineError && <p className="mt-2 text-[13px] text-amber-700">{refineError}</p>}
            <button
              onClick={handleRefine}
              disabled={refining || !positionInput.trim()}
              className="mt-3 w-full py-2.5 rounded-2xl bg-slate-800 text-white text-[15px] font-medium hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {refining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在重新看…
                </>
              ) : (
                '让卡片更准一点'
              )}
            </button>
          </div>
        )}

        {/* ===== Collapsed detail ===== */}
        <div className="mt-5">
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="mx-auto flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            展开看看系统怎么判断的
            <ChevronDown className={`w-4 h-4 transition-transform ${showDetail ? 'rotate-180' : ''}`} />
          </button>

          {showDetail && (
            <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
              {/* Self-check questions */}
              {card.selfCheckQuestions.length > 0 && (
                <DetailSection title="如果还想继续操作，先问自己 3 个问题">
                  <ol className="space-y-2.5">
                    {card.selfCheckQuestions.map((q, i) => (
                      <li key={i} className="flex gap-3 text-[15px] text-slate-700 leading-relaxed">
                        <span className="text-slate-300 font-medium shrink-0">{i + 1}</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ol>
                </DetailSection>
              )}

              {/* Emotion analysis */}
              {card.detail.emotionAnalysis.length > 0 && (
                <DetailSection title="情绪识别">
                  <div className="space-y-3">
                    {card.detail.emotionAnalysis.map((item, i) => (
                      <div key={i}>
                        <p className="text-[14px] font-medium text-slate-700">{item.label}</p>
                        <p className="text-[14px] text-slate-500 mt-0.5 leading-relaxed">{item.explanation}</p>
                      </div>
                    ))}
                  </div>
                </DetailSection>
              )}

              {/* Scores — quiet text + thin bars, no big red bars */}
              <DetailSection title="系统的几个观察">
                <div className="space-y-3.5">
                  <QuietBar label="冲动程度" score={card.detail.scores.impulseRisk} higherWorse />
                  <QuietBar label="仓位风险" score={card.detail.scores.positionRisk} higherWorse />
                  <QuietBar label="理由完整度" score={card.detail.scores.reasonQuality} higherWorse={false} />
                </div>
              </DetailSection>

              {/* Risks */}
              {card.detail.risks.length > 0 && (
                <DetailSection title="可以再留意的点">
                  <ul className="space-y-2">
                    {card.detail.risks.map((risk, i) => (
                      <li key={i} className="flex gap-2 text-[14px] text-slate-600 leading-relaxed">
                        <span className="text-slate-300 mt-0.5">·</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </DetailSection>
              )}

              {/* Next actions */}
              {card.detail.nextActions.length > 0 && (
                <DetailSection title="如果之后还想做，可以先">
                  <ul className="space-y-2">
                    {card.detail.nextActions.map((action, i) => (
                      <li key={i} className="flex gap-3 text-[14px] text-slate-600 leading-relaxed">
                        <span className="text-slate-300 shrink-0">{i + 1}</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </DetailSection>
              )}

              <p className="text-[12px] text-slate-400 leading-relaxed px-1 pt-1">
                {card.detail.disclaimer}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[24px] p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">删除这张卡？</h3>
            <p className="text-slate-500 mb-6 text-sm">删除后无法恢复。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 px-4 border border-stone-200 rounded-2xl text-slate-700 hover:bg-stone-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 px-4 bg-slate-800 text-white rounded-2xl hover:bg-slate-900 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-[20px] border border-stone-100 p-5">
      <h3 className="text-[13px] font-medium text-slate-400 mb-3">{title}</h3>
      {children}
    </section>
  );
}

function QuietBar({ label, score, higherWorse }: { label: string; score: number; higherWorse: boolean }) {
  // Concerning = high when higherWorse, low otherwise. Use warm amber for
  // "worth attention", neutral slate otherwise — no green, no bright red.
  const concerning = higherWorse ? score >= 60 : score <= 40;
  const barColor = concerning ? 'bg-amber-400' : 'bg-slate-300';
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[14px] text-slate-600">{label}</span>
        <span className="text-[13px] text-slate-400">{score}</span>
      </div>
      <div className="w-full bg-stone-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/card/$id')({
  component: CardDetailPage,
  head: () => ({
    meta: [{ title: '冷静卡 — 交易冷静卡' }],
  }),
});
