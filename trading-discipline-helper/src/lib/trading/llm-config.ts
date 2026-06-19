import { envConfigs } from '@/config';
import { getProviderDefaults, type LLMConfig, type LLMProvider } from './llm';

/**
 * Resolve the active LLM provider config from env. Returns null + an error
 * message when the selected provider's API key is missing.
 */
export function resolveLLMConfig(): { config?: LLMConfig; error?: string } {
  const provider = (envConfigs.llm_provider || 'anthropic') as LLMProvider;
  const defaults = getProviderDefaults(provider);
  if (!defaults) return { error: `Unknown LLM_PROVIDER: ${provider}` };

  const keyMap: Record<LLMProvider, string> = {
    anthropic: envConfigs.anthropic_api_key,
    openai: envConfigs.openai_api_key,
    gemini: envConfigs.gemini_api_key,
  };
  const baseURLMap: Record<LLMProvider, string> = {
    anthropic: envConfigs.anthropic_base_url,
    openai: envConfigs.openai_base_url,
    gemini: envConfigs.gemini_base_url,
  };

  const apiKey = keyMap[provider];
  if (!apiKey) {
    return { error: `${provider} API key not configured (set the matching *_API_KEY env var)` };
  }

  return {
    config: {
      provider,
      apiKey,
      model: envConfigs.llm_model || defaults.model,
      baseURL: baseURLMap[provider] || defaults.baseURL,
    },
  };
}
