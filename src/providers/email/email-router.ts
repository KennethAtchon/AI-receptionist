/**
 * Email Router
 * Routes emails to appropriate provider based on configuration
 * Supports multiple providers simultaneously with priority-based fallback
 */

import type { IEmailProvider, EmailParams, EmailResult } from './email-provider.interface';
import { logger } from '../../utils/logger';

export interface EmailProviderEntry {
  provider: IEmailProvider;
  priority: number;
  tags?: string[];
  domains?: string[]; // Route specific domains to specific providers
}

export class EmailRouter {
  private providers: Map<string, EmailProviderEntry> = new Map();
  private sortedProviders: EmailProviderEntry[] = [];

  /**
   * Register an email provider
   */
  register(name: string, entry: EmailProviderEntry): void {
    this.providers.set(name, entry);
    this.sortProviders();
    logger.info(`[EmailRouter] Registered provider '${name}' with priority ${entry.priority}`);
  }

  /**
   * Sort providers by priority (lowest number = highest priority)
   */
  private sortProviders(): void {
    this.sortedProviders = Array.from(this.providers.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Select provider based on email parameters
   */
  selectProvider(params: EmailParams, forcedProvider?: string): IEmailProvider | null {
    // If provider is forced, use it
    if (forcedProvider && this.providers.has(forcedProvider)) {
      logger.info(`[EmailRouter] Using forced provider: ${forcedProvider}`);
      return this.providers.get(forcedProvider)!.provider;
    }

    // Match by tags
    if (params.tags && params.tags.length > 0) {
      for (const entry of this.sortedProviders) {
        if (entry.tags && entry.tags.some((tag) => params.tags!.includes(tag))) {
          logger.info(`[EmailRouter] Matched provider by tags: ${entry.provider.name}`);
          return entry.provider;
        }
      }
    }

    // Match by recipient domain
    if (typeof params.to === 'string') {
      const domain = params.to.split('@')[1];
      if (domain) {
        for (const entry of this.sortedProviders) {
          if (entry.domains && entry.domains.includes(domain)) {
            logger.info(`[EmailRouter] Matched provider by domain: ${entry.provider.name}`);
            return entry.provider;
          }
        }
      }
    }

    // Use primary provider (highest priority)
    if (this.sortedProviders.length > 0) {
      const primary = this.sortedProviders[0];
      logger.info(`[EmailRouter] Using primary provider: ${primary.provider.name}`);
      return primary.provider;
    }

    logger.error('[EmailRouter] No providers available');
    return null;
  }

  /**
   * Send email with automatic provider selection and fallback
   */
  async sendEmail(params: EmailParams, forcedProvider?: string): Promise<EmailResult> {
    const provider = this.selectProvider(params, forcedProvider);

    if (!provider) {
      return {
        success: false,
        error: 'No email provider configured'
      };
    }

    try {
      const result = await provider.sendEmail(params);

      // If primary fails and we have fallbacks, try them
      if (!result.success && !forcedProvider && this.sortedProviders.length > 1) {
        logger.warn(`[EmailRouter] Primary provider failed, trying fallback`);

        for (let i = 1; i < this.sortedProviders.length; i++) {
          const fallback = this.sortedProviders[i].provider;
          logger.info(`[EmailRouter] Attempting fallback: ${fallback.name}`);

          const fallbackResult = await fallback.sendEmail(params);
          if (fallbackResult.success) {
            logger.info(`[EmailRouter] Fallback successful: ${fallback.name}`);
            return fallbackResult;
          }
        }
      }

      return result;
    } catch (error) {
      logger.error('[EmailRouter] Send failed:', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all registered providers
   */
  getProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   */
  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): IEmailProvider | undefined {
    return this.providers.get(name)?.provider;
  }
}
