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
} from './processors';
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
  webhookBaseUrl?: string; // Base URL for webhook callbacks (e.g., 'https://api.loctelli.com')
  webhookPath?: string; // Path for voice webhook (e.g., '/ai-receptionist/webhooks/voice')
}

export class VoiceResource extends BaseResource<VoiceSession> {
  private rateLimiter: CallRateLimiter;
  private spamDetectionEnabled: boolean;
  private recordCalls: boolean;
  private transcribeCalls: boolean;
  private twimlConfig: any;
  private webhookBaseUrl: string;
  private webhookPath: string;

  constructor(agent: Agent, config?: VoiceResourceConfig) {
    super(agent, 'call');

    // Initialize rate limiter
    this.rateLimiter = new CallRateLimiter(config?.rateLimitConfig);

    this.spamDetectionEnabled = config?.spamDetection !== false; // Default: true
    this.recordCalls = config?.recordCalls || false;
    this.transcribeCalls = config?.transcribeCalls || false;

    // Get webhook URL from TwilioProvider if available
    let twilioProvider: any;
    let twilioConfig: any;
    try {
      const providerRegistry = (agent as any).providerRegistry;
      logger.info('[VoiceResource] Agent provider registry', providerRegistry);
      if (providerRegistry?.has('twilio')) {
        twilioProvider = (providerRegistry as any).get('twilio');
        twilioConfig = twilioProvider?.getConfig();
      } else {
        logger.error('[VoiceResource] Twilio provider not available');
      }
    } catch (error) {
      logger.error('[VoiceResource] Error getting Twilio provider', error as Error);
    }

    // Use TwilioProvider methods if available, otherwise fall back to config/env
    this.twimlConfig = twilioConfig?.voice || config?.twimlConfig || {};

    // Try to get webhook URL from provider, otherwise construct from config
    if (twilioProvider) {
      const fullWebhookUrl = twilioProvider.getVoiceWebhookUrl();
      // Parse back to base + path for backward compat
      const urlMatch = fullWebhookUrl.match(/^(https?:\/\/[^\/]+)(.*)$/);
      if (urlMatch) {
        this.webhookBaseUrl = urlMatch[1];
        this.webhookPath = urlMatch[2];
      } else if (config?.webhookBaseUrl) {
        this.webhookBaseUrl = config.webhookBaseUrl;
        this.webhookPath = config?.webhookPath || '/webhooks/voice';
      } else {
        throw new Error('webhookBaseUrl must be provided in VoiceConfig or TwilioConfig');
      }
    } else {
      if (!config?.webhookBaseUrl) {
        throw new Error('webhookBaseUrl must be provided in VoiceConfig when Twilio provider is not configured');
      }
      this.webhookBaseUrl = config.webhookBaseUrl;
      this.webhookPath = config?.webhookPath || '/webhooks/voice';
    }

    logger.info('[VoiceResource] Initialized with config', {
      spamDetection: this.spamDetectionEnabled,
      recordCalls: this.recordCalls,
      transcribeCalls: this.transcribeCalls,
      rateLimit: config?.rateLimitConfig,
      webhookBaseUrl: this.webhookBaseUrl,
      webhookPath: this.webhookPath,
      usedTwilioConfig: !!twilioConfig
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
          webhookUrl: `${this.webhookBaseUrl}/webhooks/voice/inbound`
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
   * Implements spam detection, rate limiting, and AI-generated greetings
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

      // Determine user input from speech result or empty for initial greeting
      const userInput = call.speechResult || '';
      const isContinue = !!call.speechResult;

      // Generate AI response
      let response: string;

      try {
        // Use AI to process user input or generate initial greeting
        const agentResponse = await this.processWithAgent(
          userInput,
          {
            conversationId: finalConversationId,
            channel: 'call',
            callSid: call.callSid,
            from: call.from,
            isNewConversation: !isContinue && isNewConversation,
            mode: isContinue ? 'conversation' : 'initial-greeting'
          }
        );

        response = agentResponse.content;

        logger.info('[VoiceResource] AI-generated response', {
          conversationId: finalConversationId,
          isNewConversation: !isContinue && isNewConversation,
          isContinue,
          userInput: userInput ? `"${userInput}"` : '(empty - initial greeting)',
          responseLength: response.length,
          responsePreview: response.substring(0, 100) + (response.length > 100 ? '...' : '')
        });
      } catch (error) {
        // Fallback to static response if AI fails
        logger.error('[VoiceResource] Failed to generate AI response, using fallback', error as Error);
        response = this.twimlConfig.greeting || 'Hello, how can I help you today?';
      }

      // If recording is enabled, use media stream for real-time AI
      if (this.recordCalls) {
        const websocketUrl = `wss://${this.webhookBaseUrl.replace(/^https?:\/\//, '')}/voice/stream`;
        return TwiMLGenerator.generateMediaStream(websocketUrl, {
          greeting: response,
          voice: this.twimlConfig.voice,
          language: this.twimlConfig.language
        });
      }

      // Otherwise, use gather for speech input
      // Build full webhook URL for continue callback
      const continueUrl = this.webhookBaseUrl
        ? `${this.webhookBaseUrl}${this.webhookPath}/continue`
        : `${this.webhookPath}/continue`;

      return TwiMLGenerator.generateGather(
        response,
        continueUrl,
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
