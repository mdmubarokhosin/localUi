/**
 * Token estimation utilities.
 * Provides rough token counting for text, CJK-aware, with cost estimation.
 */

/**
 * Represents token usage statistics for a single inference request.
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

/**
 * Regex that matches CJK (Chinese, Japanese, Korean) characters.
 */
const CJK_REGEX = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf\u3400-\u4dbf]/g;

/**
 * Rough pricing table (USD per 1K tokens) for common model families.
 * Prices are approximate and intended for estimation only.
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'claude-3.5-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
  'llama-3.1-70b': { input: 0.0006, output: 0.0008 },
  'llama-3.1-8b': { input: 0.00006, output: 0.00006 },
  'mistral-large': { input: 0.002, output: 0.006 },
  'mistral-small': { input: 0.0002, output: 0.0006 },
};

/** Default pricing when the model is not in the table (per 1K tokens). */
const DEFAULT_PRICING = { input: 0.001, output: 0.003 };

/**
 * Estimates the number of tokens in a given text string.
 *
 * Uses a heuristic: roughly 1 token per 4 characters for Latin-script text,
 * and roughly 1 token per 2 characters for CJK text. Mixed content is
 * handled by classifying each character individually.
 *
 * @param text - The input text to estimate tokens for.
 * @returns The estimated token count.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  let cjkChars = 0;
  let otherChars = 0;

  for (const char of text) {
    if (CJK_REGEX.test(char)) {
      cjkChars++;
    } else {
      otherChars++;
    }
    // Reset regex lastIndex since we use it with the global flag in a loop
    CJK_REGEX.lastIndex = 0;
  }

  // CJK: ~2 chars per token; Latin/other: ~4 chars per token
  const cjkTokens = Math.ceil(cjkChars / 2);
  const otherTokens = Math.ceil(otherChars / 4);

  return cjkTokens + otherTokens;
}

/**
 * Formats a token count into a compact human-readable string.
 *
 * @param count - The token count to format.
 * @returns A formatted string like "1.2K", "345", etc.
 */
export function formatTokenCount(count: number): string {
  if (count < 0) return '0';

  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }

  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }

  return String(Math.round(count));
}

/**
 * Estimates the cost of an inference request based on token usage and model pricing.
 *
 * @param usage - The token usage statistics.
 * @param model - Optional model identifier to look up specific pricing.
 * @returns The estimated cost in USD.
 */
export function estimateCost(usage: TokenUsage, model?: string): number {
  // Try to find a matching model pricing entry
  let pricing = DEFAULT_PRICING;
  if (model) {
    const lowerModel = model.toLowerCase();
    for (const [key, value] of Object.entries(MODEL_PRICING)) {
      if (lowerModel.includes(key.toLowerCase())) {
        pricing = value;
        break;
      }
    }
  }

  const inputCost = (usage.promptTokens / 1000) * pricing.input;
  const outputCost = (usage.completionTokens / 1000) * pricing.output;

  return inputCost + outputCost;
}
