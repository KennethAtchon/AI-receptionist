/**
 * Email Resource
 * User-facing API for email operations with webhook support and AI auto-reply
 */

import { BaseResource, WebhookContext } from '../base.resource';
import type { Agent } from '../../agent/core/Agent';
import { logger } from '../../utils/logger';
import { EmailRateLimiter } from '../../utils/RateLimiter';
import {
  EmailAllowlist,
  EmailAutoReplyDetector,
  EmailContentManager,
  EmailContentParser,
  EmailHeaderUtils,
  EmailPayloadParser,
  EmailStorage,
  ConversationMatcher
} from './processors';
import type {
  EmailSession,
  SendEmailOptions,
  EmailAttachment,
  InboundEmailPayload
} from '../../types/email.types';

// Re-export types for backwards compatibility
export type {
  EmailSession,
  SendEmailOptions,
  EmailAttachment,
  InboundEmailPayload
};

export class EmailResource extends BaseResource<EmailSession> {
  /**
   * Email allowlist manager
   * Use this to manage which email addresses can interact with the AI
   * @example
   * await client.email.allowlist.add('user@example.com');
   * client.email.allowlist.has('user@example.com');
   */
  public readonly allowlist: EmailAllowlist;

  /**
   * Rate limiter for preventing spam
   * Limits to 10 emails per hour per conversation by default
   * @example
   * const canSend = await client.email.rateLimiter.checkLimit('conv-123');
   */
  public readonly rateLimiter: EmailRateLimiter;

  /**
   * Email content manager
   * Manages content generation modes (text, html, template) and HTML templates
   * @example
   * client.email.content.setContentMode('template');
   * client.email.content.addHtmlTemplate('welcome', '<html>...</html>');
   */
  public readonly content: EmailContentManager;

  constructor(agent: Agent) {
    super(agent, 'email');

    // Get database instance from agent's memory storage and initialize allowlist
    const memory = agent.getMemory() as any;
    const db = memory.longTerm?.storage?.db;
    this.allowlist = new EmailAllowlist(db);

    // Initialize utilities
    this.rateLimiter = new EmailRateLimiter(); // 10 emails per hour by default
    this.content = new EmailContentManager();
  }


  /**
   * Process email request with agent, including email-specific instructions in system prompt
   */
  private async processEmailWithAgent(input: string = '', context: any): Promise<any> {
    // Inject email content mode instructions into system prompt
    const emailInstructions = this.content.getEmailContentInstructions();

    return await this.agent.process({
      id: `${this.channel}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      input,
      channel: this.channel,
      context: {
        ...context,
        systemPromptEnhancement: emailInstructions
      }
    });
  }

  /**
   * Send an email
   * Uses Agent → send_email tool → Email provider
   */
  async send(options: SendEmailOptions): Promise<EmailSession> {
    logger.info(`[EmailResource] Sending email to ${options.to}`);

    // Create conversation session
    const conversationId = await this.createSession(options.metadata);

    // Use Agent to send email via tools
    const agentResponse = await this.processEmailWithAgent(
      `Send email to ${options.to} with subject "${options.subject}"`,
      {
        conversationId,
        toolHint: 'send_email',
        toolParams: {
          to: options.to,
          subject: options.subject,
          body: options.body,
          html: options.html,
          attachments: options.attachments
        }
      }
    );

    // Extract message ID from tool result
    const messageId = agentResponse.metadata?.toolResults?.[0]?.result?.data?.messageId;

    // Store outbound email metadata for thread tracking
    if (messageId) {
      await EmailStorage.storeOutboundEmail({
        messageId,
        conversationId,
        to: options.to,
        subject: options.subject,
        body: options.body
      }, this.agent.getMemory());
    }

    return {
      id: messageId || `email-${Date.now()}`,
      messageId,
        conversationId,
        to: options.to,
        subject: options.subject,
      channel: 'email',
        direction: 'outbound',
      status: 'completed',
      startedAt: new Date(),
      metadata: options.metadata
    };
  }

  /**
   * Handle incoming email webhook (Postmark)
   *
   * This implements the WEBHOOK-EMAIL-AUTOMATION-PLAN vision:
   * 1. Parse webhook payload
   * 2. Find or create conversation by analyzing email headers
   * 3. Store incoming email in agent memory as 'user' message
   * 4. trigger AI auto-reply
   *
   * @param context - Webhook context from email provider
   * @param options - Optional configuration
   * @param options.instructions - Additional instructions for the AI (per-email customization)
   * @param options.autoReply - Enable/disable auto-reply (default: true)
   */
  async handleWebhook(
    context: WebhookContext,
    options?: {
      instructions?: string;
      autoReply?: boolean;
    }
  ): Promise<{
    conversationId: string;
    emailId: string;
    autoReplied: boolean;
  }> {
    logger.info('[EmailResource] Handling inbound email webhook');

    // Parse provider-specific payload
    const parsed = EmailPayloadParser.parse(context);

    // Find existing conversation or create new
    const conversationId = await this.findOrCreateConversation(parsed);

    // Store incoming email in memory as 'user' message
    await EmailStorage.storeInboundEmail(parsed, conversationId, this.agent.getMemory());

    // trigger AI auto-reply (skip if autoReply is explicitly false)
    const shouldAutoReply = options?.autoReply !== false;
    const autoReplied = shouldAutoReply
      ? await this.triggerAutoReply(parsed, conversationId, options?.instructions)
      : false;

    return {
      conversationId,
      emailId: parsed.id,
      autoReplied
    };
  }

  /**
   * Send bulk emails
   * Uses Agent to send multiple emails at once via send_bulk_emails tool
   *
   * @example
   * ```typescript
   * const results = await client.email.sendBulk({
   *   emails: [
   *     { to: 'user1@example.com', subject: 'Hello', body: 'Hi there!' },
   *     { to: 'user2@example.com', subject: 'Hello', body: 'Hi there!' }
   *   ]
   * });
   * ```
   */
  async sendBulk(options: {
    emails: Array<{
      to: string;
      subject: string;
      body: string;
      tag?: string;
      metadata?: Record<string, string>;
    }>;
    chunkSize?: number;
  }): Promise<Array<{
    to: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>> {
    logger.info(`[EmailResource] Sending bulk emails (${options.emails.length} emails)`);

    // Create conversation session
    const conversationId = await this.createSession({
      bulkEmailCount: options.emails.length
    });

    // Use Agent to send bulk emails via tool
    const agentResponse = await this.processEmailWithAgent(
      `Send ${options.emails.length} emails in bulk`,
      {
        conversationId,
        toolHint: 'send_bulk_emails',
        toolParams: {
          emails: options.emails
        }
      }
    );

    // Extract results from tool execution
    const toolResult = agentResponse.metadata?.toolResults?.[0]?.result;

    if (!toolResult?.success) {
      throw new Error(toolResult?.error || 'Failed to send bulk emails');
    }

    return toolResult.data.results;
  }

  /**
   * AI-powered email generation
   * Uses Agent to compose email based on prompt
   */
  async generate(options: {
    prompt: string;
    context?: string;
    tone?: string;
    metadata?: Record<string, any>;
  }): Promise<{ subject: string; body: string; html?: string }> {
    logger.info('[EmailResource] Generating email with AI');

    const conversationId = await this.createSession(options.metadata);

    const agentResponse = await this.processEmailWithAgent(
      `Generate an email with this prompt: ${options.prompt}. Context: ${options.context || 'none'}. Tone: ${options.tone || 'professional'}`,
      {
        conversationId,
        mode: 'email-generation'
      }
    );

    // Parse email from agent response
    return EmailContentParser.parseGeneratedEmail(agentResponse.content);
  }

  /**
   * Reply to an existing email thread
   * Finds conversation and uses Agent to compose contextual reply
   */
  async reply(options: {
    inReplyTo: string; // Message ID
    prompt?: string;
    autoSend?: boolean;
  }): Promise<EmailSession> {
    logger.info(`[EmailResource] Replying to email ${options.inReplyTo}`);

    // Find conversation by message ID
    const conversationId = await ConversationMatcher.findConversationByMessageId(
      options.inReplyTo,
      this.agent.getMemory()
    );

    if (!conversationId) {
      throw new Error(`No conversation found for message ${options.inReplyTo}`);
    }

    // Use Agent to compose reply
    const agentResponse = await this.processEmailWithAgent(
      options.prompt || 'Compose a professional reply to the previous email',
      {
        conversationId,
        toolHint: options.autoSend ? 'send_email' : undefined
      }
    );

    if (options.autoSend) {
      const messageId = agentResponse.metadata?.toolResults?.[0]?.result?.data?.messageId;
      return {
        id: messageId || `email-${Date.now()}`,
        messageId,
        conversationId,
        to: '', // Extract from conversation
        channel: 'email',
        direction: 'outbound',
        status: 'completed',
        startedAt: new Date()
      };
    }

    // Return draft
    const draft = EmailContentParser.parseGeneratedEmail(agentResponse.content);
    return {
      id: `draft-${Date.now()}`,
          conversationId,
      to: '', // Extract from conversation
      subject: draft.subject,
          channel: 'email',
      direction: 'outbound',
      status: 'inactive',
      startedAt: new Date(),
      metadata: { draft }
    };
  }

  // Private helper methods
  private async findOrCreateConversation(email: InboundEmailPayload): Promise<string> {
    // Try to find existing conversation using ConversationMatcher
    const existingConversation = await ConversationMatcher.findConversation(email, this.agent.getMemory());

    if (existingConversation) {
      return existingConversation;
    }

    // No match found - create new conversation
    logger.info(`[EmailResource] Creating new conversation for ${email.from}`);

    // Add sender to allowlist since they initiated the conversation
    await this.allowlist.add(email.from, 'conversation_init');

    return await this.createSession({
      messageId: email.id,
      from: email.from,
      to: email.to,
      subject: email.subject,
      direction: 'inbound'
    });
  }


  private async triggerAutoReply(
    email: InboundEmailPayload,
    conversationId: string,
    additionalInstructions?: string
  ): Promise<boolean> {
    // Check if auto-reply is enabled (from config)
    const autoReplyEnabled = true; // TODO: Get from config

    if (!autoReplyEnabled) {
      return false;
    }

    // SAFEGUARD 0: Check for auto-reply indicators (prevent email loops)
    if (EmailAutoReplyDetector.isAutoReply(email.headers)) {
      logger.info('[EmailResource] Skipping auto-reply - email detected as auto-reply');
      return false;
    }

    // SAFEGUARD 1: Check if this is a forwarded email from a new sender
    // If subject starts with "Fwd:" and we have no prior conversation, skip auto-reply
    if (/^Fwd:/i.test(email.subject)) {
      const hasConversationHistory = await ConversationMatcher.hasConversationHistory(email.from, this.agent.getMemory());
      if (!hasConversationHistory) {
        logger.info(`[EmailResource] Skipping auto-reply for forwarded email from new sender: ${email.from}`);
        return false;
      }
    }

    // SAFEGUARD 2: Check if sender is in our allowlist
    // Only auto-reply to emails that have been allowlisted (i.e., they initiated a conversation)
    if (!this.allowlist.has(email.from)) {
      logger.info(`[EmailResource] Skipping auto-reply for sender not in allowlist: ${email.from}`);
      return false;
    }

    // SAFEGUARD 3: Check rate limit (prevent spam loops)
    const canSend = await this.rateLimiter.checkLimit(conversationId);
    if (!canSend) {
      logger.warn('[EmailResource] Skipping auto-reply due to rate limit', {
        conversationId,
        from: email.from
      });
      return false;
    }

    logger.info(`[EmailResource] Triggering AI auto-reply for ${email.from}`);

    // Clean subject line (remove redundant "Re:" prefixes)
    const cleanSubject = EmailHeaderUtils.cleanSubject(email.subject);

    // Format message IDs to ensure proper email threading
    const formattedInReplyTo = EmailHeaderUtils.formatMessageId(email.id);

    // Build full References chain for proper email threading
    const references = EmailHeaderUtils.buildReferencesChain(email.headers?.references, formattedInReplyTo);

    logger.debug('[EmailResource] Auto-reply threading info', {
      originalSubject: email.subject,
      cleanSubject,
      inReplyTo: formattedInReplyTo,
      references,
      referencesCount: references.split(/\s+/).length,
      hasAdditionalInstructions: !!additionalInstructions
    });

    // Use Agent to compose and send reply
    // Email content already stored in conversation history by storeInboundEmail()
    // System prompt contains email instructions via systemPromptEnhancement
    // toolParams will override AI's parameters when the send_email tool is called
    const agentResponse = await this.processEmailWithAgent(
      additionalInstructions || '', // Optional additional instructions, empty by default
      {
        conversationId,
        toolHint: 'send_email',
        toolParams: {
          to: email.from,
          subject: `Re: ${cleanSubject}`,
          inReplyTo: formattedInReplyTo,
          references: references,
          cc: email.cc || undefined // Include original CC recipients
        }
      }
    );

    // Extract message ID and body from tool result
    const toolResult = agentResponse.metadata?.toolResults?.[0]?.result;
    const messageId = toolResult?.data?.messageId;
    const emailBody = agentResponse.content;

    // Store outbound email metadata for thread tracking
    if (messageId) {
      await EmailStorage.storeOutboundEmail({
        messageId,
        conversationId,
        to: email.from,
        subject: `Re: ${cleanSubject}`,
        body: emailBody,
        inReplyTo: formattedInReplyTo,
        references: references
      }, this.agent.getMemory());
    }

    return true;
  }

}
