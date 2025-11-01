/**
 * Rate Limiter Utility
 * Provides in-memory rate limiting functionality for preventing spam and abuse
 */

import { logger } from './logger';

export interface RateLimitConfig {
  limit: number; // Maximum number of operations
  windowMs: number; // Time window in milliseconds
}

export interface RateLimitCounter {
  count: number;
  resetAt: number;
}

/**
 * Generic rate limiter with configurable limits and time windows
 *
 * @example
 * const limiter = new RateLimiter({ limit: 10, windowMs: 3600000 }); // 10 per hour
 * const allowed = await limiter.checkLimit('conversation-123');
 */
export class RateLimiter {
  private counters = new Map<string, RateLimitCounter>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if the key is within rate limit
   * Automatically increments counter if allowed
   *
   * @param key - Unique identifier (e.g., conversationId, userId, IP address)
   * @returns true if operation is allowed, false if rate limit exceeded
   */
  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now();
    let counter = this.counters.get(key);

    // Reset or initialize counter if needed
    if (!counter || now > counter.resetAt) {
      counter = {
        count: 0,
        resetAt: now + this.config.windowMs
      };
      this.counters.set(key, counter);
    }

    // Check if limit exceeded
    if (counter.count >= this.config.limit) {
      logger.warn(`[RateLimiter] Rate limit exceeded for key: ${key}`, {
        count: counter.count,
        limit: this.config.limit,
        resetAt: new Date(counter.resetAt)
      });
      return false; // Rate limit exceeded
    }

    // Increment counter
    counter.count++;
    return true; // OK to proceed
  }

  /**
   * Get current count for a key
   */
  getCount(key: string): number {
    const counter = this.counters.get(key);
    if (!counter || Date.now() > counter.resetAt) {
      return 0;
    }
    return counter.count;
  }

  /**
   * Get remaining operations for a key
   */
  getRemaining(key: string): number {
    const count = this.getCount(key);
    return Math.max(0, this.config.limit - count);
  }

  /**
   * Get reset time for a key
   */
  getResetTime(key: string): Date | null {
    const counter = this.counters.get(key);
    if (!counter || Date.now() > counter.resetAt) {
      return null;
    }
    return new Date(counter.resetAt);
  }

  /**
   * Reset counter for a key
   */
  reset(key: string): void {
    this.counters.delete(key);
    logger.info(`[RateLimiter] Reset counter for key: ${key}`);
  }

  /**
   * Reset all counters
   */
  resetAll(): void {
    this.counters.clear();
    logger.info('[RateLimiter] Reset all counters');
  }

  /**
   * Clean up expired counters (useful for long-running processes)
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, counter] of this.counters.entries()) {
      if (now > counter.resetAt) {
        this.counters.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`[RateLimiter] Cleaned up ${cleaned} expired counters`);
    }

    return cleaned;
  }

  /**
   * Get statistics about the rate limiter
   */
  getStats(): {
    activeKeys: number;
    totalCount: number;
    config: RateLimitConfig;
  } {
    const now = Date.now();
    let activeKeys = 0;
    let totalCount = 0;

    for (const [, counter] of this.counters.entries()) {
      if (now <= counter.resetAt) {
        activeKeys++;
        totalCount += counter.count;
      }
    }

    return {
      activeKeys,
      totalCount,
      config: this.config
    };
  }
}

/**
 * Email-specific rate limiter
 * Pre-configured for email operations (10 emails per hour per conversation)
 */
export class EmailRateLimiter extends RateLimiter {
  constructor(limit: number = 10, windowMs: number = 60 * 60 * 1000) {
    super({ limit, windowMs });
  }
}
