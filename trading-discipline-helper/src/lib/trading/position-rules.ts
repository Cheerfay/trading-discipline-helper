import type {
  PositionCardInput,
  PositionHealthStatus,
  PositionParsedRatio,
  PositionRiskLevel,
  PositionRuleFinding,
  PositionRuleSummary,
} from './types';

const THEME_KEYWORDS: Record<string, string[]> = {
  AI: ['ai', '人工智能', '算力', '芯片', '半导体', 'gpu'],
  新能源: ['新能源', '光伏', '锂电', '电池', '储能', '电动车'],
  医药: ['医药', '创新药', '医疗', '生物'],
  消费: ['白酒', '消费', '食品', '饮料'],
  金融地产: ['银行', '券商', '保险', '地产'],
};

function clampRatio(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

export function extractPositionRatios(text: string): PositionParsedRatio[] {
  const ratios: PositionParsedRatio[] = [];
  const seen = new Set<string>();

  const percentPattern = /(\d+(?:\.\d+)?)\s*%/g;
  for (const match of text.matchAll(percentPattern)) {
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    const parsed = clampRatio(value);
    const key = `${parsed}:${match[0]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ratios.push({ value: parsed, source: match[0] });
  }

  const chengPattern = /([一二三四五六七八九十半两\d](?:点[一二三四五六七八九\d])?)\s*成/g;
  const cnMap: Record<string, number> = {
    半: 0.5,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  };
  for (const match of text.matchAll(chengPattern)) {
    const raw = match[1];
    let cheng: number | null = null;
    if (/^\d/.test(raw)) {
      cheng = Number(raw.replace('点', '.'));
    } else if (raw.includes('点')) {
      const [a, b] = raw.split('点');
      cheng = (cnMap[a] ?? 0) + (cnMap[b] ?? 0) / 10;
    } else {
      cheng = cnMap[raw] ?? null;
    }
    if (cheng == null || !Number.isFinite(cheng)) continue;
    const parsed = clampRatio(cheng * 10);
    const key = `${parsed}:${match[0]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ratios.push({ value: parsed, source: match[0] });
  }

  return ratios;
}

function classifySingleRatio(value: number): { level: PositionRiskLevel; label: string } {
  if (value < 5) return { level: 'light', label: '单票偏轻' };
  if (value <= 20) return { level: 'balanced', label: '单票相对合理' };
  if (value <= 30) return { level: 'watch', label: '单票偏重' };
  return { level: 'concentrated', label: '单票过度集中' };
}

function describeSingleRatio(value: number, level: PositionRiskLevel): string {
  const prefix = `你写到的最大单一仓位约 ${value}%。`;
  switch (level) {
    case 'light':
      return `${prefix}这个仓位更像观察仓或试探仓，对整体账户波动的影响有限。它可以帮你保持跟踪，但还不足以真正牵动账户结果。`;
    case 'balanced':
      return `${prefix}这个仓位已经会影响账户结果，但还不至于让单一标的决定大部分波动。后续更值得留意的是，同类持仓有没有叠在一起。`;
    case 'watch':
      return `${prefix}这个仓位已经会明显牵动整体账户波动。它不代表一定有问题，但后续任何继续加大或集中，都要先回到整体持仓看。`;
    case 'concentrated':
      return `${prefix}这个仓位已经让单一标的对账户结果有很大影响。这里要看的不是你有多看好它，而是你能不能承受它对整体资产的拖拽。`;
    default:
      return `${prefix}先把它放回整体持仓里看，再判断这次调整会不会让账户波动变得更难承受。`;
  }
}

function detectThemes(text: string): string[] {
  const lower = text.toLowerCase();
  return Object.entries(THEME_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => lower.includes(keyword.toLowerCase())))
    .map(([theme]) => theme);
}

function detectAllIn(text: string) {
  return /满仓|梭哈|all\s*in|全仓|重仓|全部买|全部加|一把/i.test(text);
}

function detectCashStress(text: string) {
  return /没现金|现金很少|现金不多|没有现金|借钱|融资|杠杆|贷款/i.test(text);
}

function levelRank(level: PositionRiskLevel) {
  const ranks: Record<PositionRiskLevel, number> = {
    unknown: 0,
    light: 1,
    balanced: 2,
    watch: 3,
    concentrated: 4,
  };
  return ranks[level];
}

function summaryStatus(summary: PositionRuleSummary): PositionHealthStatus {
  if (summary.missingInfo.length > 0 && summary.findings.length <= 1) return 'not_enough_info';
  if (summary.primaryLevel === 'concentrated') return 'too_concentrated';
  if (summary.primaryLevel === 'watch') return 'worth_attention';
  return 'looks_balanced';
}

export const POSITION_STATUS_TEXT: Record<PositionHealthStatus, string> = {
  looks_balanced: '仓位节奏看起来相对稳',
  worth_attention: '仓位节奏值得再看一眼',
  too_concentrated: '集中度已经需要停下来',
  not_enough_info: '信息还不够完整',
};

export function analyzePositionRules(input: PositionCardInput): PositionRuleSummary {
  const text = [input.positionText, input.userThought].filter(Boolean).join('\n');
  const parsedRatios = extractPositionRatios(text);
  const detectedThemes = detectThemes(text);
  const findings: PositionRuleFinding[] = [];
  const missingInfo: string[] = [];

  const maxSingleRatio = parsedRatios.length > 0 ? Math.max(...parsedRatios.map((r) => r.value)) : null;
  let primaryLevel: PositionRiskLevel = 'unknown';

  if (maxSingleRatio == null) {
    missingInfo.push('没有读到明确的仓位比例');
    findings.push({
      kind: 'missing_info',
      level: 'unknown',
      title: '还缺一个关键数字',
      detail: '最好补一句这只或最大单一持仓大概占总资产多少。没有这个数字时，只能做节奏层面的提醒。',
    });
  } else {
    const classified = classifySingleRatio(maxSingleRatio);
    primaryLevel = classified.level;
    findings.push({
      kind: 'single_position',
      level: classified.level,
      title: classified.label,
      detail: describeSingleRatio(maxSingleRatio, classified.level),
    });
  }

  if (detectAllIn(text)) {
    primaryLevel = 'concentrated';
    findings.push({
      kind: 'all_in',
      level: 'concentrated',
      title: '一次性投入信号明显',
      detail: '原文里出现了接近一次性投入的表达。仓位纪律上，这通常比标的本身更值得先停下来处理。',
    });
  }

  if (detectedThemes.length >= 2 || /同一.*(行业|主题|赛道)|都.*(ai|新能源|半导体|白酒|医药)/i.test(text)) {
    if (levelRank(primaryLevel) < levelRank('watch')) primaryLevel = 'watch';
    findings.push({
      kind: 'theme_concentration',
      level: 'watch',
      title: '可能存在主题集中',
      detail: '多只持仓如果来自同一行业、主题或宏观风险源，看起来分散，实际可能还是同一个风险。',
    });
  }

  if (detectCashStress(text)) {
    if (levelRank(primaryLevel) < levelRank('watch')) primaryLevel = 'watch';
    findings.push({
      kind: 'cash_buffer',
      level: 'watch',
      title: '现金缓冲偏紧',
      detail: '仓位检查不只看买了什么，也看留了多少余地。现金缓冲太薄时，波动会更容易把人推向情绪化操作。',
    });
  }

  if (primaryLevel === 'unknown') primaryLevel = 'balanced';
  const primaryLabel =
    maxSingleRatio == null ? '先补全仓位数字' : classifySingleRatio(maxSingleRatio).label;

  return {
    primaryLevel,
    primaryLabel,
    maxSingleRatio,
    parsedRatios,
    detectedThemes,
    findings,
    missingInfo,
  };
}

export function getPositionStatus(summary: PositionRuleSummary): PositionHealthStatus {
  return summaryStatus(summary);
}
