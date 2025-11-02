/**
 * Voice Resource
 * Complete voice call implementation with spam detection and rate limiting
 * Mirrors the architecture of EmailResource and SMSResource
 */

import { BaseResource, ResourceSession, WebhookContext } from '../base.resource';
import type { Agent } from '../../agent/core/Agent';
import { logger } from '../../utils/logger';
import { randomUUID } from 'crypto';
import {
  CallPayloadParser,
  CallStorage,
  TwiMLGenerator,
  SpamDetector,
  CallRateLimiter,
  CallerMatcher
} from '../../utils/voice';
import type { InboundCallPayload } from '../../types/voice.types';

// Helper function to generate UUID
function generateUUID(): string {
  return randomUUID();
}

export interface VoiceSession extends ResourceSession {
  callSid?: string;
  to: string;
  from?: string;
  direction: 'inbound' | 'outbound';
}

export interface MakeCallOptions {
  to: string;
  greeting?: string;
  metadata?: Record<string, any>;
}

export interface VoiceResourceConfig {
  rateLimitConfig?: {
    maxCalls?: number;
    windowMs?: number;
  };
  spamDetection?: boolean;
  recordCalls?: boolean;
  transcribeCalls?: boolean;
  twimlConfig?: {
    voice?: string;
    language?: string;
    greeting?: string;
  };
}

export class VoiceResource extends BaseResource<VoiceSession> {
  private rateLimiter: CallRateLimiter;
  private spamDetectionEnabled: boolean;
  private recordCalls: boolean;
  private transcribeCalls: boolean;
  private twimlConfig: any;

  constructor(agent: Agent, config?: VoiceResourceConfig) {
    super(agent, 'call');

    // Initialize rate limiter
    this.rateLimiter = new CallRateLimiter(config?.rateLimitConfig);

    this.spamDetectionEnabled = config?.spamDetection !== false; // Default: true
    this.recordCalls = config?.recordCalls || false;
    this.transcribeCalls = config?.transcribeCalls || false;
    this.twimlConfig = config?.twimlConfig || {};

    logger.info('[VoiceResource] Initialized with config', {
      spamDetection: this.spamDetectionEnabled,
      recordCalls: this.recordCalls,
      transcribeCalls: this.transcribeCalls,
      rateLimit: config?.rateLimitConfig
    });
  }

  /**
   * Make an outbound call
   * Uses Agent → initiate_call tool → Twilio provider
   */
  async make(options: MakeCallOptions): Promise<VoiceSession> {
    logger.info(`[VoiceResource] Initiating call to ${options.to}`);

    const conversationId = await this.createSession(options.metadata);

    // Use Agent to make the call via tools
    const agentResponse = await this.processWithAgent(
      `Make a call to ${options.to} with greeting: ${options.greeting || 'Hello!'}`,
      {
        conversationId,
        channel: 'call',
        toolHint: 'initiate_call',
        toolParams: {
          to: options.to,
          greeting: options.greeting,
          webhookUrl: `${process.env.BASE_URL || 'https://your-app.com'}/webhooks/voice/inbound`
        }
      }
    );

    // Extract call SID from tool result
    const callSid = agentResponse.metadata?.toolResults?.[0]?.result?.data?.callSid;

    return {
      id: callSid || `call-${Date.now()}`,
      callSid,
      conversationId,
      to: options.to,
      channel: 'call',
      direction: 'outbound',
      status: 'active',
      startedAt: new Date(),
      metadata: options.metadata
    };
  }

  /**
   * Handle incoming call webhook (Twilio)
   * Implements spam detection and rate limiting
   */
  async handleWebhook(context: WebhookContext): Promise<any> {
    logger.info('[VoiceResource] Handling inbound call webhook', {
      CallSid: context.payload.CallSid,
      From: context.payload.From
    });

    try {
      // Validate payload
      if (!CallPayloadParser.validate(context.payload)) {
        logger.error('[VoiceResource] Invalid webhook payload', context.payload);
        return TwiMLGenerator.generateError();
      }

      // Parse payload
      const call = CallPayloadParser.parse(context.payload);

      // Spam detection
      if (this.spamDetectionEnabled) {
        const spamReport = await SpamDetector.detectSpam(call);
        if (spamReport.shouldBlock) {
          logger.warn('[VoiceResource] Blocking spam call', {
            callSid: call.callSid,
            from: call.from,
            confidence: spamReport.confidence
          });
          return TwiMLGenerator.generateHangup('This call has been blocked.');
        }

        if (spamReport.isSpam) {
          logger.info('[VoiceResource] Spam detected but not blocking', {
            callSid: call.callSid,
            confidence: spamReport.confidence
          });
        }
      }

      // Rate limiting
      const canProceed = await this.rateLimiter.checkLimit(call.from);
      if (!canProceed) {
        const remaining = this.rateLimiter.getRemaining(call.from);
        logger.warn('[VoiceResource] Rate limit exceeded', {
          from: call.from,
          remaining
        });
        return TwiMLGenerator.generateHangup('You have reached the maximum number of calls. Please try again later.');
      }

      // Find or create conversation
      let conversationId = await CallerMatcher.findConversation(
        call,
        this.agent.getMemory()
      );

      const isNewConversation = !conversationId;

      if (!conversationId) {
        conversationId = generateUUID();
        logger.info('[VoiceResource] New conversation created', {
          conversationId,
          from: call.from
        });
      }

      // Ensure we have a conversationId
      const finalConversationId: string = conversationId;

      // Store call start
      await CallStorage.storeCallStart(call, finalConversationId, this.agent.getMemory());

      // Generate TwiML response
      const greeting = this.twimlConfig.greeting || 'Hello, how can I help you today?';

      // If recording is enabled, use media stream for real-time AI
      if (this.recordCalls) {
        const websocketUrl = `wss://${process.env.BASE_URL || 'your-app.com'}/voice/stream`;
        return TwiMLGenerator.generateMediaStream(websocketUrl, {
          greeting,
          voice: this.twimlConfig.voice,
          language: this.twimlConfig.language
        });
      }

      // Otherwise, use gather for speech input
      return TwiMLGenerator.generateGather(
        greeting,
        '/webhook/call/continue',
        {
          voice: this.twimlConfig.voice,
          language: this.twimlConfig.language,
          timeout: 5
        }
      );

    } catch (error) {
      logger.error('[VoiceResource] Webhook handling error', error as Error);
      return TwiMLGenerator.generateError();
    }
  }

  /**
   * Handle call status callback
   */
  async handleStatusCallback(context: WebhookContext): Promise<void> {
    const status = CallPayloadParser.parseStatusCallback(context.payload);

    logger.info('[VoiceResource] Call status update', {
      callSid: status.callSid,
      callStatus: status.callStatus,
      duration: status.duration
    });

    // Find conversation
    const conversationId = await this.findConversationByCallSid(status.callSid!);
    if (!conversationId) return;

    // If call completed, store end data
    if (status.callStatus === 'completed' && status.duration) {
      await CallStorage.storeCallEnd(
        status.callSid!,
        conversationId,
        status.duration,
        'completed',
        this.agent.getMemory()
      );

      // End session
      await this.endSession(conversationId);
    }
  }

  /**
   * Handle call transcription callback
   */
  async handleTranscription(context: WebhookContext): Promise<void> {
    const { CallSid, TranscriptionText, RecordingUrl } = context.payload;

    logger.info('[VoiceResource] Transcription received', {
      callSid: CallSid,
      length: TranscriptionText?.length || 0
    });

    // Find conversation
    const conversationId = await this.findConversationByCallSid(CallSid);
    if (!conversationId) return;

    // Store transcription
    if (TranscriptionText) {
      await CallStorage.storeTranscription(
        CallSid,
        conversationId,
        TranscriptionText,
        this.agent.getMemory()
      );
    }

    // Store recording URL
    if (RecordingUrl) {
      await CallStorage.storeRecording(
        CallSid,
        conversationId,
        RecordingUrl,
        context.payload.RecordingSid,
        this.agent.getMemory()
      );
    }
  }

  /**
   * Continue an active call conversation
   */
  async handleConversation(callSid: string, userSpeech: string): Promise<string> {
    const conversationId = await this.findConversationByCallSid(callSid);
    if (!conversationId) {
      throw new Error(`No conversation found for call ${callSid}`);
    }

    // Agent processes speech and can use tools
    const agentResponse = await this.processWithAgent(userSpeech, {
      conversationId,
      channel: 'call',
      callSid
    });

    return TwiMLGenerator.generateGather(
      agentResponse.content,
      '/webhook/call/continue',
      {
        voice: this.twimlConfig.voice,
        timeout: 5
      }
    );
  }

  /**
   * End an active call
   */
  async end(callSid: string): Promise<void> {
    logger.info(`[VoiceResource] Ending call ${callSid}`);

    const conversationId = await this.findConversationByCallSid(callSid);
    if (conversationId) {
      await this.endSession(conversationId);
    }

    // Use Agent to end the call via tools
    await this.processWithAgent(
      `End call ${callSid}`,
      {
        conversationId,
        channel: 'call',
        toolHint: 'end_call',
        toolParams: { callSid }
      }
    );
  }

  /**
   * Find conversation by call SID
   */
  private async findConversationByCallSid(callSid: string): Promise<string | null> {
    const messages = await this.agent.getMemory().search({
      channel: 'call',
      limit: 100
    });

    for (const msg of messages) {
      const metadata = msg.sessionMetadata;
      if (metadata && metadata.callSid === callSid) {
        return metadata.conversationId ?? null;
      }
    }

    return null;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.rateLimiter.dispose();
  }
}
