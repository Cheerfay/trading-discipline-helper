/**
 * Trading Discipline Card - Mock Card Generation
 *
 * Rule-based mock that produces a CalmCard. First-screen fields
 * (emotionalOpening → coreInsight → calmStatus → oneAction →
 * selfCheckQuestions → lesson) are generated first; the collapsed `detail`
 * layer is derived afterwards. Replace with the real LLM later.
 */

import type {
  TradeCardInput,
  CalmCard,
  CalmCardRecord,
  CalmStatus,
  EmotionAnalysis,
  Scores,
  Scene,
} from './types';

const IMPULSE_KEYWORDS = [
  '害怕错过', '怕错过', '上头', '群里', '博主', '朋友说', '连续上涨',
  '不想错过', '回本', '不甘心', '恐慌', '受不了', '赶紧', '立刻',
  '抄底', '起飞', 'fomo', 'FOMO',
];

const REASON_KEYWORDS = [
  '财报', '估值', '现金流', '利润', '基本面', '商业模式', '竞争优势',
  '行业', '长期', '反证', '风险', '退出条件', '计划',
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

const SCENE_LABELS: Record<Scene, string> = {
  buy: '想买入',
  sell: '想卖出',
  add: '想加仓',
  cut: '想割肉',
  missed: '卖飞了',
  chase_loss: '追高亏了',
  unclear: '说不清，就是想动一下',
};

// ---- Scores (kept for the collapsed detail layer + status mapping) ----

function calculateImpulseRisk(input: TradeCardInput): number {
  let score = 30;
  const text = (input.thoughts + ' ' + input.emotions.join(' ')).toLowerCase();
  for (const keyword of IMPULSE_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) score += 10;
  }
  if (input.emotions.includes('fomo')) score += 15;
  if (input.emotions.includes('panic')) score += 15;
  if (input.emotions.includes('want_recover')) score += 10;
  if (input.emotions.includes('unwilling')) score += 10;
  return Math.min(score, 95);
}

function calculatePositionRisk(input: TradeCardInput): number {
  const ratio = input.currentPositionRatio || '';
  if (ratio.includes('0%') || ratio.includes('空仓')) return 20;
  if (ratio.includes('10%') || ratio.includes('5%') || ratio.includes('8%')) return 30;
  if (ratio.includes('15%') || ratio.includes('20%')) return 50;
  if (ratio.includes('30%') || ratio.includes('40%')) return 70;
  if (ratio.includes('50%') || ratio.includes('60%') || ratio.includes('70%')) return 90;
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
  for (const keyword of REASON_KEYWORDS) {
    if (text.includes(keyword)) score += 5;
  }
  if (!input.originalPlan || input.originalPlan.trim() === '没有' || input.originalPlan.trim() === '') {
    score -= 15;
  }
  if (input.thoughts.length < 20) score -= 10;
  return Math.max(5, Math.min(score, 95));
}

// ---- Calm status (single signal) ----

const CALM_STATUS_TEXT: Record<CalmStatus, string> = {
  can_think_but_wait: '可以继续想，但别急着下单',
  pause_first: '建议先暂停',
  strong_pause: '强烈建议先冷静',
  review_not_trade: '更适合复盘，不适合立刻交易',
};

function getCalmStatus(input: TradeCardInput, scores: Scores): CalmStatus {
  // Review scenes lean toward "review, not trade".
  if (input.type === 'missed' || input.type === 'chase_loss') {
    if (scores.impulseRisk >= 80) return 'strong_pause';
    return 'review_not_trade';
  }
  if (scores.impulseRisk >= 80 || scores.reasonQuality <= 30) return 'strong_pause';
  if (scores.impulseRisk >= 60) return 'pause_first';
  if (scores.positionRisk >= 70) return 'pause_first';
  return 'can_think_but_wait';
}

// ---- First-screen content (scene-aware) ----

function generateEmotionalOpening(input: TradeCardInput): string {
  switch (input.type) {
    case 'missed':
      return '看到卖掉的股票继续涨，那种后悔很正常——大脑很容易把「少赚」当成「亏了」。但这不代表你必须立刻追回，我们先把后悔和新的买入理由分开看。';
    case 'chase_loss':
      return '追高之后看着账户回撤，那种懊恼谁都会有。先别急着责怪自己，重要的不是这次价格，而是当时是什么推着你按下了买入。';
    case 'cut':
      return '看着浮亏一点点扩大，想赶紧了结那种难受，是很真实的感觉。先停一下——我们分清楚，是逻辑坏了，还是只是疼。';
    case 'add':
      return '想再加一点、把成本拉下来，这个念头很常见。先接住它，再看看这是不是因为投资逻辑真的变强了。';
    case 'sell':
      return '想赶紧卖掉、结束这份不安，是可以理解的。先别急，我们看看这是计划里的卖出，还是情绪想找个出口。';
    case 'buy':
      return '现在很想买进去的冲动很正常，尤其是在它一直涨的时候。先停一下，我们一起看看这是计划，还是怕错过。';
    default:
      return '市场波动的时候坐不住，是很自然的反应。先别急着做点什么，我们慢慢看，你现在到底是想决策，还是只是想动一下。';
  }
}

function generateCoreInsight(input: TradeCardInput, scores: Scores): string {
  switch (input.type) {
    case 'missed':
      return '你可能在用一次新的交易，来修复刚刚卖飞带来的后悔感。';
    case 'chase_loss':
      return '这次更值得复盘的不是价格，而是当时为什么被上涨和别人的情绪推着买入。';
    case 'cut':
      return '你现在可能是在逃离亏损带来的痛感，而不是基于新的判断退出。';
    case 'add':
      return '这次加仓可能更多是在缓解不甘心，而不是因为投资逻辑变强了。';
    case 'sell':
      return '你现在可能是在用卖出结束焦虑，而不是因为原来的投资逻辑已经失效。';
    case 'buy':
      return '你现在更像是在怕错过，而不是在执行一个清楚的买入计划。';
    default:
      return '你现在可能不是想做某个明确决策，而是市场波动让你坐不住了。';
  }
}

function generateOneAction(input: TradeCardInput, scores: Scores): string {
  switch (input.type) {
    case 'missed':
      return '先不要买回。把这次记录为「卖飞后的后悔冲动」，等一个完整交易日，明天重新写一次买入理由。';
    case 'chase_loss':
      return '先不要急着找下一次机会。把当时触发你买入的信号写下来，作为下一次的提醒。';
    case 'cut':
      return '先区分两个问题：是价格跌了，还是原来的买入逻辑坏了。没分清前，先不要立刻操作。';
    case 'add':
      return '先不要追加仓位。写出一个新增理由，如果只是「摊低成本」，就先暂停。';
    case 'sell':
      return '先把原来的卖出条件写出来。如果当前没有触发原条件，先暂停一个交易日。';
    case 'buy':
      return '先不要立刻下单。明天同一时间，重新写一次买入理由，如果还能成立，再考虑是否行动。';
    default:
      return '先离开行情页面 30 分钟。回来后如果仍然想操作，再写下一个具体理由。';
  }
}

function generateSelfCheckQuestions(input: TradeCardInput): string[] {
  switch (input.type) {
    case 'missed':
      return [
        '如果它明天不涨反跌，你还会想买回来吗？',
        '这次想买回，是因为有新理由，还是因为后悔？',
        '买回来会不会打乱你原本的仓位安排？',
      ];
    case 'chase_loss':
      return [
        '当时如果没人讨论它，你还会买吗？',
        '现在想做的，是复盘，还是想赶紧扳回来？',
        '下一次遇到同样的信号，你打算怎么做？',
      ];
    case 'cut':
      return [
        '如果明天反弹，你还愿意做现在这个决定吗？',
        '是公司基本面变了，还是只是价格让你难受？',
        '这次卖出符合你原本的退出条件吗？',
      ];
    case 'add':
      return [
        '如果忽略已有的浮亏，你还会在现在这个价格买入吗？',
        '这次加仓是因为逻辑变强了，还是因为不甘心？',
        '加仓之后，这只标的的仓位会不会超出你的上限？',
      ];
    case 'sell':
      return [
        '如果明天它继续涨，你能接受现在卖掉吗？',
        '这次卖出，是计划里的，还是想结束焦虑？',
        '原来的卖出条件，现在真的触发了吗？',
      ];
    case 'buy':
      return [
        '如果明天它反向波动，你还愿意做同样决定吗？',
        '这次买入，是因为逻辑变强了，还是因为不想错过？',
        '这次操作会不会破坏你的仓位纪律？',
      ];
    default:
      return [
        '你现在是想解决一个具体问题，还是只是坐不住？',
        '如果今天什么都不做，会有什么真实的损失吗？',
        '半小时后再看，你还会想做同样的操作吗？',
      ];
  }
}

function generateLesson(input: TradeCardInput): string {
  switch (input.type) {
    case 'missed':
      return '卖飞是交易的一部分。真正的成本，是因为后悔而追高带来的下一次亏损。';
    case 'chase_loss':
      return '被上涨和他人情绪推着买入，是最容易重复的错误。记下触发信号，比记住价格更有用。';
    default:
      return '';
  }
}

// ---- Detail layer (collapsed) ----

function generateEmotionAnalysis(input: TradeCardInput): EmotionAnalysis[] {
  const analysis: EmotionAnalysis[] = [];
  const text = input.thoughts.toLowerCase();

  if (input.emotions.includes('fomo')) {
    analysis.push({ label: '害怕错过', explanation: '看到价格上涨容易产生「再不上车就来不及」的紧迫感，这往往来自情绪而非判断。' });
  }
  if (input.emotions.includes('panic')) {
    analysis.push({ label: '恐慌', explanation: '波动放大时人容易想赶紧「做点什么」，但行动本身并不会让风险变小。' });
  }
  if (input.emotions.includes('regret') || input.emotions.includes('want_recover')) {
    analysis.push({ label: '后悔与想回本', explanation: '基于过去的得失做决定，容易把情绪当成新的买卖理由。' });
  }
  if (input.emotions.includes('unwilling')) {
    analysis.push({ label: '不甘心', explanation: '不甘心常常推动「加仓摊成本」，而这通常和投资逻辑无关。' });
  }
  if (text.includes('博主') || text.includes('群里') || text.includes('朋友')) {
    analysis.push({ label: '受他人影响', explanation: '你的想法里有别人的声音，值得先独立确认一下信息来源。' });
  }
  if (analysis.length === 0) {
    analysis.push({ label: '情绪相对平稳', explanation: '目前没有明显的情绪信号，那就更值得把判断依据再确认一遍。' });
  }
  return analysis;
}

function generateRisks(input: TradeCardInput, scores: Scores): string[] {
  const risks: string[] = [];
  if (scores.impulseRisk > 60) risks.push('这次想法里情绪的成分偏多，值得先放一放。');
  if (scores.positionRisk > 60) risks.push('这只标的的仓位已经不低，再动手前先看一眼整体配置。');
  if (scores.reasonQuality < 50) risks.push('买卖理由还可以再补一层事实依据。');
  if (!input.originalPlan || input.originalPlan.trim() === '没有') {
    risks.push('这次操作还没有清楚的计划做支撑。');
  }
  while (risks.length < 2) {
    risks.push('可以再想想：什么情况下，你会承认这次判断是错的。');
  }
  return risks.slice(0, 4);
}

function generateNextActions(input: TradeCardInput, scores: Scores): string[] {
  const actions: string[] = [];
  if (scores.reasonQuality < 60) actions.push('用一句话写清楚这次操作的核心理由');
  if (!input.maxLossTolerance) actions.push('给自己设一个最大可接受亏损');
  actions.push('写下退出条件：什么情况下你会离场');
  if (scores.impulseRisk > 50) actions.push('等一个交易日后，再重新评估一次');
  return actions.slice(0, 4);
}

// ---- Main entry ----

export function generateCalmCard(input: TradeCardInput): CalmCard {
  const scores: Scores = {
    impulseRisk: calculateImpulseRisk(input),
    positionRisk: calculatePositionRisk(input),
    reasonQuality: calculateReasonQuality(input),
  };

  const calmStatus = getCalmStatus(input, scores);

  return {
    id: crypto.randomUUID(),
    type: input.type,
    symbol: input.symbol,
    userThought: input.thoughts,
    emotionalOpening: generateEmotionalOpening(input),
    coreInsight: generateCoreInsight(input, scores),
    calmStatus,
    calmStatusText: CALM_STATUS_TEXT[calmStatus],
    oneAction: generateOneAction(input, scores),
    selfCheckQuestions: generateSelfCheckQuestions(input),
    lesson: generateLesson(input),
    detail: {
      emotionAnalysis: generateEmotionAnalysis(input),
      scores,
      risks: generateRisks(input, scores),
      nextActions: generateNextActions(input, scores),
      disclaimer:
        '本卡片仅用于投资纪律检查和自我复盘，不构成任何投资建议、买卖建议或收益承诺。所有投资决策应由你独立判断并自行承担风险。',
    },
    createdAt: new Date().toISOString(),
  };
}

export { CALM_STATUS_TEXT, SCENE_LABELS, EMOTION_LABELS };

export function toCalmCardRecord(card: CalmCard): CalmCardRecord {
  return {
    id: card.id,
    type: card.type,
    symbol: card.symbol,
    coreInsight: card.coreInsight,
    calmStatus: card.calmStatus,
    calmStatusText: card.calmStatusText,
    createdAt: card.createdAt,
  };
}
