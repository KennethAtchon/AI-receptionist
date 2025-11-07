/**
 * Enhanced Webhook Router
 * Handles incoming webhooks from various providers with session management
 * Supports Twilio (Voice, SMS) and Postmark (Email)
 */

import type { AIReceptionist } from '../client';
import type { Channel } from '../agent/types';
import { logger } from '../utils/logger';

export interface WebhookResponse {
  success: boolean;
  conversationId?: string;
  response?: any;
  error?: string;
}

export class WebhookRouter {
  constructor(private client: AIReceptionist) {}

  /**
   * Route incoming webhook to appropriate conversation
   */
  async routeWebhook(
    type: 'voice' | 'sms' | 'email',
    payload: any,
    conversationId?: string
  ): Promise<WebhookResponse> {
    try {
      logger.info(`[WebhookRouter] Routing ${type} webhook`, { conversationId });

      // If conversationId provided, route to existing conversation
      if (conversationId) {
        return await this.routeToExistingConversation(type, payload, conversationId);
      }

      // Otherwise, create new conversation or find by identifier
      return await this.routeToNewOrExistingConversation(type, payload);
    } catch (error) {
      logger.error('[WebhookRouter] Routing error:', error as Error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Handle incoming voice call webhook (Twilio)
   */
  async handleVoiceWebhook(payload: any): Promise<any> {
    try {
      const response = await this.routeWebhook('voice', payload);
      return response.response || this.generateErrorResponse('voice');
    } catch (error) {
      logger.error('[WebhookRouter] Voice webhook error:', error as Error);
      throw error;
    }
  }

  /**
   * Handle incoming SMS webhook (Twilio)
   */
  async handleSMSWebhook(payload: any): Promise<any> {
    try {
      const response = await this.routeWebhook('sms', payload);
      return response.response || this.generateErrorResponse('sms');
    } catch (error) {
      logger.error('[WebhookRouter] SMS webhook error:', error as Error);
      throw error;
    }
  }

  /**
   * Handle incoming email webhook (Postmark)
   *
   * Note: Postmark does NOT provide webhook signatures for inbound emails.
   * Recommended security measures:
   * - Use Basic HTTP Authentication in webhook URL
   * - Use HTTPS (enforced)
   * - Implement IP whitelisting for Postmark IPs
   */
  async handleEmailWebhook(payload: any): Promise<any> {
    try {
      const response = await this.routeWebhook('email', payload);
      return response;
    } catch (error) {
      logger.error('[WebhookRouter] Email webhook error:', error as Error);
      throw error;
    }
  }

  /**
   * Create new conversation from webhook data
   */
  async createConversationFromWebhook(
    type: 'voice' | 'sms' | 'email',
    payload: any
  ): Promise<string> {
    logger.info(`[WebhookRouter] Creating conversation from webhook`, { type });

    const memory = this.client.getAgent().getMemory();
    const conversationId = memory.generateConversationId();
    const identifier = this.extractIdentifier(type, payload);

    await memory.startSession({
      conversationId,
      channel: type as Channel,
      metadata: {
        source: 'webhook',
        identifier,
        payload: this.sanitizePayload(payload)
      }
    });

    return conversationId;
  }

  /**
   * Process webhook through existing conversation
   */
  private async routeToExistingConversation(
    type: 'voice' | 'sms' | 'email',
    payload: any,
    conversationId: string
  ): Promise<WebhookResponse> {
    const memory = this.client.getAgent().getMemory();
    const conversation = await memory.getConversationHistory(conversationId);

    if (conversation.length === 0) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Process through appropriate resource
    const response = await this.processWebhookWithResource(type, payload);

    return {
      success: true,
      conversationId,
      response
    };
  }

  /**
   * Route to new or existing conversation based on identifier
   */
  private async routeToNewOrExistingConversation(
    type: 'voice' | 'sms' | 'email',
    payload: any
  ): Promise<WebhookResponse> {
    const identifier = this.extractIdentifier(type, payload);
    const memory = this.client.getAgent().getMemory();

    // Try to find existing conversation
    let existingConv = await memory.getConversationByIdentifier(type as Channel, identifier);

    let conversationId: string;
    if (!existingConv) {
      // Create new conversation
      conversationId = await this.createConversationFromWebhook(type, payload);
    } else {
      conversationId = existingConv.sessionMetadata?.conversationId || 
        await this.createConversationFromWebhook(type, payload);
    }

    // Process through appropriate resource
    const response = await this.processWebhookWithResource(type, payload);

    return {
      success: true,
      conversationId,
      response
    };
  }

  /**
   * Process webhook with appropriate resource
   */
  private async processWebhookWithResource(
    type: 'voice' | 'sms' | 'email',
    payload: any
  ): Promise<any> {
    switch (type) {
      case 'voice':
        return await this.client.voice?.handleWebhook({
          provider: 'twilio',
          payload,
          timestamp: new Date()
        });

      case 'sms':
        return await this.client.sms?.handleWebhook({
          provider: 'twilio',
          payload,
          timestamp: new Date()
        });

      case 'email':
        return await this.client.email?.handleWebhook({
          provider: 'postmark',
          payload,
          timestamp: new Date()
        });

      default:
        throw new Error(`Unsupported webhook type: ${type}`);
    }
  }

  /**
   * Extract identifier from webhook payload
   */
  private extractIdentifier(type: 'voice' | 'sms' | 'email', payload: any): string {
    switch (type) {
      case 'voice':
        return payload.From || payload.To || payload.phoneNumber;

      case 'sms':
        return payload.From || payload.To || payload.phoneNumber;

      case 'email':
        return payload.From || payload.FromFull?.Email || payload.from || payload.email;

      default:
        throw new Error(`Cannot extract identifier for type: ${type}`);
    }
  }

  /**
   * Sanitize payload for storage (remove sensitive data)
   */
  private sanitizePayload(payload: any): any {
    const sanitized = { ...payload };

    // Remove sensitive fields
    delete sanitized.authToken;
    delete sanitized.apiKey;
    delete sanitized.password;
    delete sanitized.secret;

    return sanitized;
  }

  /**
   * Generate error response for specific channel
   */
  private generateErrorResponse(type: 'voice' | 'sms' | 'email'): any {
    switch (type) {
      case 'voice':
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I'm sorry, there was an error processing your call. Please try again later.</Say>
  <Hangup/>
</Response>`;

      case 'sms':
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, there was an error processing your message.</Message>
</Response>`;

      case 'email':
        return {
          success: false,
          error: 'Failed to process email webhook'
        };

      default:
        return { success: false, error: 'Unknown error' };
    }
  }

}
