/**
 * Enhanced Webhook Router
 * Handles incoming webhooks from various providers with session management
 * Supports Twilio (Voice, SMS) and Postmark (Email)
 */

import type { AIReceptionist } from '../client';
import type { Session, SessionType } from '../sessions';
import { logger } from '../utils/logger';

export interface WebhookResponse {
  success: boolean;
  sessionId?: string;
  conversationId?: string;
  response?: any;
  error?: string;
}

export class WebhookRouter {
  constructor(private client: AIReceptionist) {}

  /**
   * Route incoming webhook to appropriate session
   */
  async routeWebhook(
    type: SessionType,
    payload: any,
    sessionId?: string
  ): Promise<WebhookResponse> {
    try {
      logger.info(`[WebhookRouter] Routing ${type} webhook`, { sessionId });

      // If sessionId provided, route to existing session
      if (sessionId) {
        return await this.routeToExistingSession(type, payload, sessionId);
      }

      // Otherwise, create new session or find by identifier
      return await this.routeToNewOrExistingSession(type, payload);
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
   */
  async handleEmailWebhook(payload: any, signature?: string): Promise<any> {
    try {
      // Verify webhook signature
      if (signature) {
        await this.verifyWebhookSignature('postmark', payload, signature);
      }

      const response = await this.routeWebhook('email', payload);
      return response;
    } catch (error) {
      logger.error('[WebhookRouter] Email webhook error:', error as Error);
      throw error;
    }
  }

  /**
   * Create new session from webhook data
   */
  async createSessionFromWebhook(
    type: SessionType,
    payload: any
  ): Promise<Session> {
    logger.info(`[WebhookRouter] Creating session from webhook`, { type });

    const identifier = this.extractIdentifier(type, payload);
    const sessionManager = this.client.getSessionManager();

    return await sessionManager.createSession(type, {
      identifier,
      metadata: {
        source: 'webhook',
        payload: this.sanitizePayload(payload)
      }
    });
  }

  /**
   * Process webhook through existing session
   */
  private async routeToExistingSession(
    type: SessionType,
    payload: any,
    sessionId: string
  ): Promise<WebhookResponse> {
    const sessionManager = this.client.getSessionManager();
    const session = await sessionManager.getSession(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Update session activity
    await sessionManager.updateActivity(sessionId);

    // Process through appropriate resource
    const response = await this.processWebhookWithResource(type, payload);

    return {
      success: true,
      sessionId: session.id,
      conversationId: session.conversationId,
      response
    };
  }

  /**
   * Route to new or existing session based on identifier
   */
  private async routeToNewOrExistingSession(
    type: SessionType,
    payload: any
  ): Promise<WebhookResponse> {
    const identifier = this.extractIdentifier(type, payload);
    const sessionManager = this.client.getSessionManager();

    // Try to find existing session
    let session = await sessionManager.getSessionByIdentifier(type, identifier);

    // Create new session if none exists
    if (!session) {
      session = await this.createSessionFromWebhook(type, payload);
    } else {
      // Update existing session activity
      await sessionManager.updateActivity(session.id);
    }

    // Process through appropriate resource
    const response = await this.processWebhookWithResource(type, payload);

    return {
      success: true,
      sessionId: session.id,
      conversationId: session.conversationId,
      response
    };
  }

  /**
   * Process webhook with appropriate resource
   */
  private async processWebhookWithResource(
    type: SessionType,
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
  private extractIdentifier(type: SessionType, payload: any): string {
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
  private generateErrorResponse(type: SessionType): any {
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

  /**
   * Verify webhook signature
   */
  private async verifyWebhookSignature(
    provider: string,
    payload: any,
    signature: string
  ): Promise<void> {
    logger.debug(`[WebhookRouter] Verifying ${provider} webhook signature`);

    // TODO: Implement actual signature verification per provider
    // For Postmark: https://postmarkapp.com/developer/webhooks/webhooks-overview#webhook-security
    // This would involve:
    // 1. Getting the webhook secret from config
    // 2. Computing the expected signature using HMAC
    // 3. Comparing with the provided signature
    // 4. Throwing error if verification fails

    // For now, we'll log and skip verification
    logger.warn('[WebhookRouter] Signature verification not yet implemented');
  }
}
