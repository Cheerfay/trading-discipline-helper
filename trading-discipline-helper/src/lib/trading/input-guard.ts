const UNSUPPORTED_INPUT_PATTERNS = [
  /prompt/i,
  /system\s*prompt/i,
  /developer\s*(message|instruction|prompt)/i,
  /ignore\s+(all\s+)?(previous|above|prior)/i,
  /jailbreak/i,
  /越狱/,
  /提示词/,
  /系统(提示|指令|规则)/,
  /内部(提示|指令|规则)/,
  /开发者(消息|指令|规则)/,
  /忽略(上面|以上|之前|所有)/,
  /你的(规则|指令|提示)/,
  /把.*(规则|指令|提示词).*(发|给|展示|输出)/,
];

export const UNSUPPORTED_INPUT_MESSAGE =
  '这里不是聊天窗口。写下你现在真实的交易想法，哪怕只有一句。';

export function isUnsupportedTradingInput(text: unknown): boolean {
  if (typeof text !== 'string') return false;
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return false;
  return UNSUPPORTED_INPUT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function hasUnsupportedTradingInput(...values: unknown[]): boolean {
  return values.some((value) => {
    if (typeof value === 'string') return isUnsupportedTradingInput(value);
    if (Array.isArray(value)) return hasUnsupportedTradingInput(...value);
    if (value && typeof value === 'object') return hasUnsupportedTradingInput(...Object.values(value));
    return false;
  });
}
