/**
 * Unit Tests - SMSResource
 */

import { SMSResource } from '../sms.resource';
import { TwilioProvider } from '../../providers/communication/twilio.provider';
import { SendSMSOptions, SMSSession } from '../../types';

// Create mock TwilioProvider
const createMockTwilioProvider = (): jest.Mocked<TwilioProvider> => {
  return {
    sendSMS: jest.fn(),
    makeCall: jest.fn(),
    initialize: jest.fn(),
    dispose: jest.fn(),
    healthCheck: jest.fn(),
  } as any;
};

describe('SMSResource', () => {
  let twilioProvider: jest.Mocked<TwilioProvider>;
  let resource: SMSResource;

  beforeEach(() => {
    twilioProvider = createMockTwilioProvider();
    resource = new SMSResource(twilioProvider);
  });

  describe('send', () => {
    it('should_send_sms_successfully', async () => {
      const messageSid = 'SM123456789';
      twilioProvider.sendSMS.mockResolvedValue(messageSid);

      const options: SendSMSOptions = {
        to: '+1234567890',
        body: 'Hello from AI!',
      };

      const result = await resource.send(options);

      expect(result.id).toBe(messageSid);
      expect(result.to).toBe(options.to);
      expect(result.body).toBe(options.body);
      expect(result.status).toBe('sent');
      expect(result.sentAt).toBeInstanceOf(Date);
      expect(twilioProvider.sendSMS).toHaveBeenCalledWith(options.to, options.body);
    });

    it('should_send_sms_with_metadata', async () => {
      twilioProvider.sendSMS.mockResolvedValue('SM123456789');

      const options: SendSMSOptions = {
        to: '+1234567890',
        body: 'Test message',
        metadata: {
          campaignId: 'campaign_123',
          userId: 'user_456',
        },
      };

      const result = await resource.send(options);

      expect(result).toBeDefined();
      expect(twilioProvider.sendSMS).toHaveBeenCalled();
    });

    it('should_return_sms_session_with_timestamp', async () => {
      twilioProvider.sendSMS.mockResolvedValue('SM123456789');

      const beforeTime = Date.now();
      const result = await resource.send({
        to: '+1234567890',
        body: 'Test',
      });
      const afterTime = Date.now();

      expect(result.sentAt).toBeInstanceOf(Date);
      const sentTime = result.sentAt.getTime();
      expect(sentTime).toBeGreaterThanOrEqual(beforeTime);
      expect(sentTime).toBeLessThanOrEqual(afterTime);
    });

    it('should_propagate_errors_from_twilio_provider', async () => {
      const error = new Error('Twilio SMS error');
      twilioProvider.sendSMS.mockRejectedValue(error);

      await expect(
        resource.send({
          to: '+1234567890',
          body: 'Test',
        })
      ).rejects.toThrow('Twilio SMS error');
    });

    it('should_handle_different_message_lengths', async () => {
      twilioProvider.sendSMS.mockResolvedValue('SM123456789');

      const messages = [
        'Short',
        'This is a medium length message for testing',
        'This is a very long message that might span multiple SMS segments depending on the carrier and encoding. It contains more than 160 characters to test how the SDK handles longer messages.',
      ];

      for (const body of messages) {
        const result = await resource.send({
          to: '+1234567890',
          body,
        });

        expect(result.body).toBe(body);
      }

      expect(twilioProvider.sendSMS).toHaveBeenCalledTimes(messages.length);
    });

    it('should_handle_special_characters_in_message', async () => {
      twilioProvider.sendSMS.mockResolvedValue('SM123456789');

      const messagesWithSpecialChars = [
        'Hello 👋 from AI!',
        'Price: $99.99',
        'Meeting @ 2pm',
        'Click here: https://example.com/path?param=value&other=123',
      ];

      for (const body of messagesWithSpecialChars) {
        const result = await resource.send({
          to: '+1234567890',
          body,
        });

        expect(result.body).toBe(body);
      }
    });

    it('should_handle_international_phone_numbers', async () => {
      twilioProvider.sendSMS.mockResolvedValue('SM123456789');

      const internationalNumbers = [
        '+44 20 1234 5678', // UK
        '+81 3 1234 5678',  // Japan
        '+33 1 23 45 67 89', // France
        '+49 30 12345678',  // Germany
      ];

      for (const phoneNumber of internationalNumbers) {
        await resource.send({
          to: phoneNumber,
          body: 'Test message',
        });
      }

      expect(twilioProvider.sendSMS).toHaveBeenCalledTimes(internationalNumbers.length);
    });
  });

  describe('get', () => {
    it('should_throw_not_implemented_error', async () => {
      await expect(
        resource.get('SM123456789')
      ).rejects.toThrow('Not implemented yet');
    });
  });

  describe('list', () => {
    it('should_throw_not_implemented_error', async () => {
      await expect(
        resource.list()
      ).rejects.toThrow('Not implemented yet');
    });

    it('should_throw_not_implemented_error_with_limit', async () => {
      await expect(
        resource.list({ limit: 10 })
      ).rejects.toThrow('Not implemented yet');
    });
  });

  describe('edge cases', () => {
    it('should_handle_empty_message_body', async () => {
      twilioProvider.sendSMS.mockResolvedValue('SM123456789');

      const result = await resource.send({
        to: '+1234567890',
        body: '',
      });

      expect(result.body).toBe('');
      expect(twilioProvider.sendSMS).toHaveBeenCalledWith('+1234567890', '');
    });

    it('should_return_empty_conversation_id', async () => {
      twilioProvider.sendSMS.mockResolvedValue('SM123456789');

      const result = await resource.send({
        to: '+1234567890',
        body: 'Test',
      });

      // TODO: This should be updated when conversation creation is implemented
      expect(result.conversationId).toBe('');
    });
  });
});
