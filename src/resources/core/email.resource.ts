/**
 * Email Resource
 * User-facing API for email operations with webhook support and AI auto-reply
 */

import { BaseResource, ResourceSession, WebhookContext } from '../base.resource';
import type { Agent } from '../../agent/core/Agent';
import { logger } from '../../utils/logger';
import { EmailAllowlist } from '../../utils/EmailAllowlist';

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
  attachments?: EmailAttachment[];
  metadata?: Record<string, any>;
}

export interface EmailAttachment {
  name: string;
  contentType: string;
  contentLength: number;
  content?: string; // Base64 encoded content
  contentId?: string; // For inline images
  url?: string; // Download URL (provider-specific)
}

export interface InboundEmailPayload {
  id: string;
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  attachments?: EmailAttachment[];
  receivedAt: string;

  // Extended Postmark fields
  fromName?: string;
  fromFull?: {
    email: string;
    name: string;
    mailboxHash?: string;
  };
  toFull?: Array<{
    email: string;
    name: string;
    mailboxHash?: string;
  }>;
  cc?: string;
  ccFull?: Array<{
    email: string;
    name: string;
    mailboxHash?: string;
  }>;
  bcc?: string;
  bccFull?: Array<{
    email: string;
    name: string;
    mailboxHash?: string;
  }>;
  replyTo?: string;
  messageStream?: string;
  originalRecipient?: string;
  mailboxHash?: string;
  tag?: string;
  strippedTextReply?: string;

  // Raw payload for provider-specific data
  rawPayload?: any;
}

export class EmailResource extends BaseResource<EmailSession> {
  private allowlist: EmailAllowlist;

  constructor(agent: Agent) {
    super(agent, 'email');

    // Get database instance from agent's memory storage and initialize allowlist
    const memory = agent.getMemory() as any;
    const db = memory.longTerm?.storage?.db;
    this.allowlist = new EmailAllowlist(db);
  }

  /**
   * Add an email to the allowlist (persists to database)
   */
  private async addToAllowlist(email: string, addedBy: string = 'conversation_init'): Promise<void> {
    await this.allowlist.add(email, addedBy);
  }

  /**
   * Check if an email is in the allowlist
   */
  private isInAllowlist(email: string): boolean {
    return this.allowlist.has(email);
  }

  /**
   * Remove an email from the allowlist (removes from database)
   * Public method for manual management
   */
  async removeFromAllowlist(email: string): Promise<void> {
    await this.allowlist.remove(email);
  }

  /**
   * Get all emails in the allowlist
   * Public method for inspection
   */
  getAllowlist(): string[] {
    return this.allowlist.getAll();
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
   * 4. trigger AI auto-reply
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

    // trigger AI auto-reply
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
    // Only Postmark is supported for inbound emails
    if (context.provider !== 'postmark') {
      throw new Error(`Unsupported email provider for webhooks: ${context.provider}. Only Postmark is supported.`);
    }

    return {
      id: context.payload.MessageID,
      from: context.payload.From || context.payload.FromFull?.Email,
      to: context.payload.To || (context.payload.ToFull ? context.payload.ToFull.map((t: any) => t.Email) : []),
      subject: context.payload.Subject,
      text: context.payload.TextBody,
      html: context.payload.HtmlBody,
      headers: context.payload.Headers ? this.parsePostmarkHeaders(context.payload.Headers) : {},
      attachments: context.payload.Attachments ? this.parsePostmarkAttachments(context.payload.Attachments) : [],
      receivedAt: context.payload.Date || new Date().toISOString(),

      // Extended Postmark fields
      fromName: context.payload.FromName,
      fromFull: context.payload.FromFull ? {
        email: context.payload.FromFull.Email,
        name: context.payload.FromFull.Name,
        mailboxHash: context.payload.FromFull.MailboxHash
      } : undefined,
      toFull: context.payload.ToFull?.map((t: any) => ({
        email: t.Email,
        name: t.Name,
        mailboxHash: t.MailboxHash
      })),
      cc: context.payload.Cc,
      ccFull: context.payload.CcFull?.map((c: any) => ({
        email: c.Email,
        name: c.Name,
        mailboxHash: c.MailboxHash
      })),
      bcc: context.payload.Bcc,
      bccFull: context.payload.BccFull?.map((b: any) => ({
        email: b.Email,
        name: b.Name,
        mailboxHash: b.MailboxHash
      })),
      replyTo: context.payload.ReplyTo,
      messageStream: context.payload.MessageStream,
      originalRecipient: context.payload.OriginalRecipient,
      mailboxHash: context.payload.MailboxHash,
      tag: context.payload.Tag,
      strippedTextReply: context.payload.StrippedTextReply,

      // Store entire raw payload for debugging and advanced use cases
      rawPayload: context.payload
    };
  }

  private async findOrCreateConversation(email: InboundEmailPayload): Promise<string> {
    logger.debug('[EmailResource] Thread analysis', {
      inReplyTo: email.headers?.['in-reply-to'],
      references: email.headers?.references,
      subject: email.subject,
      from: email.from
    });

    // Method 1: Check In-Reply-To header (standard email threading)
    if (email.headers?.['in-reply-to']) {
      const cleanMessageId = this.cleanMessageId(email.headers['in-reply-to']);
      const conversationId = await this.findConversationByMessageId(cleanMessageId);
      if (conversationId) {
        logger.info(`[EmailResource] Found conversation via In-Reply-To: ${conversationId}`, {
          messageId: cleanMessageId
        });
        return conversationId;
      }
    }

    // Method 2: Check References header (full thread history)
    if (email.headers?.references) {
      const messageIds = email.headers.references.split(/\s+/).map(id => this.cleanMessageId(id));
      logger.debug('[EmailResource] Checking References chain', {
        messageIds,
        count: messageIds.length
      });

      for (const msgId of messageIds) {
        const conversationId = await this.findConversationByMessageId(msgId);
        if (conversationId) {
          logger.info(`[EmailResource] Found conversation via References: ${conversationId}`, {
            matchedMessageId: msgId
          });
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
    logger.info(`[EmailResource] Creating new conversation for ${email.from}`, {
      subject: email.subject,
      messageId: email.id,
      hadInReplyTo: !!email.headers?.['in-reply-to'],
      hadReferences: !!email.headers?.references
    });

    // Add sender to allowlist since they initiated the conversation
    this.addToAllowlist(email.from);

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

  /**
   * Format message ID to standard email format with angle brackets and domain
   * Ensures Message-IDs are in proper format: <uuid@domain.com>
   */
  private formatMessageId(messageId: string, domain: string = 'loctelli.com'): string {
    // Already in proper format
    if (messageId.startsWith('<') && messageId.endsWith('>')) {
      return messageId;
    }

    // Has @ but missing angle brackets
    if (messageId.includes('@')) {
      return `<${messageId}>`;
    }

    // Just a UUID - add domain and angle brackets
    return `<${messageId}@${domain}>`;
  }

  private async storeInboundEmail(email: InboundEmailPayload, conversationId: string): Promise<void> {
    // Extract thread root (first message ID in References chain)
    const threadRoot = email.headers?.references
      ? email.headers.references.split(/\s+/)[0].replace(/^<|>$/g, '')
      : email.id;

    // Build content with attachment info if present
    let content = email.text || email.html || '';
    if (email.attachments && email.attachments.length > 0) {
      const attachmentInfo = email.attachments.map(att =>
        `[Attachment: ${att.name} (${att.contentType}, ${att.contentLength} bytes)]`
      ).join('\n');
      content = `${content}\n\n${attachmentInfo}`;
    }

    await this.agent.getMemory().store({
      id: `msg-${conversationId}-${Date.now()}`,
      content,
      timestamp: new Date(email.receivedAt),
      type: 'conversation',
      channel: 'email',
      role: 'user', // Incoming emails are from the user
      sessionMetadata: {
        conversationId,
        emailId: email.id, // Store email ID for thread detection
        threadRoot, // First message in the thread
        inReplyTo: email.headers?.['in-reply-to'],
        references: email.headers?.references,
        direction: 'inbound',
        from: email.from,
        to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
        subject: email.subject,
        attachments: email.attachments?.map(att => ({
          name: att.name,
          contentType: att.contentType,
          contentLength: att.contentLength,
          contentId: att.contentId
        }))
      },
    });

    logger.info(`[EmailResource] Stored inbound email in conversation ${conversationId}`, {
      emailId: email.id,
      threadRoot,
      hasReferences: !!email.headers?.references,
      attachmentCount: email.attachments?.length || 0,
      fromName: email.fromName,
      messageStream: email.messageStream,
      hasCc: !!email.cc,
      hasBcc: !!email.bcc
    });
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
    references?: string;
  }): Promise<void> {
    // Extract thread root from references if available
    const threadRoot = options.references
      ? options.references.split(/\s+/)[0].replace(/^<|>$/g, '')
      : options.messageId;

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
        threadRoot, // First message in the thread
        inReplyTo: options.inReplyTo,
        references: options.references,
        direction: 'outbound',
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject
      }
    });

    logger.info(`[EmailResource] Stored outbound email ${options.messageId} in conversation ${options.conversationId}`, {
      threadRoot,
      hasReferences: !!options.references
    });
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

    // SAFEGUARD 1: Check if this is a forwarded email from a new sender
    // If subject starts with "Fwd:" and we have no prior conversation, skip auto-reply
    if (/^Fwd:/i.test(email.subject)) {
      const hasConversationHistory = await this.hasConversationHistory(email.from);
      if (!hasConversationHistory) {
        logger.info(`[EmailResource] Skipping auto-reply for forwarded email from new sender: ${email.from}`);
        return false;
      }
    }

    // SAFEGUARD 2: Check if sender is in our allowlist
    // Only auto-reply to emails that have been allowlisted (i.e., they initiated a conversation)
    if (!this.isInAllowlist(email.from)) {
      logger.info(`[EmailResource] Skipping auto-reply for sender not in allowlist: ${email.from}`);
      return false;
    }

    logger.info(`[EmailResource] Triggering AI auto-reply for ${email.from}`);

    // Clean subject line (remove redundant "Re:" prefixes)
    const cleanSubject = email.subject.replace(/^(Re:\s*)+/gi, '').trim();

    // Format message IDs to ensure proper email threading
    const formattedInReplyTo = this.formatMessageId(email.id);

    // Build full References chain for proper email threading
    const references = email.headers?.references
      ? `${email.headers.references} ${formattedInReplyTo}`
      : formattedInReplyTo;

    logger.debug('[EmailResource] Auto-reply threading info', {
      originalSubject: email.subject,
      cleanSubject,
      inReplyTo: formattedInReplyTo,
      references,
      referencesCount: references.split(/\s+/).length
    });

    // Use Agent to compose and send reply
    // toolParams will override AI's parameters when the send_email tool is called
    const agentResponse = await this.processWithAgent(
      `A customer email was received from ${email.from} with the subject "${email.subject}".
      Respond to this customer email.
      Use the send_email tool to send your response.`,
      {
        conversationId,
        toolHint: 'send_email',
        toolParams: {
          to: email.from,
          subject: `Re: ${cleanSubject}`,
          inReplyTo: formattedInReplyTo,
          references: references
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
        subject: `Re: ${cleanSubject}`,
        body: emailBody,
        inReplyTo: formattedInReplyTo,
        references: references
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

  /**
   * Parse Postmark headers from array format
   */
  private parsePostmarkHeaders(headers: Array<{ Name: string; Value: string }>): Record<string, string> {
    const parsed: Record<string, string> = {};
    for (const header of headers) {
      parsed[header.Name.toLowerCase()] = header.Value;
    }
    return parsed;
  }

  /**
   * Parse Postmark attachment format
   * Postmark provides: Name, Content, ContentType, ContentLength, ContentID
   */
  private parsePostmarkAttachments(attachments: Array<{
    Name: string;
    Content: string;
    ContentType: string;
    ContentLength: number;
    ContentID?: string;
  }>): EmailAttachment[] {
    return attachments.map(att => ({
      name: att.Name,
      contentType: att.ContentType,
      contentLength: att.ContentLength,
      content: att.Content, // Base64 encoded
      contentId: att.ContentID
    }));
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

  /**
   * Check if we have any conversation history with this email address
   */
  private async hasConversationHistory(email: string): Promise<boolean> {
    const memories = await this.agent.getMemory().search({
      channel: 'email',
      limit: 50
    });

    // Check if we've ever communicated with this email address
    return memories.some(m =>
      m.sessionMetadata?.from === email ||
      (m.sessionMetadata?.to && m.sessionMetadata.to.includes(email))
    );
  }

}
