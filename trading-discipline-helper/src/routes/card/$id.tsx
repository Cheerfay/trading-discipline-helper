import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, ChevronDown, Trash2, Loader2 } from 'lucide-react';
import {
  getCardById,
  deleteCard,
  updateCard,
  attachPositionCard,
  SCENE_LABELS,
  type CalmStatus,
  type CalmCard,
  type PositionCard,
  type PositionHealthStatus,
} from '@/lib/trading';
import { apiPost, ApiError } from '@/lib/api-client';
import {
  isUnsupportedTradingInput,
  UNSUPPORTED_INPUT_MESSAGE,
} from '@/lib/trading/input-guard';
import { useState, useEffect, useRef } from 'react';

// Status visuals — muted, never alarming. No high-saturation red/green.
const STATUS_STYLE: Record<CalmStatus, { dot: string; text: string; bg: string }> = {
  can_think_but_wait: { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100' },
  pause_first: { dot: 'bg-amber-500', text: 'text-amber-800', bg: 'bg-[#FFF7ED]' },
  strong_pause: { dot: 'bg-orange-600', text: 'text-orange-900', bg: 'bg-orange-50' },
  review_not_trade: { dot: 'bg-slate-500', text: 'text-slate-700', bg: 'bg-stone-100' },
};

const POSITION_STATUS_STYLE: Record<PositionHealthStatus, { dot: string; text: string; bg: string }> = {
  looks_balanced: { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100' },
  worth_attention: { dot: 'bg-amber-500', text: 'text-amber-800', bg: 'bg-[#FFF7ED]' },
  too_concentrated: { dot: 'bg-orange-600', text: 'text-orange-900', bg: 'bg-orange-50' },
  not_enough_info: { dot: 'bg-slate-500', text: 'text-slate-700', bg: 'bg-stone-100' },
};

function CardDetailPage() {
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const [card, setCard] = useState(getCardById(id));
  const positionSectionRef = useRef<HTMLDivElement>(null);
  const shouldScrollToPositionRef = useRef(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  // Optional position-info supplement
  const [positionInput, setPositionInput] = useState('');
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  // Position health card
  const [showPositionBuilder, setShowPositionBuilder] = useState(false);
  const [positionHealthInput, setPositionHealthInput] = useState('');
  const [generatingPosition, setGeneratingPosition] = useState(false);
  const [positionError, setPositionError] = useState<string | null>(null);

  useEffect(() => {
    setCard(getCardById(id));
  }, [id]);

  useEffect(() => {
    if (!card?.positionCard || !shouldScrollToPositionRef.current) return;
    shouldScrollToPositionRef.current = false;
    requestAnimationFrame(() => {
      positionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [card?.positionCard?.id]);

  if (!card) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F5F0] text-slate-900">
        <header className="px-5 py-4">
          <div className="max-w-6xl mx-auto">
            <span className="font-medium text-slate-800">没有找到这张卡</span>
          </div>
        </header>
        <main className="flex-1 max-w-6xl mx-auto px-5 py-12 w-full text-center">
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
    if (isUnsupportedTradingInput(positionInput)) {
      setRefineError(UNSUPPORTED_INPUT_MESSAGE);
      return;
    }
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

  const handleGeneratePositionCard = async () => {
    if (!card || !positionHealthInput.trim()) return;
    if (isUnsupportedTradingInput(positionHealthInput)) {
      setPositionError(UNSUPPORTED_INPUT_MESSAGE);
      return;
    }
    setGeneratingPosition(true);
    setPositionError(null);

    const input = {
      sourceCardId: card.id,
      scene: card.type,
      symbol: card.symbol,
      userThought: card.userThought,
      positionText: positionHealthInput.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      const positionCard: PositionCard = await apiPost('/api/trading/generate-position-card', input);
      const next = attachPositionCard(card.id, positionCard);
      shouldScrollToPositionRef.current = true;
      if (next) setCard(next);
      setGeneratingPosition(false);
      setShowPositionBuilder(false);
      setPositionHealthInput('');
    } catch (err) {
      setGeneratingPosition(false);
      setPositionError(err instanceof ApiError ? err.message : '生成失败，请稍后重试');
    }
  };

  const statusStyle = STATUS_STYLE[card.calmStatus] ?? STATUS_STYLE.pause_first;

  // Scene-aware supplement copy + placeholder. Buy/add users may be flat or
  // lightly held, so don't presume they hold it; take-profit/cut users do hold it.
  const buyLike = card.type === 'buy' || card.type === 'add';
  const positionPrompt = card.positionInfoReason
    ? `这张卡还缺一个关键背景：${card.positionInfoReason}。补一句后，我会重新看这次操作本身。`
    : buyLike
      ? '这张卡还缺一个关键背景：仓位。用一句话说说目前空仓、或这只已经占了多少，这次大概想动多少；补完后我会重新看这次操作本身。'
      : '这张卡还缺一个关键背景：仓位。用一句话告诉我这只现在占你多少、这次大概想动多少；补完后我会重新看这次操作本身。';
  const positionPlaceholder = buyLike
    ? '例如：目前空仓，想先买 10 万试试'
    : '例如：现在占 20%，这次想卖一半';
  const positionHealthPlaceholder =
    '例如：我有茅台 30%、宁德 20%，剩下主要是现金；或者：这只现在占 25%，还想再加一点';

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F0] text-slate-900">
      {/* Header */}
      <header className="px-5 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
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

      <main className="flex-1 max-w-6xl mx-auto px-5 pb-12 w-full">
        <div className="max-w-3xl mx-auto">
          {/* ===== First-screen: minimal — headline + one action + status ===== */}
          <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-stone-100 p-6 sm:p-8 lg:p-9">
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

          {card.userThought && (
            <UserInputNote label="你这次问的是" text={card.userThought} className="mt-5" />
          )}

          {/* Lesson (review scenes only) */}
          {card.lesson && (
            <p className="mt-5 text-[14px] text-slate-500 leading-[1.8] italic">{card.lesson}</p>
          )}

          {/* One action */}
          <div className="mt-7 p-5 rounded-[18px] bg-[#FAFAF7] border border-stone-100">
            <p className="text-[13px] text-slate-400 mb-2">现在只做一件事</p>
            <p className="text-[15px] text-slate-800 leading-[1.8]">{card.oneAction}</p>
          </div>

          <CalmCardDetail
            card={card}
            showDetail={showDetail}
            onToggle={() => setShowDetail(!showDetail)}
          />
          </div>

          {/* ===== Optional position supplement (shown when the main card would
               be more accurate with position info) ===== */}
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
                '补充后重看这张卡'
              )}
            </button>
          </div>
          )}

          {/* ===== Position health card: the deeper second-layer check ===== */}
          <div ref={positionSectionRef} className="mt-4 scroll-mt-4 lg:scroll-mt-6">
          {card.positionCard ? (
            <PositionCardView positionCard={card.positionCard} />
          ) : (
            <div className="p-5 rounded-[20px] bg-white/70 border border-stone-200/70">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[14px] font-medium text-slate-700">再深入一层</p>
                  <p className="mt-1 text-[14px] text-slate-500 leading-relaxed">
                    {card.needsPositionInfo
                      ? '也可以先不重看主卡，直接看看仓位节奏。可以写整体持仓，也可以写这次打算动多少。'
                      : '看看仓位节奏稳不稳。可以写整体持仓，也可以写这次打算动多少；只查纪律和集中度。'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPositionBuilder(!showPositionBuilder)}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-slate-800 text-white text-[13px] hover:bg-slate-900 transition-colors"
                >
                  看看仓位节奏
                </button>
              </div>

              {showPositionBuilder && (
                <div className="mt-4">
                  <textarea
                    value={positionHealthInput}
                    onChange={(e) => {
                      setPositionHealthInput(e.target.value);
                      if (positionError) setPositionError(null);
                    }}
                    placeholder={positionHealthPlaceholder}
                    rows={4}
                    disabled={generatingPosition}
                    className="w-full px-4 py-3 rounded-[16px] bg-white border border-stone-200/80 focus:border-slate-300 outline-none transition-colors resize-none text-[15px] leading-relaxed placeholder:text-slate-400 disabled:opacity-60"
                  />
                  <p className="mt-2 text-[12px] text-slate-400">
                    能写比例最好；只写大概结构也可以。
                  </p>
                  {positionError && <p className="mt-2 text-[13px] text-amber-700">{positionError}</p>}
                  <button
                    onClick={handleGeneratePositionCard}
                    disabled={generatingPosition || !positionHealthInput.trim()}
                    className="mt-3 w-full py-2.5 rounded-2xl bg-slate-800 text-white text-[15px] font-medium hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {generatingPosition ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        正在看仓位节奏…
                      </>
                    ) : (
                      '帮我看看仓位安排'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
          </div>
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

function UserInputNote({
  label,
  text,
  className = '',
}: {
  label: string;
  text: string;
  className?: string;
}) {
  return (
    <div className={`rounded-[16px] bg-[#FAFAF7] border border-stone-100 px-4 py-3 ${className}`}>
      <p className="text-[12px] text-slate-400 mb-1.5">{label}</p>
      <p className="text-[14px] text-slate-500 leading-[1.7] line-clamp-3">{text}</p>
    </div>
  );
}

function CalmCardDetail({
  card,
  showDetail,
  onToggle,
}: {
  card: CalmCard;
  showDetail: boolean;
  onToggle: () => void;
}) {
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDetail) return;
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [showDetail]);

  const handleCollapse = () => {
    onToggle();
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div ref={detailRef} className="mt-6 border-t border-stone-100 pt-5 scroll-mt-4">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
      >
        {showDetail ? '收起分析详情' : '展开分析详情'}
        <ChevronDown className={`w-4 h-4 transition-transform ${showDetail ? 'rotate-180' : ''}`} />
      </button>

      {showDetail && (
        <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
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

          <DetailSection title="系统的几个观察">
            <div className="space-y-3.5">
              <QuietBar label="冲动程度" score={card.detail.scores.impulseRisk} higherWorse />
              <QuietBar label="仓位风险" score={card.detail.scores.positionRisk} higherWorse />
              <QuietBar label="理由完整度" score={card.detail.scores.reasonQuality} higherWorse={false} />
            </div>
          </DetailSection>

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

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleCollapse}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-medium text-slate-500 hover:text-slate-700 hover:bg-stone-100/70 transition-colors"
            >
              收起
              <ChevronDown className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PositionCardView({ positionCard }: { positionCard: PositionCard }) {
  const [showDetail, setShowDetail] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const statusStyle =
    POSITION_STATUS_STYLE[positionCard.status] ?? POSITION_STATUS_STYLE.worth_attention;

  useEffect(() => {
    if (!showDetail) return;
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [showDetail]);

  return (
    <section className="bg-white rounded-[24px] shadow-[0_8px_30px_rgba(15,23,42,0.05)] border border-stone-100 p-6">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${statusStyle.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
        <span className={`text-[12px] font-medium ${statusStyle.text}`}>
          {positionCard.statusText}
        </span>
      </span>

      <h2 className="text-[19px] font-semibold text-slate-900 mt-5 mb-3">仓位节奏卡</h2>
      <p className="text-[16px] text-slate-800 leading-[1.85]">{positionCard.headline}</p>

      {positionCard.positionText && (
        <UserInputNote label="你补充的仓位是" text={positionCard.positionText} className="mt-5" />
      )}

      <div className="mt-5 p-4 rounded-[18px] bg-[#FAFAF7] border border-stone-100">
        <p className="text-[13px] text-slate-400 mb-2">先看节奏</p>
        <p className="text-[15px] text-slate-800 leading-[1.8]">{positionCard.rhythmInsight}</p>
      </div>

      <div className="mt-4 p-4 rounded-[18px] bg-[#FAFAF7] border border-stone-100">
        <p className="text-[13px] text-slate-400 mb-2">现在只做一件事</p>
        <p className="text-[15px] text-slate-800 leading-[1.8]">{positionCard.oneAction}</p>
      </div>

      {positionCard.checkpoints.length > 0 && (
        <div className="mt-5">
          <p className="text-[13px] font-medium text-slate-400 mb-3">再问自己 3 个问题</p>
          <ol className="space-y-2.5">
            {positionCard.checkpoints.map((q, i) => (
              <li key={i} className="flex gap-3 text-[14px] text-slate-600 leading-relaxed">
                <span className="text-slate-300 font-medium shrink-0">{i + 1}</span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <button
        onClick={() => setShowDetail(!showDetail)}
        className="mt-5 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
      >
        展开仓位观察分析
        <ChevronDown className={`w-4 h-4 transition-transform ${showDetail ? 'rotate-180' : ''}`} />
      </button>

      {showDetail && (
        <div
          ref={detailRef}
          className="mt-4 space-y-3 scroll-mt-4 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          {positionCard.detail.findings.map((finding, i) => (
            <div key={i} className="rounded-[16px] border border-stone-100 bg-[#FAFAF7] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[14px] font-medium text-slate-700">{finding.title}</p>
                <span className="text-[12px] text-slate-400">{POSITION_LEVEL_LABELS[finding.level]}</span>
              </div>
              <p className="mt-2 text-[14px] text-slate-500 leading-relaxed">{finding.detail}</p>
            </div>
          ))}
          {positionCard.detail.notes.length > 0 && (
            <ul className="space-y-2 px-1">
              {positionCard.detail.notes.map((note, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-slate-500 leading-relaxed">
                  <span className="text-slate-300">·</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[12px] text-slate-400 leading-relaxed px-1">
            {positionCard.detail.disclaimer}
          </p>
        </div>
      )}
    </section>
  );
}

const POSITION_LEVEL_LABELS = {
  light: '偏轻',
  balanced: '合理',
  watch: '偏重',
  concentrated: '集中',
  unknown: '待补充',
};

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
