import { createFileRoute } from '@tanstack/react-router';
import { respData, respErr } from '@/lib/resp';
import { callLLM } from '@/lib/trading/llm';
import { resolveLLMConfig } from '@/lib/trading/llm-config';
import {
  hasUnsupportedTradingInput,
  UNSUPPORTED_INPUT_MESSAGE,
} from '@/lib/trading/input-guard';
import { buildPositionPrompt, POSITION_CARD_SYSTEM_PROMPT } from '@/lib/trading/position-prompt';
import {
  analyzePositionRules,
  getPositionStatus,
  POSITION_STATUS_TEXT,
  POSITION_STATUS_TEXT_EN,
} from '@/lib/trading/position-rules';
import type { PositionCard, PositionCardInput } from '@/lib/trading/types';

function fallbackFromRules(input: PositionCardInput): PositionCard {
  const english = input.locale === 'en';
  const ruleSummary = analyzePositionRules(input);
  const status = getPositionStatus(ruleSummary);
  const firstFinding = ruleSummary.findings[0];

  return {
    id: crypto.randomUUID(),
    sourceCardId: input.sourceCardId,
    status,
    statusText: english ? POSITION_STATUS_TEXT_EN[status] : POSITION_STATUS_TEXT[status],
    positionText: input.positionText,
    headline:
      firstFinding?.detail ||
      (english
        ? 'Do not rush to judge the trade itself. First make the position numbers clear. Position rhythm is not about which security is better; it is about whether this action would make account volatility harder to handle.'
        : '这次先不急着判断买卖本身，先把仓位数字写清楚。仓位节奏看的不是哪只更好，而是这次操作会不会让整体账户波动变得更难承受。'),
    rhythmInsight:
      firstFinding?.title ||
      (english
        ? 'Position information is still incomplete. Add the total-asset ratio first, then check the rhythm.'
        : '仓位信息还不够完整，先补全总资产占比再看节奏。'),
    oneAction:
      status === 'not_enough_info'
        ? english
          ? 'First add one sentence: roughly how much of total assets this holding, or the largest single holding, represents.'
          : '先补一句：这只或最大单一持仓大概占总资产多少，再决定是否继续看。'
        : english
          ? 'Write down the total limit for this security and similar-theme holdings, then check whether this action would cross your own discipline line.'
          : '先写下这只标的和同主题持仓的总上限，再回头看这次操作会不会越过自己的纪律。',
    checkpoints: english
      ? [
          'How much of total assets is this holding, or the largest single holding?',
          'How large are holdings that share the same industry, theme, or risk source?',
          'After this action, will you still have enough cash and room to adjust?',
        ]
      : [
          '这只或最大单一持仓占总资产多少？',
          '同一行业、主题或风险源的持仓合在一起有多大？',
          '这次操作之后，你还留有足够现金和调整余地吗？',
        ],
    ruleSummary,
    detail: {
      findings: ruleSummary.findings,
      notes: english
        ? [
            'This card only checks position discipline. It does not judge whether a specific security is good or bad.',
            'It looks at single-position concentration, similar holdings stacking up, adjustment pace, and cash room.',
          ]
        : [
            '这张卡只做仓位纪律检查，不判断具体标的好坏。',
            '这里看的不是单只标的前景，而是单票集中度、同类持仓叠加、调整节奏和现金余地。',
          ],
      disclaimer:
        english
          ? 'This card is only for position discipline checks and self-review. It is not investment advice, buy/sell advice, position advice, or a promise of returns.'
          : '本卡片仅用于仓位纪律检查和自我复盘，不构成任何投资建议、买卖建议、仓位建议或收益承诺。',
    },
    createdAt: new Date().toISOString(),
  };
}

function normalizePositionCard(input: PositionCardInput, parsed: any): PositionCard {
  const ruleSummary = analyzePositionRules(input);
  const status = getPositionStatus(ruleSummary);
  const fallback = fallbackFromRules(input);
  const english = input.locale === 'en';

  return {
    ...fallback,
    status,
    statusText: english ? POSITION_STATUS_TEXT_EN[status] : POSITION_STATUS_TEXT[status],
    headline: parsed.headline || fallback.headline,
    rhythmInsight: parsed.rhythmInsight || fallback.rhythmInsight,
    oneAction: parsed.oneAction || fallback.oneAction,
    checkpoints: Array.isArray(parsed.checkpoints)
      ? parsed.checkpoints.slice(0, 3)
      : fallback.checkpoints,
    detail: {
      findings: ruleSummary.findings,
      notes: Array.isArray(parsed.notes) ? parsed.notes.slice(0, 3) : fallback.detail.notes,
      disclaimer: fallback.detail.disclaimer,
    },
  };
}

async function generatePositionCard(data: PositionCardInput) {
  if (!data.positionText?.trim()) {
    return respErr(data.locale === 'en' ? 'Write your position context first' : '请先写下你的仓位情况');
  }
  if (hasUnsupportedTradingInput(data.positionText, data.symbol, data.userThought)) {
    return respErr(UNSUPPORTED_INPUT_MESSAGE);
  }

  const { config, error: configError } = resolveLLMConfig();
  if (!config) {
    return respData(fallbackFromRules(data));
  }

  try {
    const summary = analyzePositionRules(data);
    const messages = buildPositionPrompt(data, summary);
    const response = await callLLM(config, POSITION_CARD_SYSTEM_PROMPT, messages);

    let parsed: any;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch {
      console.error('Failed to parse position LLM response:', response);
      return respData(fallbackFromRules(data));
    }

    return respData(normalizePositionCard(data, parsed));
  } catch (error) {
    console.error('Position card generation error:', error);
    if (configError) console.error(configError);
    return respData(fallbackFromRules(data));
  }
}

async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    return await generatePositionCard(body);
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Invalid request');
  }
}

export const Route = createFileRoute('/api/trading/generate-position-card')({
  server: {
    handlers: { POST },
  },
});
