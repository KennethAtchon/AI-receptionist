/**
 * SMS Resource
 * Complete SMS implementation with 4-layer protection system
 * Mirrors the architecture of EmailResource
 */

import { BaseResource, ResourceSession, WebhookContext } from '../base.resource';
import type { Agent } from '../../agent/core/Agent';
import { logger } from '../../utils/logger';
import { randomUUID } from 'crypto';
import {
  SMSPayloadParser,
  SMSStorage,
  SMSAutoReplyDetector,
  SMSRateLimiter,
  SMSAllowlist,
  ConversationMatcher,
  PhoneNumberUtils
} from '../../utils/sms';
import type { DrizzleStorage } from '../../agent/storage';
import type { InboundSMSPayload } from '../../types/sms.types';

// Helper function to generate UUID
function generateUUID(): string {
  return randomUUID();
}

export interface SMSSession extends ResourceSession {
  messageSid?: string;
  to: string;
  from?: string;
  direction: 'inbound' | 'outbound';
}

export interface SendSMSOptions {
  to: string;
  body: string;
  from?: string;
  mediaUrl?: string[];
  metadata?: Record<string, any>;
}

export interface SMSResourceConfig {
  rateLimitConfig?: {
    maxRequests?: number;
    windowMs?: number;
  };
  autoReplyEnabled?: boolean;
}

export class SMSResource extends BaseResource<SMSSession> {
  private rateLimiter: SMSRateLimiter;
  public allowlist: SMSAllowlist;
  private autoReplyEnabled: boolean;

  constructor(agent: Agent, config?: SMSResourceConfig, db?: any) {
    super(agent, 'sms');

    // Initialize rate limiter
    this.rateLimiter = new SMSRateLimiter(config?.rateLimitConfig);

    // Initialize allowlist (with database if available)
    this.allowlist = new SMSAllowlist(db);

    this.autoReplyEnabled = config?.autoReplyEnabled !== false; // Default: true

    logger.info('[SMSResource] Initialized with config', {
      autoReplyEnabled: this.autoReplyEnabled,
      rateLimit: config?.rateLimitConfig
    });
  }

  /**
   * Send an SMS
   * Uses Agent → send_sms tool → Twilio provider
   */
  async send(options: SendSMSOptions): Promise<SMSSession> {
    logger.info(`[SMSResource] Sending SMS to ${options.to}`);

    // Normalize phone number
    const normalizedTo = PhoneNumberUtils.normalize(options.to);

    const conversationId = await this.createSession({
      ...options.metadata,
      to: normalizedTo
    });

    const agentResponse = await this.processWithAgent(
      `Send SMS to ${normalizedTo}: ${options.body}`,
      {
        conversationId,
        channel: 'sms',
        toolHint: 'send_sms',
        toolParams: {
          to: normalizedTo,
          message: options.body,
          mediaUrl: options.mediaUrl
        }
      }
    );

    const messageSid = agentResponse.metadata?.toolResults?.[0]?.result?.data?.messageSid;

    // Store outbound SMS
    if (messageSid) {
      await SMSStorage.storeOutboundSMS(
        messageSid,
        conversationId,
        {
          to: normalizedTo,
          body: options.body,
          from: options.from,
          mediaUrl: options.mediaUrl
        },
        this.agent.getMemory()
      );
    }

    return {
      id: messageSid || `sms-${Date.now()}`,
      messageSid,
      conversationId,
      to: normalizedTo,
      from: options.from,
      channel: 'sms',
      direction: 'outbound',
      status: 'completed',
      startedAt: new Date(),
      metadata: options.metadata
    };
  }

  /**
   * Handle incoming SMS webhook (Twilio)
   * Implements 4-layer protection system:
   * - Layer 0: Auto-reply detection (STOP keywords)
   * - Layer 1: First-message check (new contacts)
   * - Layer 2: Allowlist check
   * - Layer 3: Rate limiting
   */
  async handleWebhook(context: WebhookContext): Promise<any> {
    logger.info('[SMSResource] Handling inbound SMS webhook', {
      MessageSid: context.payload.MessageSid,
      From: context.payload.From
    });

    try {
      // Validate payload
      if (!SMSPayloadParser.validate(context.payload)) {
        logger.error('[SMSResource] Invalid webhook payload', context.payload);
        return this.generateErrorResponse();
      }

      // Parse payload
      const sms = SMSPayloadParser.parse(context.payload);

      // Find or create conversation
      let conversationId = await ConversationMatcher.findConversation(
        sms,
        this.agent.getMemory()
      );

      const isNewConversation = !conversationId;

      // Ensure we have a conversationId
      if (!conversationId) {
        conversationId = generateUUID();
        logger.info('[SMSResource] New conversation created', {
          conversationId,
          from: sms.from
        });

        // Auto-add to allowlist on first contact
        await this.allowlist.add(sms.from, 'conversation_init');
      }

      // Now conversationId is guaranteed to be non-null
      const finalConversationId: string = conversationId;

      // Store inbound SMS
      await SMSStorage.storeInboundSMS(sms, finalConversationId, this.agent.getMemory());

      // Check if should auto-reply
      const shouldReply = await this.shouldAutoReply(sms, finalConversationId, isNewConversation);

      if (!shouldReply) {
        // Return empty TwiML (no auto-reply)
        return this.generateEmptyResponse();
      }

      // Generate and send auto-reply
      const replied = await this.triggerAutoReply(sms, finalConversationId);

      if (replied) {
        logger.info('[SMSResource] Auto-reply sent successfully', {
          conversationId: finalConversationId,
          to: sms.from
        });
      }

      // Return empty TwiML (reply sent via API, not TwiML)
      return this.generateEmptyResponse();

    } catch (error) {
      logger.error('[SMSResource] Webhook handling error', error as Error);
      return this.generateErrorResponse();
    }
  }

  /**
   * Check if should auto-reply (4-layer protection)
   */
  private async shouldAutoReply(
    sms: InboundSMSPayload,
    conversationId: string,
    isNewConversation: boolean
  ): Promise<boolean> {
    // Check if auto-reply is enabled
    if (!this.autoReplyEnabled) {
      logger.info('[SMSResource] Auto-reply disabled globally');
      return false;
    }

    // Layer 0: Auto-reply detection (STOP, etc.)
    const autoReplyReport = SMSAutoReplyDetector.isAutoReply(sms.body);
    if (autoReplyReport.isAutoReply) {
      logger.info('[SMSResource] Skipping auto-reply - auto-reply keyword detected', {
        keywords: autoReplyReport.detectedKeywords
      });

      // Handle STOP command
      if (SMSAutoReplyDetector.isStop(sms.body)) {
        await this.allowlist.remove(sms.from);
        logger.info('[SMSResource] Number removed from allowlist (STOP)', {
          from: sms.from
        });
      }

      // Handle START command
      if (SMSAutoReplyDetector.isStart(sms.body)) {
        await this.allowlist.add(sms.from, 'opt_in');
        logger.info('[SMSResource] Number added to allowlist (START)', {
          from: sms.from
        });
      }

      return false;
    }

    // Layer 1: First-message check (already handled - auto-add to allowlist)
    // This is different from email, where we skip forwarded emails from new senders

    // Layer 2: Allowlist check
    if (!this.allowlist.has(sms.from)) {
      logger.info('[SMSResource] Skipping auto-reply - sender not in allowlist', {
        from: sms.from
      });
      return false;
    }

    // Layer 3: Rate limiting
    const canSend = await this.rateLimiter.checkLimit(conversationId);
    if (!canSend) {
      const remaining = this.rateLimiter.getRemaining(conversationId);
      logger.warn('[SMSResource] Skipping auto-reply due to rate limit', {
        conversationId,
        from: sms.from,
        remaining
      });
      return false;
    }

    // All checks passed
    return true;
  }

  /**
   * Trigger auto-reply
   */
  private async triggerAutoReply(
    sms: InboundSMSPayload,
    conversationId: string
  ): Promise<boolean> {
    try {
      // Generate AI response using agent
      const agentResponse = await this.processWithAgent(
        '', // Empty input - agent will use conversation history
        {
          conversationId,
          channel: 'sms',
          toolHint: 'send_sms',
          toolParams: {
            to: sms.from
          }
        }
      );

      // Extract message SID from tool result
      const messageSid = agentResponse.metadata?.toolResults?.[0]?.result?.data?.messageSid;

      if (messageSid) {
        logger.info('[SMSResource] Auto-reply sent', {
          conversationId,
          messageSid,
          to: sms.from
        });
        return true;
      } else {
        logger.warn('[SMSResource] Auto-reply failed - no message SID', {
          conversationId
        });
        return false;
      }

    } catch (error) {
      logger.error('[SMSResource] Failed to send auto-reply', error as Error);
      return false;
    }
  }

  /**
   * Generate empty TwiML response (no reply)
   */
  private generateEmptyResponse(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;
  }

  /**
   * Generate error TwiML response
   */
  private generateErrorResponse(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, there was an error processing your message.</Message>
</Response>`;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.rateLimiter.dispose();
  }
}
