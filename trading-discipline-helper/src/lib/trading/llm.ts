/**
 * Unified LLM transport layer.
 *
 * One `callLLM()` entry point that dispatches to Anthropic / OpenAI / Gemini
 * based on the resolved provider. Each provider has a different endpoint,
 * auth header, request body and response shape — all normalized here so the
 * rest of the app only deals with `(system, userMessages) -> string`.
 *
 * Switch providers via the LLM_PROVIDER env var; no code change needed.
 */

export type LLMProvider = 'anthropic' | 'openai' | 'gemini';

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseURL: string;
}

// Sensible default models + base URLs per provider (overridable via env).
const PROVIDER_DEFAULTS: Record<LLMProvider, { model: string; baseURL: string }> = {
  anthropic: { model: 'claude-opus-4-8', baseURL: 'https://api.anthropic.com' },
  openai: { model: 'gpt-4o', baseURL: 'https://api.openai.com' },
  gemini: { model: 'gemini-1.5-pro', baseURL: 'https://generativelanguage.googleapis.com' },
};

export function getProviderDefaults(provider: LLMProvider) {
  return PROVIDER_DEFAULTS[provider];
}

// Normalize a base URL so callers can pass either `https://host` or
// `https://host/v1` (or with a trailing slash) — we strip a trailing
// `/v1` and any trailing slash, then append the provider's own path.
function normalizeBase(baseURL: string): string {
  return baseURL.replace(/\/+$/, '').replace(/\/v1$/, '');
}

// ---- Anthropic ----

async function callAnthropic(
  cfg: LLMConfig,
  system: string,
  messages: LLMMessage[]
): Promise<string> {
  const res = await fetch(`${normalizeBase(cfg.baseURL)}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 2048,
      ...(system ? { system } : {}),
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(`Anthropic API error: ${err?.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

// ---- OpenAI (Chat Completions) ----

async function callOpenAI(
  cfg: LLMConfig,
  system: string,
  messages: LLMMessage[]
): Promise<string> {
  const res = await fetch(`${normalizeBase(cfg.baseURL)}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 2048,
      // System prompt is a message with role "system" in OpenAI's format.
      messages: [...(system ? [{ role: 'system', content: system }] : []), ...messages],
      // Ask for a JSON object back — the prompt already specifies the schema.
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(`OpenAI API error: ${err?.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ---- Gemini (generateContent) ----

async function callGemini(
  cfg: LLMConfig,
  system: string,
  messages: LLMMessage[]
): Promise<string> {
  // Gemini uses `contents` with role "user"/"model" and parts[].text,
  // a separate `system_instruction`, and the key as a query param.
  const url = `${normalizeBase(cfg.baseURL)}/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey}`;
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
      contents,
      generationConfig: {
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(`Gemini API error: ${err?.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Dispatch to the configured provider. `messages` is the user/assistant turn
 * list; `system` is the system prompt (handled per-provider).
 */
export async function callLLM(
  cfg: LLMConfig,
  system: string,
  messages: LLMMessage[]
): Promise<string> {
  switch (cfg.provider) {
    case 'anthropic':
      return callAnthropic(cfg, system, messages);
    case 'openai':
      return callOpenAI(cfg, system, messages);
    case 'gemini':
      return callGemini(cfg, system, messages);
    default:
      throw new Error(`Unknown LLM provider: ${cfg.provider}`);
  }
}
