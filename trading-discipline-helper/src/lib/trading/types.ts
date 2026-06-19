/**
 * Trading Discipline Card - Type Definitions
 */

export type TradeType = 'buy' | 'sell' | 'add' | 'cut' | 'missed' | 'chase_loss';

// Scene includes an "unclear" entry — "说不清，就是想动一下"
export type Scene = TradeType | 'unclear';

export type Emotion =
  | 'excited'
  | 'anxious'
  | 'fomo'
  | 'regret'
  | 'panic'
  | 'unwilling'
  | 'want_recover'
  | 'certain'
  | 'other';

export type FocusCheck =
  | 'check_impulse'
  | 'check_position'
  | 'check_reason'
  | 'check_calm'
  | 'check_plan'
  | 'check_review';

export interface TradeCardInput {
  type: Scene;
  symbol: string;
  thoughts: string;
  emotions: Emotion[];
  plannedAmount: string;
  currentPositionRatio: string;
  maxLossTolerance: string;
  originalPlan: string;
  focusChecks: FocusCheck[];
  extraAnswers: Record<string, string>;
  createdAt: string;
}

export interface EmotionAnalysis {
  label: string;
  explanation: string;
}

export interface Scores {
  impulseRisk: number;
  positionRisk: number;
  reasonQuality: number;
}

// The four overall calm states — a single signal, not three scores.
export type CalmStatus =
  | 'can_think_but_wait' // 可以继续想，但别急着下单
  | 'pause_first' // 建议先暂停
  | 'strong_pause' // 强烈建议先冷静
  | 'review_not_trade'; // 更适合复盘，不适合立刻交易

// Detailed analysis layer — kept, but collapsed by default in the UI.
export interface TradeReport {
  emotionAnalysis: EmotionAnalysis[];
  scores: Scores;
  risks: string[];
  nextActions: string[];
  disclaimer: string;
}

// The primary object the product revolves around. First-screen fields come
// first; `detail` carries the collapsed analysis.
export interface CalmCard {
  id: string;
  type: Scene;
  symbol: string;
  userThought: string;
  // First-screen layer (generation priority order)
  emotionalOpening: string; // 情绪安抚段（2-3句）
  coreInsight: string; // 一句话核心判断
  calmStatus: CalmStatus;
  calmStatusText: string; // 状态 badge 文案
  oneAction: string; // 一个冷静动作
  selfCheckQuestions: string[]; // 三个自查问题
  lesson: string; // 复盘场景的一句话提炼
  // Collapsed detail layer
  detail: TradeReport;
  createdAt: string;
}

// Lightweight record used by the history list.
export interface CalmCardRecord {
  id: string;
  type: Scene;
  symbol: string;
  coreInsight: string;
  calmStatus: CalmStatus;
  calmStatusText: string;
  createdAt: string;
}
