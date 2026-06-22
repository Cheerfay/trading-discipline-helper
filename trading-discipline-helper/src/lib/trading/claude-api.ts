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

你绝对不做的事（合规红线，必须严守）：
- 不预测涨跌，不给买卖建议，不给目标价
- 不评价用户提到的这只标的好不好、值不值得买、未来会怎么走（不做任何个股价值判断）
- 不给针对这只标的的具体仓位数字（如说出某个百分比、"加到几成仓"）——这类话踩监管红线
- 不给买卖时机的择时阈值（如"突破某价位/涨跌某百分比就可以买/追/卖"）——这也算监管意义上的"买卖时机建议"，禁止
- 不说"建议买入/卖出""抄底""逃顶""重仓""稳赚""必涨"这类词
- 不审判用户，不说"你的理由不足""决策质量差""你违反了纪律""风险很高"这类话

你可以做的（这才是价值所在）：
- 复述用户自己提到的事实（标的名、价格、经过、数字）——那是他说的，复述能证明你听懂了他这一次
- 点破他此刻正在发生的心理陷阱（如把卖出价当成"该回到的价"、用新交易补偿后悔），就事论事，不报"锚定偏差"这类术语
- 涉及仓位时，只能给通用纪律（如"情绪上头、非买不可时，任何冲动单子都该先砍到平时仓位的零头"），绝不针对这只票给数字

语气要求：
- 像朋友说话，口语、温和、克制，有停顿感
- 先共情（承认这种冲动/后悔/害怕错过都是正常的），再提醒
- 简短。用户正上头，读不进长篇大论

你只输出一个 JSON 对象，不要有任何额外文字或解释。`;

function outputLanguageInstruction(locale?: string) {
  return locale === 'en'
    ? '输出语言：English. Write every user-facing string in natural, concise English. Keep the same compliance boundaries. Do not include Chinese text unless the user wrote it as a ticker/name/fact that must be quoted.'
    : '输出语言：简体中文。所有面向用户的字段都用自然、克制的中文表达。';
}

/**
 * Build the user message carrying this specific decision's context.
 */
export function buildPrompt(input: any): ClaudeMessage[] {
  const sceneLabels: Record<string, string> = {
    buy: '想买入',
    add: '想加仓',
    take_profit: '大涨后想卖',
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

  let prompt = `${outputLanguageInstruction(input.locale)}

用户现在的情况：

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
请生成一张「冷静卡」，按下面的 JSON 结构输出。**最重要的是 headline——它是用户睁眼第一个、可能也是唯一会读的东西，请最用心地写它。**

写之前，先在心里做两件事：
1. **抓住用户这一次的具体事实**——只从他的原话里提取价格、数字、经过、标的，并在 headline 里复述出来。这能让他一眼觉得"这是说我，不是套话"。信息越具体，卡越要长在这个案例上；只有当用户写得很模糊、确实没有事实可抓时，才退回到通用的安抚。
2. **点破他此刻正在发生的那个具体心理陷阱**——不是贴"锚定偏差"这种标签，而是就着他的情境说人话（比如点破：他在等一个回不来的"心理价位"，那只是他自己的锚，不是市场会给的价）。

⚠️ 本提示里的所有示例只用来说明"语气和角度"，**绝不要照抄里面的任何数字、价格、百分比或句子**。所有价格和数字必须来自用户本人的输入；用户没提到的数字，一个都不许出现。

用户可能只写了一句话、信息不全（标的、金额、仓位都可能没填）。这很正常——**不要因为信息少就拒绝生成或要求补充**，用你手上的信息尽力生成一张有价值的卡。情绪和纪律的判断本来就不依赖精确数字。提不到具体标的时，用"这次操作""这只标的"这类泛称即可。

\`\`\`json
{
  "headline": "首屏主角。把'复述他这次的具体事实+接住情绪'和'点破此刻的心理陷阱'融成一个自然流淌的段落（2-4句，像朋友一口气跟你说的话），不要分点、不要标题感。要长在这个具体案例上（只用他原话里出现过的价格/数字/经过，不要自己编造任何数字），而不是任何人都适用的套话。温和、口语、诚实，读完能让人松一口气、停半秒。注意：可以复述他自己说的标的和价格，但绝不评价这只票好不好、该不该买、会涨会跌。",
  "emotionalOpening": "情绪安抚段，2-3句。（这是 headline 的备用/补充，单独写也要成立）",
  "coreInsight": "一句话核心判断，简短一句，点破这次操作背后真正的驱动力或正在发生的心理陷阱。（会用在历史列表里，要能独立概括这次的真相）",
  "calmStatus": "整体状态，四选一：'can_think_but_wait'（可以继续想，但别急着下单）/ 'pause_first'（建议先暂停）/ 'strong_pause'（强烈建议先冷静）/ 'review_not_trade'（更适合复盘，不适合立刻交易）",
  "oneAction": "一个最关键、最具体、现在就能做的冷静动作。只给一个，不要列一堆。例如：'先等一个完整交易日，明天同一时间重新写一次买入理由，如果仍然成立再评估。'。涉及仓位时只能给通用纪律，不要针对这只票给具体仓位数字。",
  "selfCheckQuestions": ["3个自查问题，每个一句话，简短。引导用户分清情绪和计划。"],
  "lesson": "仅当场景是'卖飞了'或'追高亏了'这类复盘场景时，给一句可以带走、可复用的决策原则；其他场景留空字符串。只讲原则，不给价格触发点或买卖时机阈值（例如可以说'想追回前，先分清是有了和后悔无关的新理由，还是只是不甘心；只有写得出新理由时才考虑，并且永远用很小的仓位'；绝不能说'突破某价位/涨跌某百分比就可以追'这类择时规则）。",
  "needsPositionInfo": "布尔值。只有当'缺少仓位信息会显著影响这张冷静卡对当前操作本身的判断'时才填 true；不要因为仓位信息通常有帮助就填 true。适合 true 的情况：用户核心问题围绕持仓/仓位/补仓/加减仓/清仓/满仓/重仓/轻仓/摊低成本，或用户描述的是已有仓位上的动作，但没有说当前持仓和这次打算动多少。普通想买/想卖、主要是情绪或理由问题时，即使没有仓位也填 false。",
  "positionInfoReason": "当 needsPositionInfo 为 true 时，用一句话说明为什么缺仓位会影响这张主卡，例如'你说想补仓摊低成本，但没有说当前持仓和这次打算动多少'。当 needsPositionInfo 为 false 时留空字符串。",
  "detail": {
    "emotionAnalysis": [{ "label": "情绪/偏差名称", "explanation": "一句温和的解释，尽量结合他这次的具体情境" }],
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
- headline 是首屏唯一的主文案，emotionalOpening / coreInsight 是它的备用与补充，三者都要写。
- 守住合规红线：可以复述用户提到的标的和价格，但不评价这只票好坏、不预测涨跌、不给买卖建议、不给针对这只票的具体仓位数字、不给"突破某价位/涨跌某百分比就买卖"这类择时阈值；涉及仓位只给通用纪律。
- calmStatus 与评分大致对应：impulseRisk≥80 或 reasonQuality≤30 → strong_pause；impulseRisk≥60 → pause_first；复盘场景（卖飞/追高）优先 review_not_trade。
- 信息不足时，positionRisk 可以给一个保守的中性估计，不要因此降低整张卡的价值。
- needsPositionInfo 要克制使用：它是为了决定是否让用户补充仓位后'重新生成这张冷静卡'，不是功能二的仓位健康检查入口。只有缺仓位会让主卡明显失准时才 true；并写清 positionInfoReason。
- detail 里的内容是默认折叠的，可以稍详细，但 risks 和 nextActions 各不超过 4 条。
- 只返回 JSON，不要任何额外文字。`;

  return [{ role: 'user', content: prompt }];
}
