/** 간단한 인메모리 Rate Limiter (토큰 버킷 알고리즘) */

interface RateLimitEntry {
  tokens: number
  lastRefill: number
}

const store = new Map<string, RateLimitEntry>()

interface RateLimitConfig {
  /** 최대 토큰 수 */
  maxTokens: number
  /** 토큰 리필 간격 (ms) */
  refillInterval: number
  /** 간격당 리필 토큰 수 */
  refillAmount: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxTokens: 20,
  refillInterval: 60 * 1000, // 1분
  refillAmount: 20,
}

/**
 * Rate limit 체크
 * @param key 식별키 (예: IP 또는 userId)
 * @param config 설정
 * @returns { allowed: boolean, remaining: number }
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  let entry = store.get(key)

  if (!entry) {
    entry = { tokens: config.maxTokens, lastRefill: now }
    store.set(key, entry)
  }

  // 토큰 리필
  const elapsed = now - entry.lastRefill
  const refills = Math.floor(elapsed / config.refillInterval)
  if (refills > 0) {
    entry.tokens = Math.min(config.maxTokens, entry.tokens + refills * config.refillAmount)
    entry.lastRefill = now
  }

  // 토큰 소비
  if (entry.tokens > 0) {
    entry.tokens--
    return { allowed: true, remaining: entry.tokens }
  }

  return { allowed: false, remaining: 0 }
}

/** 5분마다 오래된 엔트리 정리 */
if (typeof globalThis !== 'undefined') {
  const cleanup = setInterval(() => {
    const now = Date.now()
    const maxAge = 10 * 60 * 1000 // 10분
    for (const [key, entry] of store.entries()) {
      if (now - entry.lastRefill > maxAge) {
        store.delete(key)
      }
    }
  }, 5 * 60 * 1000)

  // Node.js에서 프로세스 종료를 방지하지 않도록
  if (cleanup && typeof cleanup === 'object' && 'unref' in cleanup) {
    cleanup.unref()
  }
}
