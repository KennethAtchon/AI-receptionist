/**
 * Messaging Service
 * High-level messaging operations using Agent
 */

import type { Agent } from '../agent/core/Agent';
import type { SMSSession, AgentRequest } from '../types';
import { logger } from '../utils/logger';

/**
 * MessagingService
 * Delegates to Agent for AI-driven messaging
 */
export class MessagingService {
  constructor(private readonly agent: Agent) {}

  /**
   * Send templated SMS message
   */
  async sendTemplatedSMS(params: {
    to: string;
    templateId: string;
    variables: Record<string, string>;
    track?: boolean;
  }): Promise<{ id: string; content: string }> {
    logger.info('[MessagingService] Sending templated SMS', {
      to: params.to,
      templateId: params.templateId
    });

    // Validate phone number
    if (!this.isValidPhoneNumber(params.to)) {
      throw new Error('Invalid phone number format');
    }

    // Build message context from template
    const variablesStr = Object.entries(params.variables)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    const context = `Use template "${params.templateId}" with variables: ${variablesStr}`;

    // Delegate to Agent
    const agentRequest: AgentRequest = {
      id: `sms-template-${Date.now()}`,
      input: `Send SMS to ${params.to}. ${context}`,
      channel: 'sms',
      context: {
        channel: 'sms',
        conversationId: `sms-conv-${Date.now()}`,
        metadata: { to: params.to, templateId: params.templateId, variables: params.variables }
      }
    };

    const agentResponse = await this.agent.process(agentRequest);

    const messageSid = agentResponse.metadata?.toolResults?.[0]?.data?.messageSid || `SMS_${Date.now()}`;

    logger.info('[MessagingService] SMS sent', { messageId: messageSid });

    return {
      id: messageSid,
      content: agentResponse.content
    };
  }

  /**
   * Send SMS with custom message
   */
  async sendSMS(params: {
    to: string;
    context: string;
    conversationId?: string;
    channel: 'sms' | 'email';
  }): Promise<SMSSession> {
    logger.info('[MessagingService] Sending SMS', { to: params.to });

    // Validate
    if (!this.isValidPhoneNumber(params.to)) {
      throw new Error('Invalid phone number format');
    }

    if (!params.context || params.context.length === 0) {
      throw new Error('Message cannot be empty');
    }

    // Delegate to Agent - it will call send_sms tool
    const agentRequest: AgentRequest = {
      id: `sms-${Date.now()}`,
      input: `Send SMS to ${params.to}: "${params.context}"`,
      channel: params.channel,
      context: {
        channel: params.channel,
        conversationId: params.conversationId || `sms-conv-${Date.now()}`,
        metadata: { to: params.to, action: 'send_sms' }
      }
    };

    const agentResponse = await this.agent.process(agentRequest);

    // Extract messageSid from tool results
    const messageSid = agentResponse.metadata?.toolResults?.[0]?.data?.messageSid || `SMS_${Date.now()}`;

    logger.info('[MessagingService] SMS sent', { messageId: messageSid });

    return {
      id: messageSid,
      conversationId: params.conversationId || 'unknown',
      to: params.to,
      body: params.context,
      status: 'sent',
      sentAt: new Date()
    };
  }

  /**
   * Send email message
   */
  async sendEmail(params: {
    to: string;
    subject: string;
    body: string;
    html?: string;
  }): Promise<{ id: string }> {
    logger.info('[MessagingService] Sending email', { to: params.to });

    // Validate email
    if (!this.isValidEmail(params.to)) {
      throw new Error('Invalid email address format');
    }

    // Delegate to Agent - it will call send_email tool
    const agentRequest: AgentRequest = {
      id: `email-${Date.now()}`,
      input: `Send email to ${params.to} with subject "${params.subject}" and body: "${params.body}"`,
      channel: 'email',
      context: {
        channel: 'email',
        conversationId: `email-conv-${Date.now()}`,
        metadata: { to: params.to, subject: params.subject, action: 'send_email' }
      }
    };

    const agentResponse = await this.agent.process(agentRequest);

    const emailId = agentResponse.metadata?.toolResults?.[0]?.data?.emailId || `EMAIL_${Date.now()}`;

    logger.info('[MessagingService] Email sent', { messageId: emailId });

    return { id: emailId };
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phone: string): boolean {
    // Basic E.164 format validation
    return /^\+[1-9]\d{1,14}$/.test(phone);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
