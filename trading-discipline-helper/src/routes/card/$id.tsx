import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Clock, AlertTriangle, CheckCircle, AlertCircle, Share2, Trash2 } from 'lucide-react';
import { getReportById, deleteReport, type TradeType } from '@/lib/trading';
import { useState, useEffect } from 'react';

const TRADE_TYPE_LABELS: Record<TradeType, string> = {
  buy: '买入',
  sell: '卖出',
  add: '加仓',
  cut: '割肉',
  missed: '卖飞复盘',
  chase_loss: '追高亏损复盘',
};

function getScoreColor(score: number, isGood: boolean): string {
  if (isGood) {
    // Higher is better
    if (score >= 70) return 'text-emerald-600 bg-emerald-50';
    if (score >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  } else {
    // Lower is better (risk)
    if (score <= 30) return 'text-emerald-600 bg-emerald-50';
    if (score <= 50) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  }
}

function getScoreLabel(score: number, isGood: boolean): string {
  if (isGood) {
    if (score >= 70) return '良好';
    if (score >= 50) return '一般';
    return '需改进';
  } else {
    if (score <= 30) return '低风险';
    if (score <= 50) return '中等风险';
    return '高风险';
  }
}

function CardDetailPage() {
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const [report, setReport] = useState(getReportById(id));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setReport(getReportById(id));
  }, [id]);

  if (!report) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <h1 className="text-lg font-semibold text-slate-800">报告未找到</h1>
          </div>
        </header>
        <main className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full text-center">
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

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/history"
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">冷静报告</h1>
              <p className="text-sm text-slate-500">{TRADE_TYPE_LABELS[report.input.type]} · {report.input.symbol}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-500 hover:text-red-600"
              title="删除"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full space-y-6">
        {/* Summary */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start gap-3 mb-4">
            <Clock className="w-5 h-5 text-slate-500 mt-0.5" />
            <div>
              <h2 className="text-sm font-medium text-slate-500 mb-1">决策摘要</h2>
              <p className="text-slate-800">{report.summary}</p>
              <p className="text-xs text-slate-400 mt-2">{formatDate(report.createdAt)}</p>
            </div>
          </div>
        </section>

        {/* Scores */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">风险评估</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ScoreCard
              label="冲动风险"
              score={report.scores.impulseRisk}
              isGood={false}
            />
            <ScoreCard
              label="仓位风险"
              score={report.scores.positionRisk}
              isGood={false}
            />
            <ScoreCard
              label="决策理由质量"
              score={report.scores.reasonQuality}
              isGood={true}
            />
          </div>
        </section>

        {/* Emotion Analysis */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">情绪识别</h2>
          <div className="space-y-3">
            {report.emotionAnalysis.map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <BrainIcon className="w-5 h-5 text-slate-500 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-800">{item.label}</p>
                  <p className="text-sm text-slate-600">{item.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Risks */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            主要风险点
          </h2>
          <ul className="space-y-2">
            {report.risks.map((risk, index) => (
              <li key={index} className="flex items-start gap-2 text-slate-700">
                <span className="text-amber-500 mt-1">•</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Open Questions */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-500" />
            你还没有想清楚的问题
          </h2>
          <ul className="space-y-2">
            {report.openQuestions.map((question, index) => (
              <li key={index} className="flex items-start gap-2 text-slate-700">
                <span className="text-blue-500 mt-1">?</span>
                <span>{question}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Discipline Suggestion */}
        <section className="bg-slate-800 rounded-xl p-6 text-white">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            建议冷静动作
          </h2>
          <p className="text-slate-200 leading-relaxed">{report.disciplineSuggestion}</p>
        </section>

        {/* Next Actions */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">下一步行动清单</h2>
          <ul className="space-y-2">
            {report.nextActions.map((action, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded border-2 border-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-slate-400">{index + 1}</span>
                </div>
                <span className="text-slate-700">{action}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Disclaimer */}
        <section className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <p className="font-medium mb-1">风险提示</p>
          <p className="text-amber-700">{report.disclaimer}</p>
        </section>

        {/* Original Input (collapsible) */}
        <details className="bg-white rounded-xl border border-slate-200 p-6">
          <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-800">
            查看原始输入
          </summary>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <span className="text-slate-500">操作标的：</span>
              <span className="text-slate-800">{report.input.symbol}</span>
            </div>
            <div>
              <span className="text-slate-500">当前想法：</span>
              <p className="text-slate-800 mt-1">{report.input.thoughts}</p>
            </div>
            <div>
              <span className="text-slate-500">当前情绪：</span>
              <span className="text-slate-800">{report.input.emotions.join('、')}</span>
            </div>
            <div>
              <span className="text-slate-500">计划仓位：</span>
              <span className="text-slate-800">{report.input.plannedAmount}</span>
            </div>
            <div>
              <span className="text-slate-500">当前仓位：</span>
              <span className="text-slate-800">{report.input.currentPositionRatio}</span>
            </div>
            <div>
              <span className="text-slate-500">可接受亏损：</span>
              <span className="text-slate-800">{report.input.maxLossTolerance}</span>
            </div>
            <div>
              <span className="text-slate-500">原计划：</span>
              <p className="text-slate-800 mt-1">{report.input.originalPlan || '无'}</p>
            </div>
          </div>
        </details>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">确认删除</h3>
            <p className="text-slate-600 mb-6">删除后无法恢复，确定要删除这份冷静卡吗？</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
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

interface ScoreCardProps {
  label: string;
  score: number;
  isGood: boolean;
}

function ScoreCard({ label, score, isGood }: ScoreCardProps) {
  const colorClass = getScoreColor(score, isGood);
  const labelClass = getScoreLabel(score, isGood);

  return (
    <div className="p-4 bg-slate-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-600">{label}</span>
        <span className={`text-xs px-2 py-1 rounded-full ${colorClass}`}>{labelClass}</span>
      </div>
      <div className="text-3xl font-bold text-slate-800">{score}</div>
      <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
        <div
          className={`h-2 rounded-full transition-all ${
            isGood
              ? score >= 70
                ? 'bg-emerald-500'
                : score >= 50
                ? 'bg-amber-500'
                : 'bg-red-500'
              : score <= 30
              ? 'bg-emerald-500'
              : score <= 50
              ? 'bg-amber-500'
              : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

export const Route = createFileRoute('/card/$id')({
  component: CardDetailPage,
  head: () => ({
    meta: [{ title: '冷静报告 — 交易冷静卡' }],
  }),
});
