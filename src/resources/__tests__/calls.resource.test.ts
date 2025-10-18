/**
 * Unit Tests - CallsResource
 */

import { CallsResource } from '../calls.resource';
import { CallService } from '../../services/call.service';
import { MakeCallOptions, CallSession } from '../../types';

// Create mock CallService
const createMockCallService = (): jest.Mocked<CallService> => {
  return {
    initiateCall: jest.fn(),
    handleUserSpeech: jest.fn(),
    endCall: jest.fn(),
  } as any;
};

describe('CallsResource', () => {
  let callService: jest.Mocked<CallService>;
  let resource: CallsResource;

  beforeEach(() => {
    callService = createMockCallService();
    resource = new CallsResource(callService);
  });

  describe('make', () => {
    const mockCallSession: CallSession = {
      id: 'CA123456789',
      conversationId: 'conv_123',
      to: '+1234567890',
      status: 'initiated',
      startedAt: new Date(),
    };

    it('should_initiate_call_successfully', async () => {
      callService.initiateCall.mockResolvedValue(mockCallSession);

      const options: MakeCallOptions = {
        to: '+1234567890',
      };

      const result = await resource.make(options);

      expect(result).toEqual(mockCallSession);
      expect(callService.initiateCall).toHaveBeenCalledWith(options);
      expect(callService.initiateCall).toHaveBeenCalledTimes(1);
    });

    it('should_initiate_call_with_metadata', async () => {
      callService.initiateCall.mockResolvedValue(mockCallSession);

      const options: MakeCallOptions = {
        to: '+1234567890',
        metadata: {
          leadId: 'lead_123',
          source: 'website',
        },
      };

      const result = await resource.make(options);

      expect(result).toEqual(mockCallSession);
      expect(callService.initiateCall).toHaveBeenCalledWith(options);
    });

    it('should_return_call_session_with_id', async () => {
      callService.initiateCall.mockResolvedValue(mockCallSession);

      const result = await resource.make({ to: '+1234567890' });

      expect(result.id).toBe('CA123456789');
      expect(result.conversationId).toBe('conv_123');
    });

    it('should_propagate_errors_from_call_service', async () => {
      const error = new Error('Twilio error');
      callService.initiateCall.mockRejectedValue(error);

      await expect(
        resource.make({ to: '+1234567890' })
      ).rejects.toThrow('Twilio error');
    });

    it('should_handle_different_phone_number_formats', async () => {
      callService.initiateCall.mockResolvedValue(mockCallSession);

      const phoneNumbers = [
        '+1234567890',
        '+44 20 1234 5678',
        '+81-3-1234-5678',
      ];

      for (const phoneNumber of phoneNumbers) {
        await resource.make({ to: phoneNumber });
      }

      expect(callService.initiateCall).toHaveBeenCalledTimes(phoneNumbers.length);
    });
  });

  describe('get', () => {
    it('should_throw_not_implemented_error', async () => {
      await expect(
        resource.get('CA123456789')
      ).rejects.toThrow('Not implemented yet');
    });
  });

  describe('list', () => {
    it('should_throw_not_implemented_error', async () => {
      await expect(
        resource.list()
      ).rejects.toThrow('Not implemented yet');
    });

    it('should_throw_not_implemented_error_with_options', async () => {
      await expect(
        resource.list({ limit: 10 })
      ).rejects.toThrow('Not implemented yet');
    });
  });

  describe('end', () => {
    it('should_end_call_successfully', async () => {
      callService.endCall.mockResolvedValue(undefined);

      await resource.end('CA123456789');

      expect(callService.endCall).toHaveBeenCalledWith('CA123456789');
      expect(callService.endCall).toHaveBeenCalledTimes(1);
    });

    it('should_propagate_errors_from_call_service', async () => {
      const error = new Error('Call not found');
      callService.endCall.mockRejectedValue(error);

      await expect(
        resource.end('CA_INVALID')
      ).rejects.toThrow('Call not found');
    });
  });

  describe('integration scenarios', () => {
    it('should_handle_make_and_end_call_sequence', async () => {
      const mockCallSession: CallSession = {
        id: 'CA123456789',
        conversationId: 'conv_123',
        to: '+1234567890',
        status: 'initiated',
        startedAt: new Date(),
      };

      callService.initiateCall.mockResolvedValue(mockCallSession);
      callService.endCall.mockResolvedValue(undefined);

      // Make call
      const call = await resource.make({ to: '+1234567890' });
      expect(call.id).toBe('CA123456789');

      // End call
      await resource.end(call.id);
      expect(callService.endCall).toHaveBeenCalledWith('CA123456789');
    });
  });
});
