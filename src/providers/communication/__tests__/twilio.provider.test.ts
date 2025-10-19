/**
 * Tests for TwilioProvider
 */

import { TwilioProvider } from '../twilio.provider';
import type { TwilioConfig, CallOptions, SMSOptions } from '../../../types';

// Mock the logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('TwilioProvider', () => {
  let provider: TwilioProvider;
  let config: TwilioConfig;

  beforeEach(() => {
    config = {
      accountSid: 'AC_test_account_sid',
      authToken: 'test_auth_token',
      phoneNumber: '+1234567890'
    };

    provider = new TwilioProvider(config);
  });

  describe('constructor', () => {
    it('should create provider with configuration', () => {
      expect(provider).toBeInstanceOf(TwilioProvider);
      expect(provider.name).toBe('twilio');
      expect(provider.type).toBe('communication');
    });
  });

  describe('initialize', () => {
    it('should initialize the provider', async () => {
      await provider.initialize();

      expect(provider['initialized']).toBe(true);
    });
  });

  describe('makeCall', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should make a call and return call SID', async () => {
      const options: CallOptions = {
        webhookUrl: 'https://example.com/webhook',
        statusCallback: 'https://example.com/status',
        aiConfig: {
          tools: []
        }
      };

      const callSid = await provider.makeCall('+1987654321', options);

      expect(callSid).toBeDefined();
      expect(typeof callSid).toBe('string');
      expect(callSid).toMatch(/^CALL_\d+$/);
    });

    it('should throw error when not initialized', async () => {
      const uninitializedProvider = new TwilioProvider(config);

      const options: CallOptions = {
        webhookUrl: 'https://example.com/webhook'
      };

      await expect(
        uninitializedProvider.makeCall('+1987654321', options)
      ).rejects.toThrow();
    });
  });

  describe('sendSMS', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should send SMS and return message SID', async () => {
      const messageSid = await provider.sendSMS('+1987654321', 'Hello from test!');

      expect(messageSid).toBeDefined();
      expect(typeof messageSid).toBe('string');
      expect(messageSid).toMatch(/^SMS_\d+$/);
    });

    it('should send SMS with options', async () => {
      const options: SMSOptions = {
        statusCallback: 'https://example.com/sms-status'
      };

      const messageSid = await provider.sendSMS('+1987654321', 'Test message', options);

      expect(messageSid).toBeDefined();
      expect(typeof messageSid).toBe('string');
    });

    it('should throw error when not initialized', async () => {
      const uninitializedProvider = new TwilioProvider(config);

      await expect(
        uninitializedProvider.sendSMS('+1987654321', 'Test')
      ).rejects.toThrow();
    });
  });

  describe('healthCheck', () => {
    it('should return false when not initialized', async () => {
      const result = await provider.healthCheck();

      expect(result).toBe(false);
    });

    it('should return true when initialized', async () => {
      await provider.initialize();

      const result = await provider.healthCheck();

      expect(result).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should dispose the provider and clean up resources', async () => {
      await provider.initialize();
      expect(provider['initialized']).toBe(true);

      await provider.dispose();

      expect(provider['initialized']).toBe(false);
      expect(provider['client']).toBeNull();
    });

    it('should handle dispose when not initialized', async () => {
      await expect(provider.dispose()).resolves.toBeUndefined();

      expect(provider['initialized']).toBe(false);
    });
  });
});
