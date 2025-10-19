/**
 * Tests for CallService
 */

import { CallService } from '../call.service';
import { TwilioProvider } from '../../providers/communication/twilio.provider';
import { ConversationService } from '../conversation.service';
import { ToolExecutionService } from '../tool-execution.service';
import type { IAIProvider, MakeCallOptions } from '../../types';

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('CallService', () => {
  let callService: CallService;
  let mockTwilioProvider: jest.Mocked<TwilioProvider>;
  let mockAIProvider: jest.Mocked<IAIProvider>;
  let mockConversationService: jest.Mocked<ConversationService>;
  let mockToolExecutor: jest.Mocked<ToolExecutionService>;

  beforeEach(() => {
    // Create mocks
    mockTwilioProvider = {
      makeCall: jest.fn(),
      sendSMS: jest.fn()
    } as any;

    mockAIProvider = {
      chat: jest.fn()
    } as any;

    mockConversationService = {
      create: jest.fn(),
      get: jest.fn(),
      getByCallId: jest.fn(),
      addMessage: jest.fn(),
      complete: jest.fn()
    } as any;

    mockToolExecutor = {
      getToolsForChannel: jest.fn(),
      execute: jest.fn()
    } as any;

    callService = new CallService(
      mockTwilioProvider,
      mockAIProvider,
      mockConversationService,
      mockToolExecutor,
      'agent-123',
      'http://localhost:3000'
    );
  });

  describe('initiateCall', () => {
    it('should initiate an outbound call successfully', async () => {
      const mockConversation = {
        id: 'conv-123',
        channel: 'call' as const,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockTools = [
        {
          name: 'check_calendar',
          description: 'Check calendar availability',
          parameters: {}
        }
      ];

      mockConversationService.create.mockResolvedValue(mockConversation);
      mockToolExecutor.getToolsForChannel.mockReturnValue(mockTools as any);
      mockTwilioProvider.makeCall.mockResolvedValue('CALL_SID_123');
      mockConversationService.get.mockResolvedValue(mockConversation);

      const options: MakeCallOptions = {
        to: '+1234567890',
        metadata: { campaign: 'test' }
      };

      const result = await callService.initiateCall(options);

      expect(mockConversationService.create).toHaveBeenCalledWith({
        channel: 'call',
        metadata: { campaign: 'test' }
      });

      expect(mockToolExecutor.getToolsForChannel).toHaveBeenCalledWith('call');

      expect(mockTwilioProvider.makeCall).toHaveBeenCalledWith(
        '+1234567890',
        expect.objectContaining({
          webhookUrl: 'http://localhost:3000/webhooks/calls/conv-123',
          statusCallback: 'http://localhost:3000/webhooks/call-status/conv-123',
          aiConfig: expect.objectContaining({
            tools: expect.arrayContaining([
              expect.objectContaining({ name: 'check_calendar' })
            ])
          })
        })
      );

      expect(result).toEqual({
        id: 'CALL_SID_123',
        conversationId: 'conv-123',
        to: '+1234567890',
        status: 'initiated',
        startedAt: expect.any(Date)
      });
    });
  });

  describe('handleUserSpeech', () => {
    it('should process user speech and return AI response', async () => {
      const mockConversation = {
        id: 'conv-123',
        channel: 'call' as const,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockAIResponse = {
        content: 'I can help you with that.',
        toolCalls: undefined
      };

      mockConversationService.getByCallId.mockResolvedValue(mockConversation);
      mockConversationService.addMessage.mockResolvedValue(undefined);
      mockAIProvider.chat.mockResolvedValue(mockAIResponse);
      mockToolExecutor.getToolsForChannel.mockReturnValue([]);

      const response = await callService.handleUserSpeech('CALL_SID_123', 'I need to schedule an appointment');

      expect(mockConversationService.getByCallId).toHaveBeenCalledWith('CALL_SID_123');
      expect(mockConversationService.addMessage).toHaveBeenCalledWith('conv-123', {
        role: 'user',
        content: 'I need to schedule an appointment'
      });
      expect(mockAIProvider.chat).toHaveBeenCalled();
      expect(response).toBe('I can help you with that.');
    });

    it('should throw error when conversation not found', async () => {
      mockConversationService.getByCallId.mockResolvedValue(null);

      await expect(
        callService.handleUserSpeech('CALL_SID_123', 'test speech')
      ).rejects.toThrow('Conversation not found for call CALL_SID_123');
    });
  });

  describe('endCall', () => {
    it('should end call and complete conversation', async () => {
      const mockConversation = {
        id: 'conv-123',
        channel: 'call' as const,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockConversationService.getByCallId.mockResolvedValue(mockConversation);
      mockConversationService.complete.mockResolvedValue(undefined);

      await callService.endCall('CALL_SID_123');

      expect(mockConversationService.getByCallId).toHaveBeenCalledWith('CALL_SID_123');
      expect(mockConversationService.complete).toHaveBeenCalledWith('conv-123');
    });

    it('should handle case when conversation is not found', async () => {
      mockConversationService.getByCallId.mockResolvedValue(null);

      // Should not throw
      await expect(callService.endCall('CALL_SID_123')).resolves.toBeUndefined();
      expect(mockConversationService.complete).not.toHaveBeenCalled();
    });
  });
});
