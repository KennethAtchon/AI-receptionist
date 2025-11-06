/**
 * Call Rate Limiter
 * Prevents spam by limiting calls per phone number
 */

import { logger } from '../../../utils/logger';

export interface CallRateLimiterConfig {
  maxCalls: number;    // Max calls per window
  windowMs: number;    // Time window in ms
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class CallRateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private config: CallRateLimiterConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CallRateLimiterConfig>) {
    this.config = {
      maxCalls: config?.maxCalls || 5,
      windowMs: config?.windowMs || 3600000 // 1 hour
    };

    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if phone number is under rate limit
   */
  async checkLimit(phoneNumber: string): Promise<boolean> {
    const now = Date.now();
    const entry = this.limits.get(phoneNumber);

    // No entry = under limit
    if (!entry) {
      this.limits.set(phoneNumber, {
        count: 1,
        resetAt: now + this.config.windowMs
      });
      return true;
    }

    // Entry expired = reset
    if (now >= entry.resetAt) {
      this.limits.set(phoneNumber, {
        count: 1,
        resetAt: now + this.config.windowMs
      });
      return true;
    }

    // Under limit = increment
    if (entry.count < this.config.maxCalls) {
      entry.count++;
      return true;
    }

    // Over limit
    logger.warn('[CallRateLimiter] Rate limit exceeded', {
      phoneNumber,
      count: entry.count,
      limit: this.config.maxCalls
    });
    return false;
  }

  /**
   * Get remaining calls
   */
  getRemaining(phoneNumber: string): number {
    const entry = this.limits.get(phoneNumber);
    if (!entry || Date.now() >= entry.resetAt) {
      return this.config.maxCalls;
    }
    return Math.max(0, this.config.maxCalls - entry.count);
  }

  /**
   * Reset limit for a phone number
   */
  reset(phoneNumber: string): void {
    this.limits.delete(phoneNumber);
    logger.info('[CallRateLimiter] Reset limit', { phoneNumber });
  }

  /**
   * Get time until reset (in ms)
   */
  getTimeUntilReset(phoneNumber: string): number {
    const entry = this.limits.get(phoneNumber);
    if (!entry) return 0;

    const now = Date.now();
    if (now >= entry.resetAt) return 0;

    return entry.resetAt - now;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [phoneNumber, entry] of this.limits.entries()) {
      if (now >= entry.resetAt) {
        this.limits.delete(phoneNumber);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`[CallRateLimiter] Cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.limits.clear();
  }
}
