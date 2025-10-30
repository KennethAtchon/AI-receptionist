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

    // Store outbound email metadata for thread tracking
    if (messageId) {
      await this.storeOutboundEmail({
        messageId,
        conversationId,
        to: options.to,
        subject: options.subject,
        body: options.body
      });
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
   * Handle incoming email webhook (Postmark/Resend/SendGrid)
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
    // Provider-specific parsing (Resend, SendGrid, Postmark)
    switch (context.provider) {
      case 'postmark':
        return {
          id: context.payload.MessageID,
          from: context.payload.From || context.payload.FromFull?.Email,
          to: context.payload.To || (context.payload.ToFull ? context.payload.ToFull.map((t: any) => t.Email) : []),
          subject: context.payload.Subject,
          text: context.payload.TextBody,
          html: context.payload.HtmlBody,
          headers: context.payload.Headers ? this.parsePostmarkHeaders(context.payload.Headers) : {},
          receivedAt: context.payload.Date || new Date().toISOString()
        };

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
    // Method 1: Check In-Reply-To header (standard email threading)
    if (email.headers?.['in-reply-to']) {
      const cleanMessageId = this.cleanMessageId(email.headers['in-reply-to']);
      const conversationId = await this.findConversationByMessageId(cleanMessageId);
      if (conversationId) {
        logger.info(`[EmailResource] Found conversation via In-Reply-To: ${conversationId}`);
        return conversationId;
      }
    }

    // Method 2: Check References header (full thread history)
    if (email.headers?.references) {
      const messageIds = email.headers.references.split(/\s+/).map(id => this.cleanMessageId(id));
      for (const msgId of messageIds) {
        const conversationId = await this.findConversationByMessageId(msgId);
        if (conversationId) {
          logger.info(`[EmailResource] Found conversation via References: ${conversationId}`);
          return conversationId;
        }
      }
    }

    // Method 3: Check subject line (Re:, Fwd:, Fw: prefixes)
    const subjectPatterns = [/^Re:\s*/i, /^Fwd:\s*/i, /^Fw:\s*/i];
    let cleanSubject = email.subject;
    let isReplyOrForward = false;

    for (const pattern of subjectPatterns) {
      if (pattern.test(email.subject)) {
        cleanSubject = email.subject.replace(pattern, '');
        isReplyOrForward = true;
        break;
      }
    }

    if (isReplyOrForward) {
      // Strip multiple prefixes (e.g., "Re: Fwd: Original Subject")
      cleanSubject = cleanSubject.replace(/^(Re|Fwd|Fw):\s*/gi, '').trim();

      const conversationId = await this.findConversationBySubject(cleanSubject, email.from);
      if (conversationId) {
        logger.info(`[EmailResource] Found conversation via subject matching: ${conversationId}`);
        return conversationId;
      }
    }

    // Method 4: Check from/to participants (for ongoing conversations)
    const conversationId = await this.findConversationByParticipants(email.from, email.to);
    if (conversationId) {
      logger.info(`[EmailResource] Found conversation via participants: ${conversationId}`);
      return conversationId;
    }

    // No match found - create new conversation
    logger.info(`[EmailResource] Creating new conversation for ${email.from}`);
    return await this.createSession({
      messageId: email.id,
      from: email.from,
      to: email.to,
      subject: email.subject,
      direction: 'inbound'
    });
  }

  /**
   * Clean message ID by removing angle brackets and whitespace
   */
  private cleanMessageId(messageId: string): string {
    return messageId.replace(/^<|>$/g, '').trim();
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
        emailId: email.id, // Store email ID for thread detection
        direction: 'inbound',
        from: email.from,
        to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
        subject: email.subject
      }
    });

    logger.info(`[EmailResource] Stored inbound email in conversation ${conversationId}`);
  }

  /**
   * Store outbound email metadata
   * CRITICAL: This ensures we can link future replies to this conversation
   */
  private async storeOutboundEmail(options: {
    messageId: string;
    conversationId: string;
    to: string | string[];
    subject: string;
    body: string;
    inReplyTo?: string;
  }): Promise<void> {
    await this.agent.getMemory().store({
      id: `msg-${options.conversationId}-${Date.now()}`,
      content: options.body,
      timestamp: new Date(),
      type: 'conversation',
      channel: 'email',
      role: 'assistant', // Outgoing emails are from the assistant
      sessionMetadata: {
        conversationId: options.conversationId,
        emailId: options.messageId, // Store email ID for thread detection
        direction: 'outbound',
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        inReplyTo: options.inReplyTo
      }
    });

    logger.info(`[EmailResource] Stored outbound email ${options.messageId} in conversation ${options.conversationId}`);
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
    // toolParams will override AI's parameters when the send_email tool is called
    const agentResponse = await this.processWithAgent(
      `A customer email was received from ${email.from} with the subject "${email.subject}".
      Respond to this customer email professionally and be helpful.
      Use the send_email tool to send your response.`,
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

    // Extract message ID and body from tool result
    const toolResult = agentResponse.metadata?.toolResults?.[0]?.result;
    const messageId = toolResult?.data?.messageId;
    const emailBody = agentResponse.content;

    // Store outbound email metadata for thread tracking
    if (messageId) {
      await this.storeOutboundEmail({
        messageId,
        conversationId,
        to: email.from,
        subject: `Re: ${email.subject}`,
        body: emailBody,
        inReplyTo: email.id
      });
    }

    return true;
  }

  private async findConversationByMessageId(messageId: string): Promise<string | null> {
    // Search for email conversations by emailId
    const memories = await this.agent.getMemory().search({
      channel: 'email',
      limit: 100 // Search through recent emails
    });

    // Find memory with matching emailId
    const match = memories.find(m => m.sessionMetadata?.emailId === messageId);
    return match?.sessionMetadata?.conversationId || null;
  }

  private async findConversationBySubject(subject: string, from: string): Promise<string | null> {
    // Search for email conversations and filter by subject
    const memories = await this.agent.getMemory().search({
      channel: 'email',
      limit: 100 // Get more results to filter through
    });

    // Normalize subject for comparison
    const normalizeSubject = (subj: string) =>
      subj.replace(/^(Re|Fwd|Fw):\s*/gi, '').trim().toLowerCase();

    const normalizedSearchSubject = normalizeSubject(subject);

    // First try: exact match with same sender
    let match = memories.find(m =>
      m.sessionMetadata?.subject &&
      normalizeSubject(m.sessionMetadata.subject) === normalizedSearchSubject &&
      m.sessionMetadata?.from === from
    );

    if (match) return match.sessionMetadata?.conversationId || null;

    // Second try: exact match with any participant (for forwarded emails)
    match = memories.find(m =>
      m.sessionMetadata?.subject &&
      normalizeSubject(m.sessionMetadata.subject) === normalizedSearchSubject
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

  private parsePostmarkHeaders(headers: Array<{ Name: string; Value: string }>): Record<string, string> {
    // Parse Postmark's header array format
    const parsed: Record<string, string> = {};
    for (const header of headers) {
      parsed[header.Name.toLowerCase()] = header.Value;
    }
    return parsed;
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
