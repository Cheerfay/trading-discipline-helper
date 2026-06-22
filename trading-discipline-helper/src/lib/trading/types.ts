/**
 * Trading Discipline Card - Type Definitions
 */

export type TradeType = 'buy' | 'add' | 'take_profit' | 'cut' | 'missed' | 'chase_loss';

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
  locale?: 'en' | 'zh' | string;
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
  // headline: 合并"安抚 + 核心判断"的一个自然段（2-4句），首屏主角。
  headline: string;
  emotionalOpening: string; // 情绪安抚段（保留：下沉到第二层备用）
  coreInsight: string; // 一句话核心判断（保留：下沉/历史列表用）
  calmStatus: CalmStatus;
  calmStatusText: string; // 状态 badge 文案
  oneAction: string; // 一个冷静动作
  selfCheckQuestions: string[]; // 三个自查问题
  lesson: string; // 复盘场景的一句话提炼
  // True when the model judged this card would be more accurate with position
  // info the user hasn't given yet. Drives the optional supplement invite.
  needsPositionInfo: boolean;
  positionInfoReason: string;
  // Collapsed detail layer
  detail: TradeReport;
  positionCard?: PositionCard;
  createdAt: string;
}

// Lightweight record used by the history list.
export interface CalmCardRecord {
  id: string;
  type: Scene;
  symbol: string;
  userThought: string;
  positionText?: string;
  coreInsight: string;
  calmStatus: CalmStatus;
  calmStatusText: string;
  createdAt: string;
}

export type PositionHealthStatus =
  | 'looks_balanced'
  | 'worth_attention'
  | 'too_concentrated'
  | 'not_enough_info';

export type PositionRiskLevel = 'light' | 'balanced' | 'watch' | 'concentrated' | 'unknown';

export interface PositionParsedRatio {
  value: number;
  source: string;
}

export interface PositionRuleFinding {
  kind: 'single_position' | 'all_in' | 'theme_concentration' | 'cash_buffer' | 'missing_info';
  level: PositionRiskLevel;
  title: string;
  detail: string;
}

export interface PositionRuleSummary {
  primaryLevel: PositionRiskLevel;
  primaryLabel: string;
  maxSingleRatio: number | null;
  parsedRatios: PositionParsedRatio[];
  detectedThemes: string[];
  findings: PositionRuleFinding[];
  missingInfo: string[];
}

export interface PositionCardInput {
  sourceCardId?: string;
  locale?: 'en' | 'zh' | string;
  scene: Scene;
  symbol: string;
  userThought: string;
  positionText: string;
  createdAt: string;
}

export interface PositionCard {
  id: string;
  sourceCardId?: string;
  status: PositionHealthStatus;
  statusText: string;
  positionText: string;
  headline: string;
  rhythmInsight: string;
  oneAction: string;
  checkpoints: string[];
  ruleSummary: PositionRuleSummary;
  detail: {
    findings: PositionRuleFinding[];
    notes: string[];
    disclaimer: string;
  };
  createdAt: string;
}
