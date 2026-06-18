/**
 * Trading Discipline Card - Mock Report Generation
 * This is a rule-based mock implementation. Replace with real LLM API later.
 */

import type {
  TradeCardInput,
  TradeReport,
  EmotionAnalysis,
  Scores,
} from './types';

const IMPULSE_KEYWORDS = [
  '害怕错过',
  '怕错过',
  '上头',
  '群里',
  '博主',
  '朋友说',
  '连续上涨',
  '不想错过',
  '回本',
  '不甘心',
  '恐慌',
  '受不了',
  '赶紧',
  '立刻',
  '抄底',
  '起飞',
  'fomo',
  'FOMO',
];

const REASON_KEYWORDS = [
  '财报',
  '估值',
  '现金流',
  '利润',
  '基本面',
  '商业模式',
  '竞争优势',
  '行业',
  '长期',
  '反证',
  '风险',
  '退出条件',
  '计划',
];

const EMOTION_LABELS: Record<string, string> = {
  excited: '兴奋',
  anxious: '焦虑',
  fomo: '害怕错过 (FOMO)',
  regret: '后悔',
  panic: '恐慌',
  unwilling: '不甘心',
  want_recover: '想回本',
  certain: '很确定',
  other: '其他',
};

const FOCUS_CHECK_LABELS: Record<string, string> = {
  check_impulse: '是否上头',
  check_position: '仓位是否过高',
  check_reason: '理由是否充分',
  check_calm: '是否该冷静',
  check_plan: '是否违反原计划',
  check_review: '如何复盘这次错误',
};

const TRADE_TYPE_LABELS: Record<string, string> = {
  buy: '买入',
  sell: '卖出',
  add: '加仓',
  cut: '割肉',
  missed: '卖飞复盘',
  chase_loss: '追高亏损复盘',
};

function calculateImpulseRisk(input: TradeCardInput): number {
  let score = 30;
  const text = (input.thoughts + ' ' + input.emotions.join(' ')).toLowerCase();

  for (const keyword of IMPULSE_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      score += 10;
    }
  }

  // Emotion-based adjustment
  if (input.emotions.includes('fomo')) score += 15;
  if (input.emotions.includes('panic')) score += 15;
  if (input.emotions.includes('want_recover')) score += 10;
  if (input.emotions.includes('unwilling')) score += 10;

  return Math.min(score, 95);
}

function calculatePositionRisk(input: TradeCardInput): number {
  const ratio = input.currentPositionRatio;

  if (ratio.includes('0%') || ratio.includes('空仓')) return 20;
  if (ratio.includes('10%') || ratio.includes('5%') || ratio.includes('8%')) return 30;
  if (ratio.includes('15%') || ratio.includes('20%')) return 50;
  if (ratio.includes('30%') || ratio.includes('40%')) return 70;
  if (ratio.includes('50%') || ratio.includes('60%') || ratio.includes('70%')) return 90;

  // Try to parse percentage
  const match = ratio.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num <= 10) return 30;
    if (num <= 20) return 50;
    if (num <= 40) return 70;
    return 90;
  }

  return 50;
}

function calculateReasonQuality(input: TradeCardInput): number {
  let score = 60;
  const text = input.thoughts.toLowerCase();

  // Check for good reason keywords
  for (const keyword of REASON_KEYWORDS) {
    if (text.includes(keyword)) {
      score += 5;
    }
  }

  // Penalize for no original plan
  if (!input.originalPlan || input.originalPlan.trim() === '没有' || input.originalPlan.trim() === '') {
    score -= 15;
  }

  // Penalize for short thoughts
  if (input.thoughts.length < 20) {
    score -= 10;
  }

  // Bonus for specific focus checks
  if (input.focusChecks.includes('check_reason')) score += 5;
  if (input.focusChecks.includes('check_plan')) score += 5;

  return Math.max(5, Math.min(score, 95));
}

function generateEmotionAnalysis(input: TradeCardInput): EmotionAnalysis[] {
  const analysis: EmotionAnalysis[] = [];
  const text = input.thoughts.toLowerCase();

  if (input.emotions.includes('fomo')) {
    analysis.push({
      label: 'FOMO (害怕错过)',
      explanation: '你提到害怕错过，这通常意味着受到市场情绪或他人影响，而非基于独立判断。',
    });
  }

  if (input.emotions.includes('panic')) {
    analysis.push({
      label: '恐慌',
      explanation: '恐慌情绪可能导致非理性决策，建议先冷静下来再评估。',
    });
  }

  if (input.emotions.includes('regret') || input.emotions.includes('want_recover')) {
    analysis.push({
      label: '后悔驱动 / 想回本',
      explanation: '基于过去的亏损或错失机会做决策，容易陷入"沉没成本谬误"。',
    });
  }

  if (input.emotions.includes('unwilling')) {
    analysis.push({
      label: '不甘心',
      explanation: '不甘心可能导致"加仓摊低成本"的危险行为，而非基于当前投资逻辑。',
    });
  }

  if (text.includes('博主') || text.includes('群里') || text.includes('朋友')) {
    analysis.push({
      label: '从众心理',
      explanation: '你的决策可能受到他人影响，建议独立验证信息来源。',
    });
  }

  if (text.includes('成本') || text.includes('买入价')) {
    analysis.push({
      label: '锚定成本',
      explanation: '过度关注买入成本而非当前价值，可能导致错误的卖出决策。',
    });
  }

  if (input.emotions.includes('certain')) {
    analysis.push({
      label: '过度自信',
      explanation: '过度自信可能导致忽视风险，建议保持审慎态度。',
    });
  }

  if (analysis.length === 0) {
    analysis.push({
      label: '情绪状态相对稳定',
      explanation: '当前未检测到明显的情绪偏差，但仍需理性评估决策。',
    });
  }

  return analysis;
}

function generateRisks(input: TradeCardInput, scores: Scores): string[] {
  const risks: string[] = [];

  if (scores.impulseRisk > 60) {
    risks.push('当前决策中情绪成分较强，建议先冷静24小时后再评估。');
  }

  if (scores.positionRisk > 60) {
    risks.push('当前仓位或计划仓位可能过高，单票风险暴露较大。');
  }

  if (scores.reasonQuality < 50) {
    risks.push('当前决策理由不够充分，缺乏基本面或长期逻辑支撑。');
  }

  if (!input.originalPlan || input.originalPlan.trim() === '没有') {
    risks.push('本次操作缺少明确的交易计划，建议先制定计划再执行。');
  }

  if (input.type === 'add' && input.thoughts.includes('摊成本')) {
    risks.push('加仓可能只是为了摊低成本，而非投资逻辑增强，这是危险信号。');
  }

  if (input.type === 'cut' && input.emotions.includes('panic')) {
    risks.push('割肉决策可能受恐慌情绪驱动，而非投资逻辑被证伪。');
  }

  if (input.type === 'missed' && input.emotions.includes('regret')) {
    risks.push('卖飞后的后悔可能导致追高买回，建议先复盘原计划。');
  }

  if (input.type === 'chase_loss') {
    risks.push('追高买入往往发生在情绪高点，风险收益比不利。');
  }

  if (!input.maxLossTolerance || input.maxLossTolerance.includes('不能接受')) {
    risks.push('缺少明确的亏损边界，建议先设定最大可接受亏损。');
  }

  // Ensure at least 3 risks
  while (risks.length < 3) {
    risks.push('建议补充反证信息，思考什么情况下你的判断会是错误的。');
  }

  return risks.slice(0, 5);
}

function generateOpenQuestions(input: TradeCardInput): string[] {
  const questions: string[] = [];

  if (!input.maxLossTolerance || input.maxLossTolerance.includes('不能接受')) {
    questions.push('如果这笔交易亏损20%，你是否仍能接受？');
  }

  if (input.currentPositionRatio.includes('40%') || input.currentPositionRatio.includes('50%')) {
    questions.push('这次操作是否会突破你的单票仓位上限？');
  }

  questions.push('你有没有看过反方观点？什么情况下你的判断会是错误的？');

  if (!input.originalPlan || input.originalPlan.trim() === '没有') {
    questions.push('你的退出条件是什么？什么情况下应该卖出？');
  }

  questions.push('这次操作是在执行计划，还是在缓解情绪？');

  if (input.type === 'buy' || input.type === 'add') {
    questions.push('如果买入后继续下跌20%，你会怎么办？');
  }

  if (input.type === 'sell' || input.type === 'cut') {
    questions.push('如果卖出后继续上涨，你能否接受？');
  }

  return questions.slice(0, 5);
}

function generateDisciplineSuggestion(input: TradeCardInput, scores: Scores): string {
  if (scores.impulseRisk > 70) {
    return '建议先进入24小时冷静期，避免在情绪高点做决策。冷静期结束后，重新评估你的理由是否充分。';
  }

  if (scores.positionRisk > 70) {
    return '建议将本次操作拆成更小仓位，严格控制单票风险暴露。同时补充退出条件和止损边界。';
  }

  if (scores.reasonQuality < 40) {
    return '建议先补充买入/卖出的核心理由，包括基本面分析、估值判断、以及反证条件。理由不充分时，不做操作。';
  }

  if (input.type === 'missed' && input.emotions.includes('regret')) {
    return '建议不要因为后悔而立刻追高买回。卖飞是交易的一部分，重要的是复盘原计划是否有效，而非情绪化补救。';
  }

  if (input.type === 'chase_loss') {
    return '建议先复盘追高的原因，识别情绪触发点。未来制定计划时，提前设定买入条件和止损边界，避免情绪化追高。';
  }

  if (input.type === 'add' && input.thoughts.includes('摊成本')) {
    return '加仓应该是因为投资逻辑增强，而非为了摊低成本。建议重新评估你的投资逻辑是否真的变好了。';
  }

  if (!input.originalPlan || input.originalPlan.trim() === '没有') {
    return '建议先制定完整的交易计划，包括买入理由、估值目标、退出条件和止损边界。没有计划时，不做操作。';
  }

  return '建议先写清楚本次操作的假设和反证条件，设置明确的退出边界，然后等待冷静期后再重新评估。';
}

function generateNextActions(input: TradeCardInput, scores: Scores): string[] {
  const actions: string[] = [];

  if (scores.reasonQuality < 60) {
    actions.push('补充买入/卖出的核心理由和事实依据');
  }

  if (!input.maxLossTolerance || input.maxLossTolerance.includes('不能接受')) {
    actions.push('设置最大亏损边界（如亏损10%强制止损）');
  }

  actions.push('设置明确的退出条件（什么情况下卖出）');

  if (scores.positionRisk > 50) {
    actions.push('检查仓位上限，确保单票风险可控');
  }

  if (scores.impulseRisk > 50) {
    actions.push('等待24小时冷静期后再重新评估');
  }

  actions.push('保存本次冷静卡，用于后续复盘');

  return actions.slice(0, 5);
}

function generateSummary(input: TradeCardInput): string {
  const typeLabel = TRADE_TYPE_LABELS[input.type];
  const emotionLabels = input.emotions.map(e => EMOTION_LABELS[e]).join('、');

  if (input.type === 'buy') {
    return `你计划${typeLabel} ${input.symbol}，当前情绪状态为${emotionLabels || '平稳'}。${input.thoughts.substring(0, 50)}...`;
  }

  if (input.type === 'sell') {
    return `你计划${typeLabel} ${input.symbol}，当前情绪状态为${emotionLabels || '平稳'}。${input.thoughts.substring(0, 50)}...`;
  }

  if (input.type === 'add') {
    return `你计划${typeLabel} ${input.symbol}，当前情绪状态为${emotionLabels || '平稳'}。${input.thoughts.substring(0, 50)}...`;
  }

  if (input.type === 'cut') {
    return `你计划${typeLabel} ${input.symbol}，当前情绪状态为${emotionLabels || '平稳'}。${input.thoughts.substring(0, 50)}...`;
  }

  if (input.type === 'missed') {
    return `你正在复盘${typeLabel}的情况，当前情绪状态为${emotionLabels || '平稳'}。${input.thoughts.substring(0, 50)}...`;
  }

  if (input.type === 'chase_loss') {
    return `你正在复盘${typeLabel}的情况，当前情绪状态为${emotionLabels || '平稳'}。${input.thoughts.substring(0, 50)}...`;
  }

  return `你正在${typeLabel}相关的决策检查。`;
}

export function generateDisciplineReport(input: TradeCardInput): TradeReport {
  const impulseRisk = calculateImpulseRisk(input);
  const positionRisk = calculatePositionRisk(input);
  const reasonQuality = calculateReasonQuality(input);

  const scores: Scores = {
    impulseRisk,
    positionRisk,
    reasonQuality,
  };

  const emotionAnalysis = generateEmotionAnalysis(input);
  const risks = generateRisks(input, scores);
  const openQuestions = generateOpenQuestions(input);
  const disciplineSuggestion = generateDisciplineSuggestion(input, scores);
  const nextActions = generateNextActions(input, scores);
  const summary = generateSummary(input);

  return {
    id: crypto.randomUUID(),
    summary,
    emotionAnalysis,
    scores,
    risks,
    openQuestions,
    disciplineSuggestion,
    nextActions,
    disclaimer:
      '本报告仅用于投资纪律检查和自我复盘，不构成任何投资建议、买卖建议或收益承诺。所有投资决策应由用户独立判断并自行承担风险。',
    createdAt: new Date().toISOString(),
    input,
  };
}

/**
 * Convert TradeReport to TradeCardRecord for history list
 */
export function toTradeCardRecord(report: TradeReport): {
  id: string;
  type: string;
  symbol: string;
  impulseRisk: number;
  positionRisk: number;
  reasonQuality: number;
  summary: string;
  createdAt: string;
} {
  return {
    id: report.id,
    type: report.input.type,
    symbol: report.input.symbol,
    impulseRisk: report.scores.impulseRisk,
    positionRisk: report.scores.positionRisk,
    reasonQuality: report.scores.reasonQuality,
    summary: report.summary,
    createdAt: report.createdAt,
  };
}
