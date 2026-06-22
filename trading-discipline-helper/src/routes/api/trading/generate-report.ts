import { createFileRoute } from '@tanstack/react-router';
import { respData, respErr } from '@/lib/resp';
import { buildPrompt, CALM_CARD_SYSTEM_PROMPT } from '@/lib/trading/claude-api';
import { callLLM } from '@/lib/trading/llm';
import { resolveLLMConfig } from '@/lib/trading/llm-config';
import {
  hasUnsupportedTradingInput,
  UNSUPPORTED_INPUT_MESSAGE,
} from '@/lib/trading/input-guard';
import type { TradeCardInput, CalmCard, CalmStatus } from '@/lib/trading/types';

const VALID_STATUSES: CalmStatus[] = [
  'can_think_but_wait',
  'pause_first',
  'strong_pause',
  'review_not_trade',
];

const STATUS_TEXT: Record<CalmStatus, string> = {
  can_think_but_wait: '可以继续想，但别急着下单',
  pause_first: '建议先暂停',
  strong_pause: '强烈建议先冷静',
  review_not_trade: '更适合复盘，不适合立刻交易',
};

const STATUS_TEXT_EN: Record<CalmStatus, string> = {
  can_think_but_wait: 'You can think, but do not rush',
  pause_first: 'Pause first',
  strong_pause: 'Strong pause recommended',
  review_not_trade: 'Better for review, not action',
};

function isEnglish(data: TradeCardInput) {
  return data.locale === 'en';
}

function deriveStatus(input: TradeCardInput, scores: any): CalmStatus {
  const impulse = scores?.impulseRisk ?? 50;
  const reason = scores?.reasonQuality ?? 50;
  const position = scores?.positionRisk ?? 50;
  if (input.type === 'missed' || input.type === 'chase_loss') {
    return impulse >= 80 ? 'strong_pause' : 'review_not_trade';
  }
  if (impulse >= 80 || reason <= 30) return 'strong_pause';
  if (impulse >= 60 || position >= 70) return 'pause_first';
  return 'can_think_but_wait';
}

async function generateCard(data: TradeCardInput) {
  if (
    hasUnsupportedTradingInput(
      data.thoughts,
      data.symbol,
      data.plannedAmount,
      data.currentPositionRatio,
      data.maxLossTolerance,
      data.originalPlan,
      data.extraAnswers
    )
  ) {
    return respErr(UNSUPPORTED_INPUT_MESSAGE);
  }

  const { config, error: configError } = resolveLLMConfig();
  if (!config) {
    return respErr(configError || 'LLM not configured');
  }

  try {
    const english = isEnglish(data);
    const messages = buildPrompt(data);
    const response = await callLLM(config, CALM_CARD_SYSTEM_PROMPT, messages);

    let parsed: any;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch {
      console.error('Failed to parse LLM response:', response);
      return respErr('Failed to parse AI response');
    }

    if (!parsed.headline && !parsed.emotionalOpening && !parsed.coreInsight) {
      console.error('Invalid response structure:', parsed);
      return respErr('Invalid AI response structure');
    }

    const scores = {
      impulseRisk: parsed.detail?.scores?.impulseRisk ?? 50,
      positionRisk: parsed.detail?.scores?.positionRisk ?? 50,
      reasonQuality: parsed.detail?.scores?.reasonQuality ?? 50,
    };

    const calmStatus: CalmStatus = VALID_STATUSES.includes(parsed.calmStatus)
      ? parsed.calmStatus
      : deriveStatus(data, scores);

    const card: CalmCard = {
      id: crypto.randomUUID(),
      type: data.type,
      symbol: data.symbol,
      userThought: data.thoughts,
      // headline is the first-screen lead; fall back to joining the two
      // supporting fields if the model didn't produce it.
      headline:
        parsed.headline ||
        [parsed.emotionalOpening, parsed.coreInsight].filter(Boolean).join(' '),
      emotionalOpening: parsed.emotionalOpening || '',
      coreInsight: parsed.coreInsight || '',
      calmStatus,
      calmStatusText: english ? STATUS_TEXT_EN[calmStatus] : STATUS_TEXT[calmStatus],
      oneAction:
        parsed.oneAction ||
        (english
          ? 'Step away from the market screen for 30 minutes. If you still want to act when you return, write down one specific reason first.'
          : '先离开行情页面 30 分钟，回来后如果还想操作，再写下一个具体理由。'),
      selfCheckQuestions: Array.isArray(parsed.selfCheckQuestions)
        ? parsed.selfCheckQuestions.slice(0, 3)
        : [],
      lesson: parsed.lesson || '',
      // Trust the model's semantic judgment, but do not ask again after the
      // user has explicitly supplied position fields in this request.
      needsPositionInfo:
        parsed.needsPositionInfo === true &&
        !data.currentPositionRatio &&
        !data.plannedAmount,
      positionInfoReason:
        parsed.needsPositionInfo === true && typeof parsed.positionInfoReason === 'string'
          ? parsed.positionInfoReason
          : '',
      detail: {
        emotionAnalysis: Array.isArray(parsed.detail?.emotionAnalysis)
          ? parsed.detail.emotionAnalysis
          : [],
        scores,
        risks: Array.isArray(parsed.detail?.risks) ? parsed.detail.risks.slice(0, 4) : [],
        nextActions: Array.isArray(parsed.detail?.nextActions)
          ? parsed.detail.nextActions.slice(0, 4)
          : [],
        disclaimer:
          english
            ? 'This card is only for trading discipline checks and self-review. It is not investment advice, buy/sell advice, or a promise of returns. You remain responsible for your own decisions and risks.'
            : '本卡片仅用于投资纪律检查和自我复盘，不构成任何投资建议、买卖建议或收益承诺。所有投资决策应由你独立判断并自行承担风险。',
      },
      createdAt: new Date().toISOString(),
    };

    return respData(card);
  } catch (error) {
    console.error('Claude API error:', error);
    return respErr(error instanceof Error ? error.message : 'Failed to generate card');
  }
}

async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    return await generateCard(body);
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Invalid request');
  }
}

export const Route = createFileRoute('/api/trading/generate-report')({
  server: {
    handlers: { POST },
  },
});
