/**
 * Email Resource
 * User-facing API for email operations
 */

import type {
  SendEmailOptions,
  EmailSession,
  ConversationMessage,
  GenerateEmailOptions,
  DraftEmailOptions,
  EmailDraft
} from '../types';
import type { Agent } from '../agent/core/Agent';
import type { EmailProcessor } from '../processors/email.processor';
import { logger } from '../utils/logger';

export class EmailResource {
  constructor(
    private agent: Agent,
    private emailProcessor?: EmailProcessor
  ) {}

  /**
   * Send an email
   *
   * @example
   * ```typescript
   * const email = await client.email.send({
   *   to: 'user@example.com',
   *   subject: 'Welcome!',
   *   body: 'Thanks for reaching out...',
   *   html: '<h1>Welcome!</h1><p>Thanks for reaching out...</p>'
   * });
   * logger.info('Email sent:', email.id);
   * ```
   */
  async send(options: SendEmailOptions & { conversationId?: string; threadId?: string; inReplyTo?: string }): Promise<EmailSession> {
    logger.info(`[EmailResource] Sending email to ${options.to}`);

    if (!this.emailProcessor) {
      throw new Error('Email processor not configured. Please configure an email provider.');
    }

    // Use existing conversation or create new one
    const conversationId = options.conversationId || `email-conv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const threadId = options.threadId || conversationId;

    // Start session if this is a new conversation
    if (!options.conversationId) {
      await this.agent.getMemory().startSession({
        conversationId,
        channel: 'email',
        metadata: {
          to: options.to,
          subject: options.subject,
          threadId,
          ...options.metadata
        }
      });
    }

    try {
      // Send email via processor
      const result = await this.emailProcessor.sendEmail({
        to: options.to,
        subject: options.subject,
        body: options.body,
        html: options.html,
        attachments: options.attachments,
        tags: options.tags,
        provider: options.provider
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      const emailSession: EmailSession = {
        id: result.messageId || `EMAIL_${Date.now()}`,
        conversationId,
        to: options.to,
        subject: options.subject,
        status: 'sent',
        sentAt: new Date(),
        threadId,
        inReplyTo: options.inReplyTo,
        direction: 'outbound',
        aiGenerated: !!(options.metadata as any)?.aiGenerated
      };

      const conversationMessage: ConversationMessage = {
        role: 'assistant',
        content: options.body,
        timestamp: new Date()
      };

      // Store message in conversation using Agent memory with enhanced metadata
      await this.agent.getMemory().store({
        id: `msg-${conversationId}-${Date.now()}`,
        content: options.body,
        timestamp: new Date(),
        type: 'conversation',
        channel: 'email',
        role: 'assistant',
        sessionMetadata: {
          conversationId,
          emailId: emailSession.id,
          threadId,
          inReplyTo: options.inReplyTo,
          direction: 'outbound',
          to: options.to,
          subject: options.subject,
          status: 'completed'
        }
      });

      logger.info('[EmailResource] Email sent successfully', {
        id: emailSession.id,
        conversationId
      });

      return emailSession;
    } catch (error) {
      logger.error('[EmailResource] Failed to send email:', error as Error);

      // Update conversation status using Agent memory
      await this.agent.getMemory().store({
        id: `session-failed-${conversationId}`,
        content: 'Conversation failed',
        timestamp: new Date(),
        type: 'system',
        sessionMetadata: { conversationId, status: 'failed' },
        importance: 7
      });

      throw error;
    }
  }

  /**
   * Get email details by ID
   * Retrieves email from conversation history
   */
  async get(emailId: string): Promise<EmailSession> {
    logger.info(`[EmailResource] Getting email ${emailId}`);

    try {
      // Search for email in conversation history
      const memories = await this.agent.getMemory().search({
        channel: 'email',
        type: 'conversation',
        limit: 1
      });

      if (memories.length === 0) {
        throw new Error(`Email with ID ${emailId} not found`);
      }

      const memory = memories[0];
      const sessionMetadata = memory.sessionMetadata;

      if (!sessionMetadata?.conversationId) {
        throw new Error(`Email ${emailId} has no associated conversation`);
      }

      // Get full conversation history to reconstruct email session
      const conversationHistory = await this.agent.getMemory().getConversationHistory(
        sessionMetadata.conversationId
      );

      // Find the email message in conversation
      const emailMessage = conversationHistory.find(m => 
        m.sessionMetadata?.emailId === emailId || 
        m.content.includes(emailId)
      );

      if (!emailMessage) {
        throw new Error(`Email message not found in conversation ${sessionMetadata.conversationId}`);
      }

      // Reconstruct email session from stored data
      const emailSession: EmailSession = {
        id: emailId,
        conversationId: sessionMetadata.conversationId || 'unknown',
        to: (sessionMetadata as any).to || 'unknown@example.com',
        subject: (sessionMetadata as any).subject || 'No Subject',
        status: 'sent',
        sentAt: emailMessage.timestamp
      };

      logger.info('[EmailResource] Email retrieved successfully', {
        id: emailId,
        conversationId: sessionMetadata.conversationId
      });

      return emailSession;
    } catch (error) {
      logger.error('[EmailResource] Failed to get email:', error as Error);
      throw error;
    }
  }

  /**
   * List recent emails
   * Retrieves emails from conversation history with optional filtering
   */
  async list(options?: { limit?: number; conversationId?: string }): Promise<EmailSession[]> {
    logger.info('[EmailResource] Listing emails', options);

    try {
      const limit = options?.limit || 50;
      const conversationId = options?.conversationId;

      let memories: any[];

      if (conversationId) {
        // Get emails from specific conversation
        memories = await this.agent.getMemory().getConversationHistory(conversationId);
      } else {
        // Get all email channel memories
        memories = await this.agent.getMemory().getChannelHistory('email', { limit });
      }

      // Filter for email-related memories and convert to EmailSession
      const emailSessions: EmailSession[] = [];

      for (const memory of memories) {
        // Look for email-related metadata
        if (memory.channel === 'email' && memory.sessionMetadata) {
          const metadata = memory.sessionMetadata as any;
          
          // Skip if this is not an email send operation
          if (!metadata.to && !metadata.subject) {
            continue;
          }

          const emailSession: EmailSession = {
            id: metadata.emailId || `EMAIL_${memory.timestamp.getTime()}`,
            conversationId: metadata.conversationId || 'unknown',
            to: metadata.to || 'unknown@example.com',
            subject: metadata.subject || 'No Subject',
            status: 'sent',
            sentAt: memory.timestamp
          };

          emailSessions.push(emailSession);
        }
      }

      // Sort by sentAt (most recent first) and apply limit
      const sortedEmails = emailSessions
        .sort((a, b) => (b.sentAt?.getTime() || 0) - (a.sentAt?.getTime() || 0))
        .slice(0, limit);

      logger.info('[EmailResource] Listed emails successfully', {
        count: sortedEmails.length,
        conversationId: conversationId || 'all'
      });

      return sortedEmails;
    } catch (error) {
      logger.error('[EmailResource] Failed to list emails:', error as Error);
      throw error;
    }
  }

  /**
   * Generate and send an email using AI
   *
   * AI will compose the email based on your prompt and conversation history.
   * The AI can extract recipient, generate subject, and compose the body.
   *
   * @example
   * ```typescript
   * // AI extracts everything from prompt and conversation
   * const email = await client.email.generate({
   *   prompt: 'Send john@example.com a friendly reminder about our 2pm meeting',
   *   conversationId: 'customer-123'
   * });
   *
   * // With explicit parameters
   * const email = await client.email.generate({
   *   prompt: 'Follow up about their pricing question',
   *   conversationId: 'customer-123',
   *   to: 'customer@example.com',
   *   tone: 'professional'
   * });
   * ```
   */
  async generate(options: GenerateEmailOptions): Promise<EmailSession> {
    logger.info('[EmailResource] Generating AI-powered email', {
      prompt: options.prompt.substring(0, 50),
      conversationId: options.conversationId,
      autoSend: options.autoSend !== false
    });

    if (!this.emailProcessor) {
      throw new Error('Email processor not configured. Please configure an email provider.');
    }

    try {
      // First, use AI to draft the email
      const draft = await this.draft({
        prompt: options.prompt,
        conversationId: options.conversationId,
        to: options.to,
        subject: options.subject,
        tone: options.tone,
        maxLength: options.maxLength,
        includeHistory: true
      });

      // If autoSend is false, throw error (user should use draft() instead)
      if (options.autoSend === false) {
        throw new Error('autoSend is false. Use draft() method instead of generate().');
      }

      // Send the email
      logger.info('[EmailResource] Sending AI-generated email', {
        to: draft.to,
        subject: draft.subject
      });

      return await this.send({
        to: draft.to,
        subject: draft.subject,
        body: draft.body,
        html: draft.html,
        metadata: {
          ...options.metadata,
          ...draft.metadata,
          aiGenerated: true,
          prompt: options.prompt
        }
      });

    } catch (error) {
      logger.error('[EmailResource] Failed to generate email:', error as Error);
      throw error;
    }
  }

  /**
   * Draft an email using AI (does not send)
   *
   * AI composes an email based on your prompt and conversation history.
   * Returns a draft that you can review, edit, and send manually.
   *
   * @example
   * ```typescript
   * // Get AI to draft an email
   * const draft = await client.email.draft({
   *   prompt: 'Write a professional follow-up about their pricing question',
   *   conversationId: 'customer-123',
   *   tone: 'professional'
   * });
   *
   * // Review and edit
   * console.log(draft.subject);
   * console.log(draft.body);
   * draft.body += '\n\nBest regards,\nSarah';
   *
   * // Send manually
   * await client.email.send(draft);
   * ```
   */
  async draft(options: DraftEmailOptions): Promise<EmailDraft> {
    logger.info('[EmailResource] Drafting email with AI', {
      prompt: options.prompt.substring(0, 50),
      conversationId: options.conversationId
    });

    try {
      // Get or create conversation
      let conversationId = options.conversationId;
      if (!conversationId) {
        conversationId = `email-draft-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }

      // Build enhanced prompt for email drafting
      const enhancedPrompt = this.buildDraftPrompt(options);

      // Use Agent to generate the email
      const agentResponse = await this.agent.process({
        id: `email-draft-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        input: enhancedPrompt,
        channel: 'email',
        context: {
          conversationId,
          channel: 'email',
          metadata: {
            source: 'email-draft',
            tone: options.tone,
            maxLength: options.maxLength
          }
        }
      });

      // Parse AI response to extract email components
      const emailData = this.parseEmailFromAIResponse(agentResponse.content, options);

      const draft: EmailDraft = {
        to: emailData.to || options.to || '',
        subject: emailData.subject || options.subject || 'No Subject',
        body: emailData.body,
        html: emailData.html,
        metadata: {
          generatedBy: 'ai',
          conversationId,
          confidence: agentResponse.metadata?.confidence,
          reasoning: emailData.reasoning
        }
      };

      logger.info('[EmailResource] Email draft generated successfully', {
        to: draft.to,
        subject: draft.subject,
        conversationId
      });

      return draft;

    } catch (error) {
      logger.error('[EmailResource] Failed to draft email:', error as Error);
      throw error;
    }
  }

  /**
   * Build enhanced prompt for email drafting
   */
  private buildDraftPrompt(options: DraftEmailOptions): string {
    const parts: string[] = [];

    // Base instruction
    parts.push('You are composing an email. Based on the conversation history and the following request:');
    parts.push(`\n${options.prompt}\n`);

    // Add constraints
    if (options.to) {
      parts.push(`Recipient: ${options.to}`);
    }

    if (options.subject) {
      parts.push(`Subject: ${options.subject}`);
    }

    if (options.tone) {
      const toneInstructions = {
        professional: 'Use a professional, business-appropriate tone.',
        friendly: 'Use a warm, friendly tone while remaining professional.',
        casual: 'Use a casual, conversational tone.',
        formal: 'Use a formal, respectful tone.'
      };
      parts.push(toneInstructions[options.tone]);
    }

    if (options.maxLength) {
      const lengthInstructions = {
        short: 'Keep the email brief (2-3 sentences).',
        medium: 'Write a moderate-length email (1-2 paragraphs).',
        long: 'Write a comprehensive, detailed email (3-4 paragraphs).'
      };
      parts.push(lengthInstructions[options.maxLength]);
    }

    // Response format instruction
    parts.push('\nProvide your response in the following JSON format:');
    parts.push('```json');
    parts.push('{');
    parts.push('  "to": "recipient@example.com",');
    parts.push('  "subject": "Email subject line",');
    parts.push('  "body": "Email body content (plain text)",');
    parts.push('  "html": "<p>Email body content (HTML format)</p>",');
    parts.push('  "reasoning": "Brief explanation of your email composition choices"');
    parts.push('}');
    parts.push('```');

    return parts.join('\n');
  }

  /**
   * Parse email components from AI response
   */
  private parseEmailFromAIResponse(
    aiResponse: string,
    options: DraftEmailOptions
  ): {
    to?: string;
    subject?: string;
    body: string;
    html?: string;
    reasoning?: string;
  } {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          to: parsed.to || options.to,
          subject: parsed.subject || options.subject,
          body: parsed.body || aiResponse,
          html: parsed.html,
          reasoning: parsed.reasoning
        };
      }

      // Fallback: treat entire response as email body
      logger.warn('[EmailResource] Could not parse structured email from AI response, using raw response');
      return {
        to: options.to,
        subject: options.subject,
        body: aiResponse,
        html: this.convertToBasicHTML(aiResponse)
      };

    } catch (error) {
      logger.error('[EmailResource] Error parsing AI email response:', error as Error);
      return {
        to: options.to,
        subject: options.subject,
        body: aiResponse,
        html: this.convertToBasicHTML(aiResponse)
      };
    }
  }

  /**
   * Convert plain text to basic HTML
   */
  private convertToBasicHTML(text: string): string {
    return text
      .split('\n\n')
      .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  /**
   * Reply to an email
   *
   * Supports both manual and AI-powered replies:
   * - Manual: Provide body/html directly
   * - AI-powered: Provide a prompt, AI reads thread and composes reply
   *
   * @example
   * ```typescript
   * // Manual reply
   * await client.email.reply(emailId, {
   *   body: 'Thanks for reaching out...'
   * });
   *
   * // AI-powered reply
   * await client.email.reply(emailId, {
   *   prompt: 'Thank them and schedule a follow-up call next week',
   *   tone: 'professional'
   * });
   * ```
   */
  async reply(
    emailId: string,
    options: { body?: string; html?: string; prompt?: string; tone?: 'professional' | 'friendly' | 'casual' | 'formal' }
  ): Promise<EmailSession> {
    logger.info(`[EmailResource] Replying to email ${emailId}`);

    if (!this.emailProcessor) {
      throw new Error('Email processor not configured. Please configure an email provider.');
    }

    try {
      // Get the original email to extract conversation context
      const originalEmail = await this.get(emailId);
      const threadId = originalEmail.threadId || originalEmail.conversationId;

      // Create reply subject (add "Re: " if not already present)
      const replySubject = originalEmail.subject.startsWith('Re: ')
        ? originalEmail.subject
        : `Re: ${originalEmail.subject}`;

      let emailBody: string;
      let emailHtml: string | undefined;

      // If prompt is provided, use AI to generate reply
      if (options.prompt) {
        logger.info('[EmailResource] Using AI to generate reply');

        // Get full email thread history for context
        const threadHistory = await this.agent.getMemory().search({
          conversationId: originalEmail.conversationId,
          channel: 'email',
          orderBy: 'timestamp',
          orderDirection: 'asc'
        });

        // Build context-aware prompt
        const contextPrompt = this.buildReplyPrompt(
          options.prompt,
          originalEmail,
          threadHistory,
          options.tone
        );

        // Use AI to draft the reply
        const draft = await this.draft({
          prompt: contextPrompt,
          conversationId: originalEmail.conversationId,
          to: originalEmail.to,
          subject: replySubject,
          tone: options.tone,
          includeHistory: true
        });

        emailBody = draft.body;
        emailHtml = draft.html;
      } else if (options.body) {
        // Manual reply
        emailBody = options.body;
        emailHtml = options.html;
      } else {
        throw new Error('Either "body" or "prompt" must be provided');
      }

      // Send the reply using the same conversation ID to maintain thread
      return await this.send({
        to: originalEmail.to,
        subject: replySubject,
        body: emailBody,
        html: emailHtml,
        conversationId: originalEmail.conversationId, // Same conversation = thread continuity
        threadId,
        inReplyTo: emailId,
        tags: ['reply'],
        metadata: {
          isReply: true,
          originalEmailId: emailId,
          aiGenerated: !!options.prompt
        }
      });

    } catch (error) {
      logger.error('[EmailResource] Failed to send email reply:', error as Error);
      throw error;
    }
  }

  /**
   * Build context-aware prompt for email replies
   */
  private buildReplyPrompt(
    userPrompt: string,
    originalEmail: EmailSession,
    threadHistory: any[],
    tone?: string
  ): string {
    const parts: string[] = [];

    parts.push('You are replying to an email. Here is the email thread history:\n');

    // Add thread history for context
    if (threadHistory.length > 0) {
      parts.push('--- EMAIL THREAD ---');
      threadHistory.forEach((memory, index) => {
        const direction = memory.sessionMetadata?.direction || 'unknown';
        const timestamp = memory.timestamp.toLocaleString();
        parts.push(`[${index + 1}] ${direction.toUpperCase()} - ${timestamp}`);
        parts.push(`Subject: ${memory.sessionMetadata?.subject || 'N/A'}`);
        parts.push(`Content: ${memory.content}`);
        parts.push('');
      });
      parts.push('--- END THREAD ---\n');
    }

    parts.push(`Latest email to reply to:`);
    parts.push(`To: ${originalEmail.to}`);
    parts.push(`Subject: ${originalEmail.subject}`);
    parts.push('');

    parts.push(`Your task: ${userPrompt}`);

    if (tone) {
      parts.push(`\nTone: ${tone}`);
    }

    parts.push('\nCompose a contextual reply that addresses the email thread.');

    return parts.join('\n');
  }
}
