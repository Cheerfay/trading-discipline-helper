/**
 * Trading Discipline Card - Type Definitions
 */

export type TradeType = 'buy' | 'sell' | 'add' | 'cut' | 'missed' | 'chase_loss';

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
  type: TradeType;
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

// Overall calm status — the single signal shown on the first screen.
// calm: 可以冷静决策 / pause: 建议暂停 / cool_down: 强烈建议冷静
export type CalmStatus = 'calm' | 'pause' | 'cool_down';

export interface TradeReport {
  id: string;
  // --- Minimal first-screen layer ---
  // 一句共情/直击要害的话，先安抚再点醒
  empathy: string;
  // 单一整体状态信号灯（取代三个并列分数）
  calmStatus: CalmStatus;
  // 一个最关键的冷静动作
  keyAction: string;
  // --- Full analysis layer (collapsed) ---
  summary: string;
  emotionAnalysis: EmotionAnalysis[];
  scores: Scores;
  risks: string[];
  openQuestions: string[];
  disciplineSuggestion: string;
  nextActions: string[];
  disclaimer: string;
  createdAt: string;
  input: TradeCardInput;
}

export interface TradeCardRecord {
  id: string;
  type: TradeType;
  symbol: string;
  calmStatus: CalmStatus;
  impulseRisk: number;
  positionRisk: number;
  reasonQuality: number;
  summary: string;
  createdAt: string;
}
