/**
 * Email Resource
 * User-facing API for email operations with webhook support and AI auto-reply
 */

import { BaseResource, ResourceSession, WebhookContext } from '../base.resource';
import type { Agent } from '../../agent/core/Agent';
import { logger } from '../../utils/logger';

export interface EmailSession extends ResourceSession {
  messageId?: string;
  threadId?: string;
  to: string | string[];
  from?: string;
  subject?: string;
  direction: 'inbound' | 'outbound';
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  attachments?: any[];
  metadata?: Record<string, any>;
}

export interface InboundEmailPayload {
  id: string;
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  receivedAt: string;
}

export class EmailResource extends BaseResource<EmailSession> {
  constructor(agent: Agent) {
    super(agent, 'email');
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
    const agentResponse = await this.processWithAgent(
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
   * Handle incoming email webhook (Resend/SendGrid)
   *
   * This implements the WEBHOOK-EMAIL-AUTOMATION-PLAN vision:
   * 1. Parse webhook payload
   * 2. Find or create conversation by analyzing email headers
   * 3. Store incoming email in agent memory as 'user' message
   * 4. Optionally trigger AI auto-reply
   */
  async handleWebhook(context: WebhookContext): Promise<{
    conversationId: string;
    emailId: string;
    autoReplied: boolean;
  }> {
    logger.info('[EmailResource] Handling inbound email webhook');

    // Parse provider-specific payload
    const parsed = this.parseWebhookPayload(context);

    // Find existing conversation or create new
    const conversationId = await this.findOrCreateConversation(parsed);

    // Store incoming email in memory as 'user' message
    await this.storeInboundEmail(parsed, conversationId);

    // Optionally trigger AI auto-reply
    const autoReplied = await this.triggerAutoReply(parsed, conversationId);

    return {
      conversationId,
      emailId: parsed.id,
      autoReplied
    };
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

    const agentResponse = await this.processWithAgent(
      `Generate an email with this prompt: ${options.prompt}. Context: ${options.context || 'none'}. Tone: ${options.tone || 'professional'}`,
      {
        conversationId,
        mode: 'email-generation'
      }
    );

    // Parse email from agent response
    return this.parseGeneratedEmail(agentResponse.content);
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
    const conversationId = await this.findConversationByMessageId(options.inReplyTo);
    if (!conversationId) {
      throw new Error(`No conversation found for message ${options.inReplyTo}`);
    }

    // Use Agent to compose reply
    const agentResponse = await this.processWithAgent(
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
    const draft = this.parseGeneratedEmail(agentResponse.content);
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

  private parseWebhookPayload(context: WebhookContext): InboundEmailPayload {
    // Provider-specific parsing (Resend, SendGrid, etc.)
    switch (context.provider) {
      case 'resend':
        return {
          id: context.payload.id,
          from: context.payload.from,
          to: context.payload.to,
          subject: context.payload.subject,
          text: context.payload.text,
          html: context.payload.html,
          headers: context.payload.headers,
          receivedAt: context.payload.receivedAt
        };

      case 'sendgrid':
        return {
          id: context.payload.message_id || `sg-${Date.now()}`,
          from: context.payload.from,
          to: context.payload.to,
          subject: context.payload.subject,
          text: context.payload.text,
          html: context.payload.html,
          headers: this.parseSendGridHeaders(context.payload.headers),
          receivedAt: new Date().toISOString()
        };

      default:
        throw new Error(`Unknown email provider: ${context.provider}`);
    }
  }

  private async findOrCreateConversation(email: InboundEmailPayload): Promise<string> {
    // Method 1: Check In-Reply-To header
    if (email.headers?.['in-reply-to']) {
      const conversationId = await this.findConversationByMessageId(email.headers['in-reply-to']);
      if (conversationId) return conversationId;
    }

    // Method 2: Check References header (full thread)
    if (email.headers?.references) {
      const messageIds = email.headers.references.split(' ');
      for (const msgId of messageIds) {
        const conversationId = await this.findConversationByMessageId(msgId);
        if (conversationId) return conversationId;
      }
    }

    // Method 3: Check subject line (Re: prefix)
    if (email.subject.startsWith('Re:')) {
      const originalSubject = email.subject.replace(/^Re:\s*/, '');
      const conversationId = await this.findConversationBySubject(originalSubject, email.from);
      if (conversationId) return conversationId;
    }

    // Method 4: Check from/to participants
    const conversationId = await this.findConversationByParticipants(email.from, email.to);
    if (conversationId) return conversationId;

    // No match found - create new conversation
    return await this.createSession({
      messageId: email.id,
      from: email.from,
      to: email.to,
      subject: email.subject,
      direction: 'inbound'
    });
  }

  private async storeInboundEmail(email: InboundEmailPayload, conversationId: string): Promise<void> {
    await this.agent.getMemory().store({
      id: `msg-${conversationId}-${Date.now()}`,
      content: email.text || email.html || '',
      timestamp: new Date(email.receivedAt),
      type: 'conversation',
      channel: 'email',
      role: 'user', // Incoming emails are from the user
      sessionMetadata: {
        conversationId,
        emailId: email.id,
        direction: 'inbound',
        from: email.from,
        to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
        subject: email.subject
      }
    });

    logger.info(`[EmailResource] Stored inbound email in conversation ${conversationId}`);
  }

  private async triggerAutoReply(
    email: InboundEmailPayload,
    conversationId: string
  ): Promise<boolean> {
    // Check if auto-reply is enabled (from config)
    const autoReplyEnabled = true; // TODO: Get from config

    if (!autoReplyEnabled) {
      return false;
    }

    logger.info(`[EmailResource] Triggering AI auto-reply for ${email.from}`);

    // Use Agent to compose and send reply
    await this.processWithAgent(
      `Respond to this customer email professionally`,
      {
        conversationId,
        toolHint: 'send_email',
        toolParams: {
          to: email.from,
          subject: `Re: ${email.subject}`,
          inReplyTo: email.id
        }
      }
    );

    return true;
  }

  private async findConversationByMessageId(messageId: string): Promise<string | null> {
    // Use the specific method for finding conversation by message ID
    const memory = await this.agent.getMemory().getConversationByMessageId(messageId);
    return memory?.sessionMetadata?.conversationId || null;
  }

  private async findConversationBySubject(subject: string, from: string): Promise<string | null> {
    // Search for email conversations and filter by subject and from
    const memory = await this.agent.getMemory().search({
      channel: 'email',
      limit: 50 // Get more results to filter through
    });

    // Filter by subject and from
    const match = memory.find(m => 
      m.sessionMetadata?.subject === subject && 
      m.sessionMetadata?.from === from
    );

    return match?.sessionMetadata?.conversationId || null;
  }

  private async findConversationByParticipants(from: string, to: string | string[]): Promise<string | null> {
    const toArray = Array.isArray(to) ? to : [to];
    
    // Search for email conversations and filter by participants
    const memory = await this.agent.getMemory().search({
      channel: 'email',
      limit: 50 // Get more results to filter through
    });

    // Filter by participants
    const match = memory.find(m => 
      m.sessionMetadata?.from === from && 
      toArray.includes(m.sessionMetadata?.to || '')
    );

    return match?.sessionMetadata?.conversationId || null;
  }

  private parseSendGridHeaders(headers: string): Record<string, string> {
    // Parse SendGrid's raw header string
    const parsed: Record<string, string> = {};
    const lines = headers.split('\n');
    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        parsed[match[1].toLowerCase()] = match[2];
      }
    }
    return parsed;
  }

  private parseGeneratedEmail(content: string): { subject: string; body: string; html?: string } {
    // Parse AI-generated email (extract subject and body)
    // This is a simple implementation - could be enhanced
    const lines = content.split('\n');
    const subjectLine = lines.find(l => l.startsWith('Subject:'));
    const subject = subjectLine ? subjectLine.replace('Subject:', '').trim() : 'No Subject';
    const body = lines.filter(l => !l.startsWith('Subject:')).join('\n').trim();

    return { subject, body };
  }
}
