/**
 * Email Router
 * Routes emails to appropriate provider based on configuration
 * Supports multiple providers simultaneously with priority-based fallback
 */

import type { IEmailProvider, EmailParams, EmailResult } from './email-provider.interface';
import type { Agent } from '../../../agent/core/Agent';
import { logger } from '../../../utils/logger';

export interface ParsedEmail {
  messageId: string;
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  receivedAt: string;
}

export interface EmailProviderEntry {
  provider: IEmailProvider;
  priority: number;
  tags?: string[];
  domains?: string[]; // Route specific domains to specific providers
}

export class EmailRouter {
  private providers: Map<string, EmailProviderEntry> = new Map();
  private sortedProviders: EmailProviderEntry[] = [];
  private agent?: Agent;

  constructor(agent?: Agent) {
    this.agent = agent;
  }

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
   * Handle incoming webhook from email provider
   * Automatically stores in conversation and triggers AI response
   */
  async handleInboundWebhook(payload: {
    provider: 'postmark';
    data: any;
  }): Promise<{
    conversationId: string;
    emailId: string;
    autoReplied: boolean;
  }> {
    const parsed = this.parseWebhookPayload(payload);
    const conversation = await this.findOrCreateConversation(parsed);
    await this.storeInboundEmail(parsed, conversation);
    const aiReply = await this.triggerAutoReply(parsed, conversation);

    return {
      conversationId: conversation.id,
      emailId: parsed.messageId,
      autoReplied: !!aiReply
    };
  }

  private parseWebhookPayload(payload: any): ParsedEmail {
    switch (payload.provider) {
      case 'postmark':
        // Postmark inbound email format
        return {
          messageId: payload.data.MessageID,
          from: payload.data.From || payload.data.FromFull?.Email,
          to: payload.data.To || (payload.data.ToFull ? payload.data.ToFull.map((t: any) => t.Email) : []),
          subject: payload.data.Subject,
          text: payload.data.TextBody,
          html: payload.data.HtmlBody,
          headers: payload.data.Headers ? this.parsePostmarkHeaders(payload.data.Headers) : {},
          receivedAt: payload.data.Date || new Date().toISOString()
        };

      default:
        throw new Error(`Unknown provider: ${payload.provider}`);
    }
  }

  // Additional helper methods would be implemented here
  // These are placeholder methods that would need to be implemented
  // based on the specific requirements of the email automation system

  private async findOrCreateConversation(email: ParsedEmail): Promise<any> {
    if (!this.agent) {
      return { id: `conv-${Date.now()}` };
    }

    const memory = this.agent.getMemory();
    
    // Try to find existing conversation by message ID
    if (email.headers?.['message-id']) {
      const existingConv = await memory.getConversationByMessageId(email.headers['message-id']);
      if (existingConv) {
        return existingConv;
      }
    }

    // Try to find by subject line
    if (email.subject) {
      const conversations = await memory.search({
        channel: 'email',
        limit: 10
      });
      
      const matchingConv = conversations.find(conv => 
        conv.sessionMetadata?.subject === email.subject
      );
      
      if (matchingConv) {
        return matchingConv;
      }
    }

    // Try to find by participants
    const participants = Array.isArray(email.to) ? email.to : [email.to];
    const conversations = await memory.search({
      channel: 'email',
      limit: 20
    });
    
    const matchingConv = conversations.find(conv => {
      const convParticipants = conv.sessionMetadata?.participants || [];
      return participants.some(to => convParticipants.includes(to));
    });
    
    if (matchingConv) {
      return matchingConv;
    }

    // Create new conversation
    return {
      id: `conv-${Date.now()}`,
      channel: 'email',
      sessionMetadata: {
        participants: participants,
        subject: email.subject,
        messageId: email.messageId
      }
    };
  }

  private async storeInboundEmail(email: ParsedEmail, conversation: any): Promise<void> {
    if (!this.agent) {
      return;
    }

    const memory = this.agent.getMemory();
    
    // Store the inbound email in memory
    await memory.store({
      id: `email-${email.messageId}`,
      content: email.text || email.html || '',
      timestamp: new Date(email.receivedAt),
      type: 'conversation',
      channel: 'email',
      importance: 5,
      metadata: {
        messageId: email.messageId,
        from: email.from,
        to: email.to,
        subject: email.subject,
        receivedAt: email.receivedAt,
        headers: email.headers,
        type: 'inbound',
        conversationId: conversation.id,
        sessionMetadata: {
          ...conversation.sessionMetadata,
          lastMessageAt: email.receivedAt
        }
      }
    });

    logger.info(`[EmailRouter] Stored inbound email ${email.messageId} in conversation ${conversation.id}`);
  }

  private async triggerAutoReply(email: ParsedEmail, conversation: any): Promise<any> {
    if (!this.agent) {
      return null;
    }

    try {
      // Use the agent to process the inbound email and generate a response
      const response = await this.agent.process({
        id: `reply-${email.messageId}`,
        input: `Inbound email from ${email.from}:\n\nSubject: ${email.subject}\n\nContent: ${email.text || email.html || ''}`,
        channel: 'email',
        context: {
          conversationId: conversation.id,
          sessionMetadata: conversation.sessionMetadata
        }
      });

      if (response.content && response.content.trim()) {
        // Send the auto-reply using the email router
        const replyResult = await this.sendEmail({
          to: email.from,
          subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
          text: response.content,
          html: response.content,
          headers: {
            'In-Reply-To': email.messageId,
            'References': email.messageId
          }
        });

        logger.info(`[EmailRouter] Sent auto-reply for email ${email.messageId}: ${replyResult.messageId}`);
        return replyResult;
      }

      return null;
    } catch (error) {
      logger.error(`[EmailRouter] Failed to send auto-reply for email ${email.messageId}:`, error as Error);
      return null;
    }
  }

  private parsePostmarkHeaders(headers: Array<{ Name: string; Value: string }>): Record<string, string> {
    // Parse Postmark's header array format
    const parsed: Record<string, string> = {};
    for (const header of headers) {
      parsed[header.Name.toLowerCase()] = header.Value;
    }
    return parsed;
  }
}
