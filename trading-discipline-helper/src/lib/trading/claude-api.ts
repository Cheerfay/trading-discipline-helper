/**
 * Anthropic Claude API Client
 */

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  stop_reason: string | null;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface ClaudeError {
  type: string;
  error: {
    type: string;
    message: string;
  };
}

/**
 * Call Anthropic Claude API
 */
export async function callClaudeAPI(
  messages: ClaudeMessage[],
  apiKey: string,
  model: string = 'claude-3-5-sonnet-20241022',
  baseURL: string = 'https://api.anthropic.com',
  system?: string
): Promise<string> {
  const url = `${baseURL}/v1/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      ...(system ? { system } : {}),
      messages,
    }),
  });

  if (!response.ok) {
    const error: ClaudeError = await response.json();
    throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
  }

  const data: ClaudeResponse = await response.json();
  return data.content[0]?.text || '';
}

/**
 * System prompt — the companion persona + hard product boundaries.
 * Kept stable across requests so it can be cached and tuned independently.
 */
export const CALM_CARD_SYSTEM_PROMPT = `你是「交易冷静卡」里的陪伴者。用户在准备交易、或刚做完一笔交易、情绪上头时打开了你。

你的身份：一个理性但温和的朋友。不是分析师，不是老师，更不是风控系统。

你要做的：先接住用户的情绪，再温和地帮他分清「这是计划，还是情绪」，最后给他一个很小的、能立刻做的动作，让他先停下来。

你绝对不做的事：
- 不预测涨跌，不给买卖建议，不给目标价
- 不说"建议买入/卖出""抄底""逃顶""重仓""稳赚""必涨"这类词
- 不审判用户，不说"你的理由不足""决策质量差""你违反了纪律""风险很高"这类话

语气要求：
- 像朋友说话，口语、温和、克制，有停顿感
- 先共情（承认这种冲动/后悔/害怕错过都是正常的），再提醒
- 简短。用户正上头，读不进长篇大论

你只输出一个 JSON 对象，不要有任何额外文字或解释。`;

/**
 * Build the user message carrying this specific decision's context.
 */
export function buildPrompt(input: any): ClaudeMessage[] {
  const sceneLabels: Record<string, string> = {
    buy: '想买入',
    sell: '想卖出',
    add: '想加仓',
    cut: '想割肉',
    missed: '卖飞了，想复盘',
    chase_loss: '追高亏了，想复盘',
    unclear: '说不清，就是想动一下',
  };

  const emotionLabels: Record<string, string> = {
    excited: '兴奋',
    anxious: '焦虑',
    fomo: '害怕错过',
    regret: '后悔',
    panic: '恐慌',
    unwilling: '不甘心',
    want_recover: '想回本',
    certain: '很确定',
    other: '其他',
  };

  const sceneLabel = sceneLabels[input.type] || input.type;
  const emotionLabelsStr = (input.emotions || []).map((e: string) => emotionLabels[e] || e).join('、');

  let prompt = `用户现在的情况：

- 场景：${sceneLabel}
- 操作标的：${input.symbol || '（未填写）'}
- 真实想法（原话）：${input.thoughts}
- 当前情绪：${emotionLabelsStr || '（未选择）'}
- 计划动用金额/仓位：${input.plannedAmount || '（未填写）'}
- 该标的当前占总资产：${input.currentPositionRatio || '（未填写）'}
- 可接受最大亏损：${input.maxLossTolerance || '（未填写）'}
- 原交易计划：${input.originalPlan || '（没有）'}
`;

  if (input.extraAnswers) {
    const extras = Object.entries(input.extraAnswers).filter(([, v]) => v);
    if (extras.length > 0) {
      prompt += '\n用户补充的背景：\n';
      for (const [key, value] of extras) {
        prompt += `- ${key}: ${value}\n`;
      }
    }
  }

  prompt += `
请生成一张「冷静卡」，按下面的 JSON 结构输出。**先想清楚 emotionalOpening 和 coreInsight，再填其余字段**——首屏内容最重要。

\`\`\`json
{
  "emotionalOpening": "情绪安抚段，2-3句。先接住用户的情绪（承认这种冲动/后悔/害怕错过很正常），再温和提醒不要马上用交易回应情绪。像朋友说话。",
  "coreInsight": "一句话核心判断。点出这次操作背后真正的驱动力（例如：更像是怕错过，而不是在执行清楚的买入计划 / 在用新交易修复卖飞的后悔）。只给一句，温和但诚实。",
  "calmStatus": "整体状态，四选一：'can_think_but_wait'（可以继续想，但别急着下单）/ 'pause_first'（建议先暂停）/ 'strong_pause'（强烈建议先冷静）/ 'review_not_trade'（更适合复盘，不适合立刻交易）",
  "oneAction": "一个最关键、最具体、现在就能做的冷静动作。只给一个，不要列一堆。例如：'先等一个完整交易日，明天同一时间重新写一次买入理由，如果仍然成立再评估。'",
  "selfCheckQuestions": ["3个自查问题，每个一句话，简短。引导用户分清情绪和计划。"],
  "lesson": "仅当场景是'卖飞了'或'追高亏了'这类复盘场景时，给一句可以带走的提醒；其他场景留空字符串。",
  "detail": {
    "emotionAnalysis": [{ "label": "情绪/偏差名称", "explanation": "一句温和的解释" }],
    "scores": {
      "impulseRisk": "0-100，冲动程度（越高越需要冷静）",
      "positionRisk": "0-100，仓位风险（越高越需要注意）",
      "reasonQuality": "0-100，理由完整度（越高越好）"
    },
    "risks": ["最多4条，温和措辞，不要审判"],
    "nextActions": ["最多4条，具体可执行"]
  }
}
\`\`\`

注意：
- calmStatus 与评分大致对应：impulseRisk≥80 或 reasonQuality≤30 → strong_pause；impulseRisk≥60 → pause_first；复盘场景（卖飞/追高）优先 review_not_trade。
- detail 里的内容是默认折叠的，可以稍详细，但 risks 和 nextActions 各不超过 4 条。
- 只返回 JSON，不要任何额外文字。`;

  return [{ role: 'user', content: prompt }];
}
