/**
 * AI provider interface layer.
 *
 * The platform ships with a deterministic, rule-driven Local Rule Engine that
 * is ALWAYS available and requires no external dependency. Optional LLM
 * providers (Ollama, OpenAI, Azure OpenAI, custom endpoints) implement the same
 * interface and are DISABLED by default. The build never requires a real LLM or
 * an API key — if an optional provider is enabled but unreachable, the engine
 * transparently falls back to the local rule engine.
 */

export interface AiAnswerContext {
  question: string;
  /** Pre-computed local rule-based answer + supporting signals. */
  localAnswer: string;
  confidence: number;
  sourceModules: string[];
  relatedRecords: Array<{ type: string; id: string; label: string }>;
  suggestedActions: string[];
}

export interface AiProviderResult {
  answer: string;
  provider: string;
  confidence: number;
  usedLlm: boolean;
}

export interface AiProvider {
  readonly name: string;
  readonly type: string;
  isAvailable(): Promise<boolean>;
  answer(context: AiAnswerContext): Promise<AiProviderResult>;
}

/** Deterministic, always-on provider built from rule-engine summaries. */
export class LocalRuleEngineProvider implements AiProvider {
  readonly name = 'Local Rule Engine';
  readonly type = 'rule-engine';
  async isAvailable(): Promise<boolean> {
    return true;
  }
  async answer(context: AiAnswerContext): Promise<AiProviderResult> {
    return { answer: context.localAnswer, provider: this.name, confidence: context.confidence, usedLlm: false };
  }
}

/**
 * Ollama placeholder. Disabled by default. If enabled and a base URL is set we
 * would POST to `${baseUrl}/api/generate`, but here we never make a real call —
 * we degrade to the supplied local answer so the build/runtime never depends on
 * a running model.
 */
export class OllamaProvider implements AiProvider {
  readonly name = 'Ollama';
  readonly type = 'ollama';
  constructor(private readonly config: { enabled?: boolean; baseUrl?: string | null; modelName?: string | null }) {}
  async isAvailable(): Promise<boolean> {
    // Intentionally does not perform a network call during build/test.
    return Boolean(this.config.enabled && this.config.baseUrl);
  }
  async answer(context: AiAnswerContext): Promise<AiProviderResult> {
    // Placeholder: real implementation would call the Ollama HTTP API here.
    return { answer: context.localAnswer, provider: this.name, confidence: context.confidence, usedLlm: false };
  }
}

/** OpenAI / Azure OpenAI / custom-endpoint placeholder. Disabled by default. */
export class OpenAiProvider implements AiProvider {
  readonly name = 'OpenAI';
  readonly type = 'openai';
  constructor(private readonly config: { enabled?: boolean; baseUrl?: string | null; modelName?: string | null; apiKeyConfigured?: boolean }) {}
  async isAvailable(): Promise<boolean> {
    return Boolean(this.config.enabled && this.config.apiKeyConfigured);
  }
  async answer(context: AiAnswerContext): Promise<AiProviderResult> {
    // Placeholder: real implementation would call the OpenAI-compatible API here.
    return { answer: context.localAnswer, provider: this.name, confidence: context.confidence, usedLlm: false };
  }
}

/**
 * Resolve the active provider from provider config rows. Always returns a
 * working provider — falls back to the Local Rule Engine when no optional
 * provider is both enabled and available.
 */
export async function resolveActiveProvider(providers: Array<Record<string, any>>): Promise<AiProvider> {
  const local = new LocalRuleEngineProvider();
  const enabled = providers.find((provider) => provider.enabled && provider.providerType !== 'rule-engine');
  if (!enabled) return local;
  const optional: AiProvider = enabled.providerType === 'ollama'
    ? new OllamaProvider(enabled)
    : new OpenAiProvider(enabled);
  return (await optional.isAvailable()) ? optional : local;
}
