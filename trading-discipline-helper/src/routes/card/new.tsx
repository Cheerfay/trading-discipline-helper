import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { saveReport, type TradeType, type Emotion, type FocusCheck, type TradeReport } from '@/lib/trading';
import { apiPost, ApiError } from '@/lib/api-client';

const TRADE_TYPE_LABELS: Record<TradeType, string> = {
  buy: '买入前冷静卡',
  sell: '卖出前冷静卡',
  add: '加仓前冷静卡',
  cut: '割肉前冷静卡',
  missed: '卖飞复盘卡',
  chase_loss: '追高亏损复盘卡',
};

const EMOTION_OPTIONS: { value: Emotion; label: string }[] = [
  { value: 'excited', label: '兴奋' },
  { value: 'anxious', label: '焦虑' },
  { value: 'fomo', label: '害怕错过' },
  { value: 'regret', label: '后悔' },
  { value: 'panic', label: '恐慌' },
  { value: 'unwilling', label: '不甘心' },
  { value: 'want_recover', label: '想回本' },
  { value: 'certain', label: '很确定' },
  { value: 'other', label: '其他' },
];

const FOCUS_CHECK_OPTIONS: { value: FocusCheck; label: string }[] = [
  { value: 'check_impulse', label: '是否上头' },
  { value: 'check_position', label: '仓位是否过高' },
  { value: 'check_reason', label: '理由是否充分' },
  { value: 'check_calm', label: '是否该冷静' },
  { value: 'check_plan', label: '是否违反原计划' },
  { value: 'check_review', label: '如何复盘这次错误' },
];

function CardNewPage() {
  const navigate = useNavigate();
  const { type } = Route.useSearch();
  const tradeType = (type || 'buy') as TradeType;

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [symbol, setSymbol] = useState('');
  const [thoughts, setThoughts] = useState('');
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [plannedAmount, setPlannedAmount] = useState('');
  const [currentPositionRatio, setCurrentPositionRatio] = useState('');
  const [maxLossTolerance, setMaxLossTolerance] = useState('');
  const [originalPlan, setOriginalPlan] = useState('');
  const [focusChecks, setFocusChecks] = useState<FocusCheck[]>([]);

  // Type-specific fields
  const [buyWhyNow, setBuyWhyNow] = useState('');
  const [buyIfDown, setBuyIfDown] = useState('');
  const [buyCounterView, setBuyCounterView] = useState('');

  const [sellWhyNow, setSellWhyNow] = useState('');
  const [sellPlanMatch, setSellPlanMatch] = useState('');
  const [sellIfUp, setSellIfUp] = useState('');

  const [addReason, setAddReason] = useState('');
  const [addReasonType, setAddReasonType] = useState('');
  const [addFinalRatio, setAddFinalRatio] = useState('');

  const [cutWhyNow, setCutWhyNow] = useState('');
  const [cutReasonType, setCutReasonType] = useState('');
  const [cutIfRebound, setCutIfRebound] = useState('');

  const [missedWhySold, setMissedWhySold] = useState('');
  const [missedHadPlan, setMissedHadPlan] = useState('');
  const [missedRegretReason, setMissedRegretReason] = useState('');
  const [missedWantChase, setMissedWantChase] = useState('');

  const [chaseWhyBuy, setChaseWhyBuy] = useState('');
  const [chaseInfluence, setChaseInfluence] = useState('');
  const [chaseHadStopLoss, setChaseHadStopLoss] = useState('');
  const [chaseMainProblem, setChaseMainProblem] = useState('');

  const toggleEmotion = (emotion: Emotion) => {
    setEmotions(prev =>
      prev.includes(emotion) ? prev.filter(e => e !== emotion) : [...prev, emotion]
    );
  };

  const toggleFocusCheck = (check: FocusCheck) => {
    setFocusChecks(prev =>
      prev.includes(check) ? prev.filter(c => c !== check) : [...prev, check]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);

    // Build extra answers based on type
    const extraAnswers: Record<string, string> = {};

    if (tradeType === 'buy') {
      extraAnswers.buyWhyNow = buyWhyNow;
      extraAnswers.buyIfDown = buyIfDown;
      extraAnswers.buyCounterView = buyCounterView;
    } else if (tradeType === 'sell') {
      extraAnswers.sellWhyNow = sellWhyNow;
      extraAnswers.sellPlanMatch = sellPlanMatch;
      extraAnswers.sellIfUp = sellIfUp;
    } else if (tradeType === 'add') {
      extraAnswers.addReason = addReason;
      extraAnswers.addReasonType = addReasonType;
      extraAnswers.addFinalRatio = addFinalRatio;
    } else if (tradeType === 'cut') {
      extraAnswers.cutWhyNow = cutWhyNow;
      extraAnswers.cutReasonType = cutReasonType;
      extraAnswers.cutIfRebound = cutIfRebound;
    } else if (tradeType === 'missed') {
      extraAnswers.missedWhySold = missedWhySold;
      extraAnswers.missedHadPlan = missedHadPlan;
      extraAnswers.missedRegretReason = missedRegretReason;
      extraAnswers.missedWantChase = missedWantChase;
    } else if (tradeType === 'chase_loss') {
      extraAnswers.chaseWhyBuy = chaseWhyBuy;
      extraAnswers.chaseInfluence = chaseInfluence;
      extraAnswers.chaseHadStopLoss = chaseHadStopLoss;
      extraAnswers.chaseMainProblem = chaseMainProblem;
    }

    const input = {
      type: tradeType,
      symbol,
      thoughts,
      emotions,
      plannedAmount,
      currentPositionRatio,
      maxLossTolerance,
      originalPlan,
      focusChecks,
      extraAnswers,
      createdAt: new Date().toISOString(),
    };

    try {
      const report: TradeReport = await apiPost('/api/trading/generate-report', input);
      saveReport(report);
      setIsGenerating(false);
      navigate({ to: '/card/$id', params: { id: report.id } });
    } catch (err) {
      setIsGenerating(false);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('生成报告失败，请稍后重试');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            to="/"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">{TRADE_TYPE_LABELS[tradeType]}</h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Common Fields */}
          <FormField
            label="操作标的"
            placeholder="例如：贵州茅台 / 腾讯控股 / 纳斯达克ETF"
            value={symbol}
            onChange={setSymbol}
            required
          />

          <FormField
            label="当前想法"
            placeholder="请直接写下你现在真实的想法，比如最近涨得很好，群里都在说，我怕错过……"
            value={thoughts}
            onChange={setThoughts}
            textarea
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">当前情绪（可多选）</label>
            <div className="flex flex-wrap gap-2">
              {EMOTION_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleEmotion(option.value)}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${
                    emotions.includes(option.value)
                      ? 'bg-slate-800 text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <FormField
            label="本次计划操作金额或仓位"
            placeholder="例如：5万元 / 总资产10% / 卖出一半"
            value={plannedAmount}
            onChange={setPlannedAmount}
          />

          <FormField
            label="当前该标的已占总投资资产比例"
            placeholder="例如：0% / 15% / 40%"
            value={currentPositionRatio}
            onChange={setCurrentPositionRatio}
          />

          <FormField
            label="如果判断错误，你最多能接受亏损多少？"
            placeholder="例如：亏损10% / 亏损2万元 / 不能接受明显亏损"
            value={maxLossTolerance}
            onChange={setMaxLossTolerance}
          />

          <FormField
            label="你原本有没有交易计划？"
            placeholder="如果有，请写下原计划；如果没有，也请如实填写没有"
            value={originalPlan}
            onChange={setOriginalPlan}
            textarea
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">你希望 AI 帮你重点检查什么？（可多选）</label>
            <div className="flex flex-wrap gap-2">
              {FOCUS_CHECK_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleFocusCheck(option.value)}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${
                    focusChecks.includes(option.value)
                      ? 'bg-slate-800 text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type-specific fields */}
          {tradeType === 'buy' && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-medium text-slate-700">买入相关问题</h3>
              <FormField
                label="为什么是现在买？"
                placeholder="请说明买入时机选择的理由"
                value={buyWhyNow}
                onChange={setBuyWhyNow}
                textarea
              />
              <FormField
                label="如果买入后下跌 20%，你会怎么办？"
                placeholder="请说明你的应对策略"
                value={buyIfDown}
                onChange={setBuyIfDown}
                textarea
              />
              <FormField
                label="你有没有看过反方观点？"
                placeholder="请说明你了解到的反方观点"
                value={buyCounterView}
                onChange={setBuyCounterView}
                textarea
              />
            </div>
          )}

          {tradeType === 'sell' && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-medium text-slate-700">卖出相关问题</h3>
              <FormField
                label="为什么是现在卖？"
                placeholder="请说明卖出时机选择的理由"
                value={sellWhyNow}
                onChange={setSellWhyNow}
                textarea
              />
              <FormField
                label="这次卖出是否符合原计划？"
                placeholder="请说明是否符合你的原计划"
                value={sellPlanMatch}
                onChange={setSellPlanMatch}
                textarea
              />
              <FormField
                label="如果卖出后继续上涨，你能否接受？"
                placeholder="请诚实回答"
                value={sellIfUp}
                onChange={setSellIfUp}
                textarea
              />
            </div>
          )}

          {tradeType === 'add' && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-medium text-slate-700">加仓相关问题</h3>
              <FormField
                label="加仓的新增理由是什么？"
                placeholder="请说明加仓的新增理由"
                value={addReason}
                onChange={setAddReason}
                textarea
              />
              <FormField
                label="是因为更看好，还是因为想摊低成本？"
                placeholder="请诚实回答"
                value={addReasonType}
                onChange={setAddReasonType}
                textarea
              />
              <FormField
                label="加仓后该标的总仓位会是多少？"
                placeholder="例如：30% / 50%"
                value={addFinalRatio}
                onChange={setAddFinalRatio}
              />
            </div>
          )}

          {tradeType === 'cut' && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-medium text-slate-700">割肉相关问题</h3>
              <FormField
                label="是什么让你现在想卖出？"
                placeholder="请说明触发卖出的原因"
                value={cutWhyNow}
                onChange={setCutWhyNow}
                textarea
              />
              <FormField
                label="是投资逻辑变了，还是亏损让你难受？"
                placeholder="请诚实回答"
                value={cutReasonType}
                onChange={setCutReasonType}
                textarea
              />
              <FormField
                label="如果卖出后反弹，你能否接受？"
                placeholder="请诚实回答"
                value={cutIfRebound}
                onChange={setCutIfRebound}
                textarea
              />
            </div>
          )}

          {tradeType === 'missed' && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-medium text-slate-700">卖飞复盘问题</h3>
              <FormField
                label="当时为什么卖出？"
                placeholder="请说明当时卖出的理由"
                value={missedWhySold}
                onChange={setMissedWhySold}
                textarea
              />
              <FormField
                label="卖出前是否有计划？"
                placeholder="请说明当时是否有明确的卖出计划"
                value={missedHadPlan}
                onChange={setMissedHadPlan}
                textarea
              />
              <FormField
                label="现在后悔的主要原因是什么？"
                placeholder="请说明后悔的具体原因"
                value={missedRegretReason}
                onChange={setMissedRegretReason}
                textarea
              />
              <FormField
                label="你是否想追高买回？"
                placeholder="请诚实回答"
                value={missedWantChase}
                onChange={setMissedWantChase}
                textarea
              />
            </div>
          )}

          {tradeType === 'chase_loss' && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-medium text-slate-700">追高亏损复盘问题</h3>
              <FormField
                label="当时为什么追高买入？"
                placeholder="请说明追高的原因"
                value={chaseWhyBuy}
                onChange={setChaseWhyBuy}
                textarea
              />
              <FormField
                label="是否受到群聊、博主、朋友或热门消息影响？"
                placeholder="请说明受到的影响来源"
                value={chaseInfluence}
                onChange={setChaseInfluence}
                textarea
              />
              <FormField
                label="买入前有没有设置止损或退出条件？"
                placeholder="请说明是否有止损计划"
                value={chaseHadStopLoss}
                onChange={setChaseHadStopLoss}
                textarea
              />
              <FormField
                label="现在最大的问题是什么？"
                placeholder="请说明当前面临的主要问题"
                value={chaseMainProblem}
                onChange={setChaseMainProblem}
                textarea
              />
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">生成失败</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
            <button
              type="submit"
              disabled={isGenerating || !symbol || !thoughts}
              className="w-full py-3 px-4 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  生成冷静报告中...
                </>
              ) : (
                '生成冷静报告'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  required?: boolean;
}

function FormField({ label, placeholder, value, onChange, textarea, required }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-all resize-none"
          required={required}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
          required={required}
        />
      )}
    </div>
  );
}

export const Route = createFileRoute('/card/new')({
  component: CardNewPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      type: (search.type as string) || 'buy',
    };
  },
  head: () => ({
    meta: [{ title: '创建冷静卡 — 交易冷静卡' }],
  }),
});
