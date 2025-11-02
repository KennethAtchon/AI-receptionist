/**
 * SMS Rate Limiter
 * Prevents spam loops by limiting SMS sends per conversation
 */

import { logger } from '../logger';

export interface SMSRateLimiterConfig {
  maxRequests: number;  // Max SMS per window
  windowMs: number;     // Time window in ms
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class SMSRateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private config: SMSRateLimiterConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<SMSRateLimiterConfig>) {
    this.config = {
      maxRequests: config?.maxRequests || 10,
      windowMs: config?.windowMs || 3600000 // 1 hour
    };

    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if conversation is under rate limit
   */
  async checkLimit(conversationId: string): Promise<boolean> {
    const now = Date.now();
    const entry = this.limits.get(conversationId);

    // No entry = under limit
    if (!entry) {
      this.limits.set(conversationId, {
        count: 1,
        resetAt: now + this.config.windowMs
      });
      return true;
    }

    // Entry expired = reset
    if (now >= entry.resetAt) {
      this.limits.set(conversationId, {
        count: 1,
        resetAt: now + this.config.windowMs
      });
      return true;
    }

    // Under limit = increment
    if (entry.count < this.config.maxRequests) {
      entry.count++;
      return true;
    }

    // Over limit
    logger.warn('[SMSRateLimiter] Rate limit exceeded', {
      conversationId,
      count: entry.count,
      limit: this.config.maxRequests
    });
    return false;
  }

  /**
   * Get remaining requests
   */
  getRemaining(conversationId: string): number {
    const entry = this.limits.get(conversationId);
    if (!entry || Date.now() >= entry.resetAt) {
      return this.config.maxRequests;
    }
    return Math.max(0, this.config.maxRequests - entry.count);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [conversationId, entry] of this.limits.entries()) {
      if (now >= entry.resetAt) {
        this.limits.delete(conversationId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`[SMSRateLimiter] Cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * Dispose and cleanup interval
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.limits.clear();
  }
}
