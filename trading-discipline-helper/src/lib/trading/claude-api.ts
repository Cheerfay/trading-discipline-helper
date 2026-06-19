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
  baseURL: string = 'https://api.anthropic.com'
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
      max_tokens: 4096,
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
 * Build prompt for trading discipline report
 */
export function buildPrompt(input: any): ClaudeMessage[] {
  const typeLabels: Record<string, string> = {
    buy: '买入',
    sell: '卖出',
    add: '加仓',
    cut: '割肉',
    missed: '卖飞复盘',
    chase_loss: '追高亏损复盘',
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

  const typeLabel = typeLabels[input.type] || input.type;
  const emotionLabelsStr = input.emotions.map((e: string) => emotionLabels[e] || e).join('、');

  let prompt = `你是一个投资纪律检查助手。用户正在进行${typeLabel}决策，请分析并生成一份冷静报告。

## 用户输入信息

- 操作标的：${input.symbol}
- 操作类型：${typeLabel}
- 当前想法：${input.thoughts}
- 当前情绪：${emotionLabelsStr || '平稳'}
- 计划操作金额/仓位：${input.plannedAmount}
- 当前仓位占比：${input.currentPositionRatio}
- 可接受最大亏损：${input.maxLossTolerance}
- 原交易计划：${input.originalPlan || '无'}
- 希望重点检查：${input.focusChecks.join('、') || '无'}
`;

  // Add type-specific extra answers
  if (input.extraAnswers) {
    prompt += '\n## 额外信息\n';
    for (const [key, value] of Object.entries(input.extraAnswers)) {
      if (value) {
        prompt += `- ${key}: ${value}\n`;
      }
    }
  }

  prompt += `
## 你的角色

你是一个冷静、温和的陪伴者，不是分析师，也不是老师。用户此刻很可能正"上头"——情绪激动、想立刻下单。你的首要任务是**先安抚，再点醒**，帮他慢下来，而不是抛给他一堆需要静心阅读的分析。

## 输出要求

请以 JSON 格式输出报告，包含以下字段：

\`\`\`json
{
  "empathy": "一句话先共情再点醒（30字以内）。先承认他此刻的感受是正常的，再温和地指出真正在发生什么。例如：'想冲进去的感觉很正常，但你现在是怕错过，而不是真的看懂了它。'",
  "calmStatus": "整体状态，三选一：'calm'（情绪平稳，可以理性决策）/ 'pause'（建议先暂停想一想）/ 'cool_down'（情绪明显上头，强烈建议冷静）",
  "keyAction": "一个最关键、最具体的冷静动作（25字以内）。例如：'先放下这笔交易24小时，明天此刻再看一次。'",
  "summary": "用2-3句话总结用户现在想做什么，以及主要原因",
  "emotionAnalysis": [
    {
      "label": "情绪类型（如：FOMO、恐慌、后悔驱动、锚定成本、从众心理、损失厌恶、过度自信、想回本心理、情绪状态相对稳定）",
      "explanation": "简短解释该情绪"
    }
  ],
  "scores": {
    "impulseRisk": 0-100的冲动风险评分（越高越危险），
    "positionRisk": 0-100的仓位风险评分（越高越危险），
    "reasonQuality": 0-100的决策理由质量评分（越高越好）
  },
  "risks": ["3-5条主要风险点"],
  "openQuestions": ["3-5个引导用户补充思考的问题"],
  "disciplineSuggestion": "纪律建议（不能直接说买或卖，只能给纪律建议）",
  "nextActions": ["3-5个下一步行动清单"]
}
\`\`\`

## 重要约束

1. **不要给出任何买卖建议**，只做纪律检查
2. **不要预测股票涨跌**
3. **不要使用"建议买入"、"建议卖出"、"目标价"、"必涨"、"抄底"、"逃顶"、"重仓"、"稳赚"等词汇**
4. 使用"当前决策理由不够充分"、"该操作可能违反你的仓位纪律"、"当前情绪中存在明显FOMO"、"建议先补充反证信息"、"建议进入冷静期后重新评估"等表述
5. \`empathy\` 和 \`keyAction\` 是用户第一眼看到的内容，要口语化、温和、像一个冷静的朋友在说话，不要说教
6. \`calmStatus\` 要与 impulseRisk 评分一致：impulseRisk 高（>65）通常对应 cool_down，中等（40-65）对应 pause，低（<40）对应 calm
7. 评分要基于用户的输入合理判断
8. 返回纯 JSON 格式，不要有其他文字

请开始分析并输出 JSON 格式的报告。`;

  return [
    {
      role: 'user',
      content: prompt,
    },
  ];
}
