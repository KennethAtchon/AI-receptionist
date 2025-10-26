/**
 * Webhook Router
 * Handles incoming webhooks from various providers (Twilio, Resend, SendGrid, etc.)
 */

import type { AIReceptionist } from '../client';
import { logger } from '../utils/logger';

export class WebhookRouter {
  constructor(private client: AIReceptionist) {}

  /**
   * Handle incoming voice call webhook (Twilio)
   */
  async handleVoiceWebhook(payload: any): Promise<any> {
    try {
      return await this.client.voice!.handleWebhook({
        provider: 'twilio',
        payload,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('[WebhookRouter] Voice webhook error:', error as Error);
      throw error;
    }
  }

  /**
   * Handle incoming email webhook (Resend/SendGrid)
   */
  async handleEmailWebhook(provider: 'resend' | 'sendgrid', payload: any, signature?: string): Promise<any> {
    try {
      // Verify webhook signature
      if (signature) {
        await this.verifyWebhookSignature(provider, payload, signature);
      }

      return await this.client.email!.handleWebhook({
        provider,
        payload,
        signature,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('[WebhookRouter] Email webhook error:', error as Error);
      throw error;
    }
  }

  /**
   * Handle incoming SMS webhook (Twilio)
   */
  async handleSMSWebhook(payload: any): Promise<any> {
    try {
      return await this.client.sms!.handleWebhook({
        provider: 'twilio',
        payload,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('[WebhookRouter] SMS webhook error:', error as Error);
      throw error;
    }
  }

  private async verifyWebhookSignature(provider: string, payload: any, signature: string): Promise<void> {
    // Implement signature verification for each provider
    // Resend, SendGrid, etc.
    logger.debug(`[WebhookRouter] Verifying ${provider} webhook signature`);
    
    // TODO: Implement actual signature verification
    // This would involve:
    // 1. Getting the webhook secret from config
    // 2. Computing the expected signature
    // 3. Comparing with the provided signature
    // 4. Throwing error if verification fails
  }
}
