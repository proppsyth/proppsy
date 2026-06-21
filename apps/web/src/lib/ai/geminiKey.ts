// Gemini API key provider — supports a pool so scaling is config-only.
//
// Set GEMINI_API_KEYS to a comma-separated list to spread load across several
// keys (mitigates per-key rate limits with ~100 agents). Falls back to the
// single GEMINI_API_KEY. A random key is picked per call — stateless, so it
// works across serverless instances without shared counters.
export function getGeminiApiKey(): string | undefined {
  const multi = process.env.GEMINI_API_KEYS
  if (multi) {
    const keys = multi.split(',').map(k => k.trim()).filter(Boolean)
    if (keys.length > 0) return keys[Math.floor(Math.random() * keys.length)]
  }
  return process.env.GEMINI_API_KEY
}
