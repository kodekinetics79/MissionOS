"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiProvider = exports.OllamaProvider = exports.LocalRuleEngineProvider = void 0;
exports.resolveActiveProvider = resolveActiveProvider;
/** Deterministic, always-on provider built from rule-engine summaries. */
class LocalRuleEngineProvider {
    name = 'Local Rule Engine';
    type = 'rule-engine';
    async isAvailable() {
        return true;
    }
    async answer(context) {
        return { answer: context.localAnswer, provider: this.name, confidence: context.confidence, usedLlm: false };
    }
}
exports.LocalRuleEngineProvider = LocalRuleEngineProvider;
/**
 * Ollama placeholder. Disabled by default. If enabled and a base URL is set we
 * would POST to `${baseUrl}/api/generate`, but here we never make a real call —
 * we degrade to the supplied local answer so the build/runtime never depends on
 * a running model.
 */
class OllamaProvider {
    config;
    name = 'Ollama';
    type = 'ollama';
    constructor(config) {
        this.config = config;
    }
    async isAvailable() {
        // Intentionally does not perform a network call during build/test.
        return Boolean(this.config.enabled && this.config.baseUrl);
    }
    async answer(context) {
        // Placeholder: real implementation would call the Ollama HTTP API here.
        return { answer: context.localAnswer, provider: this.name, confidence: context.confidence, usedLlm: false };
    }
}
exports.OllamaProvider = OllamaProvider;
/** OpenAI / Azure OpenAI / custom-endpoint placeholder. Disabled by default. */
class OpenAiProvider {
    config;
    name = 'OpenAI';
    type = 'openai';
    constructor(config) {
        this.config = config;
    }
    async isAvailable() {
        return Boolean(this.config.enabled && this.config.apiKeyConfigured);
    }
    async answer(context) {
        // Placeholder: real implementation would call the OpenAI-compatible API here.
        return { answer: context.localAnswer, provider: this.name, confidence: context.confidence, usedLlm: false };
    }
}
exports.OpenAiProvider = OpenAiProvider;
/**
 * Resolve the active provider from provider config rows. Always returns a
 * working provider — falls back to the Local Rule Engine when no optional
 * provider is both enabled and available.
 */
async function resolveActiveProvider(providers) {
    const local = new LocalRuleEngineProvider();
    const enabled = providers.find((provider) => provider.enabled && provider.providerType !== 'rule-engine');
    if (!enabled)
        return local;
    const optional = enabled.providerType === 'ollama'
        ? new OllamaProvider(enabled)
        : new OpenAiProvider(enabled);
    return (await optional.isAvailable()) ? optional : local;
}
