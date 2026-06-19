import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, ChevronDown, Trash2 } from 'lucide-react';
import { getReportById, deleteReport, type TradeType, type CalmStatus } from '@/lib/trading';
import { useState, useEffect } from 'react';

const TRADE_TYPE_LABELS: Record<TradeType, string> = {
  buy: '买入',
  sell: '卖出',
  add: '加仓',
  cut: '割肉',
  missed: '卖飞复盘',
  chase_loss: '追高亏损复盘',
};

const CALM_STATUS_CONFIG: Record<
  CalmStatus,
  { label: string; sub: string; ring: string; dot: string; text: string; bg: string }
> = {
  calm: {
    label: '可以理性决策',
    sub: '你现在的状态相对平稳',
    ring: 'ring-emerald-100',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
  },
  pause: {
    label: '建议先暂停一下',
    sub: '先别急，给自己一点思考的空间',
    ring: 'ring-amber-100',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
  },
  cool_down: {
    label: '强烈建议先冷静',
    sub: '此刻情绪可能正推着你下单',
    ring: 'ring-orange-100',
    dot: 'bg-orange-500',
    text: 'text-orange-700',
    bg: 'bg-orange-50',
  },
};

function CardDetailPage() {
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const [report, setReport] = useState(getReportById(id));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    setReport(getReportById(id));
  }, [id]);

  if (!report) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50 text-slate-900">
        <header className="border-b border-stone-200 bg-white">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <h1 className="text-lg font-semibold text-slate-800">报告未找到</h1>
          </div>
        </header>
        <main className="flex-1 max-w-2xl mx-auto px-4 py-12 w-full text-center">
          <p className="text-slate-600 mb-4">该冷静卡报告不存在或已被删除。</p>
          <Link to="/" className="text-slate-800 underline">
            返回首页
          </Link>
        </main>
      </div>
    );
  }

  const handleDelete = () => {
    deleteReport(id);
    navigate({ to: '/history' });
  };

  // Backward compatibility for reports saved before the redesign.
  const status: CalmStatus =
    report.calmStatus ??
    (report.scores.impulseRisk > 65 ? 'cool_down' : report.scores.impulseRisk >= 40 ? 'pause' : 'calm');
  const statusCfg = CALM_STATUS_CONFIG[status];
  const empathy = report.empathy || report.summary;
  const keyAction = report.keyAction || report.disciplineSuggestion;

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="p-2 -ml-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <span className="text-sm text-slate-400">
            {TRADE_TYPE_LABELS[report.input.type]} · {report.input.symbol}
          </span>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 -mr-2 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-600"
            title="删除"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-5 w-full">
        {/* ===== First screen: calm, minimal ===== */}
        <div className="min-h-[70vh] flex flex-col justify-center py-12">
          {/* Status pill */}
          <div className="flex justify-center mb-8">
            <div
              className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full ring-4 ${statusCfg.ring} ${statusCfg.bg}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${statusCfg.dot}`} />
              <span className={`text-sm font-medium ${statusCfg.text}`}>{statusCfg.label}</span>
            </div>
          </div>

          {/* Empathy line — the emotional anchor */}
          <p className="text-2xl sm:text-3xl font-semibold text-slate-800 text-center leading-relaxed tracking-tight mb-3">
            {empathy}
          </p>
          <p className="text-center text-slate-400 text-sm mb-10">{statusCfg.sub}</p>

          {/* The one key action */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
            <p className="text-xs font-medium text-slate-400 mb-2 tracking-wide">现在，只做这一件事</p>
            <p className="text-lg text-slate-800 leading-relaxed">{keyAction}</p>
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setShowFull(!showFull)}
            className="mt-8 mx-auto flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showFull ? '收起完整分析' : '展开完整分析'}
            <ChevronDown className={`w-4 h-4 transition-transform ${showFull ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* ===== Full analysis (collapsed by default) ===== */}
        {showFull && (
          <div className="space-y-4 pb-12 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Summary */}
            <Section title="当前决策摘要">
              <p className="text-slate-700 leading-relaxed">{report.summary}</p>
            </Section>

            {/* Scores */}
            <Section title="风险评估">
              <div className="space-y-4">
                <ScoreBar label="冲动风险" score={report.scores.impulseRisk} isGood={false} />
                <ScoreBar label="仓位风险" score={report.scores.positionRisk} isGood={false} />
                <ScoreBar label="决策理由质量" score={report.scores.reasonQuality} isGood={true} />
              </div>
            </Section>

            {/* Emotion Analysis */}
            {report.emotionAnalysis.length > 0 && (
              <Section title="情绪识别">
                <div className="space-y-3">
                  {report.emotionAnalysis.map((item, index) => (
                    <div key={index} className="p-3 bg-stone-50 rounded-lg">
                      <p className="font-medium text-slate-800 text-sm">{item.label}</p>
                      <p className="text-sm text-slate-600 mt-1">{item.explanation}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Risks */}
            {report.risks.length > 0 && (
              <Section title="主要风险点">
                <ul className="space-y-2">
                  {report.risks.map((risk, index) => (
                    <li key={index} className="flex items-start gap-2 text-slate-700 text-sm">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Open Questions */}
            {report.openQuestions.length > 0 && (
              <Section title="你还可以再想想">
                <ul className="space-y-2">
                  {report.openQuestions.map((question, index) => (
                    <li key={index} className="flex items-start gap-2 text-slate-700 text-sm">
                      <span className="text-slate-400 mt-0.5">·</span>
                      <span>{question}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Next Actions */}
            {report.nextActions.length > 0 && (
              <Section title="下一步行动清单">
                <ul className="space-y-2">
                  {report.nextActions.map((action, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm">
                      <div className="w-5 h-5 rounded border-2 border-stone-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-slate-400">{index + 1}</span>
                      </div>
                      <span className="text-slate-700">{action}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-slate-400 leading-relaxed px-1 pt-2">{report.disclaimer}</p>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">确认删除</h3>
            <p className="text-slate-600 mb-6 text-sm">删除后无法恢复，确定要删除这份冷静卡吗？</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 px-4 border border-stone-300 rounded-lg text-slate-700 hover:bg-stone-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-5">
      <h2 className="text-sm font-medium text-slate-500 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function ScoreBar({ label, score, isGood }: { label: string; score: number; isGood: boolean }) {
  const danger = isGood ? score < 50 : score > 50;
  const warn = isGood ? score >= 50 && score < 70 : score > 30 && score <= 50;
  const barColor = danger ? 'bg-orange-400' : warn ? 'bg-amber-400' : 'bg-emerald-400';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="text-sm font-medium text-slate-700">{score}</span>
      </div>
      <div className="w-full bg-stone-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/card/$id')({
  component: CardDetailPage,
  head: () => ({
    meta: [{ title: '冷静报告 — 交易冷静卡' }],
  }),
});
