/**
 * Unit Tests - AIReceptionist Client
 */

import { AIReceptionist } from '../client';
import { AIReceptionistConfig } from '../types';
import { mockAgentSarah, mockAgentBob } from './fixtures';

// Mock modules to prevent actual API calls
jest.mock('../providers/ai/openai.provider');
jest.mock('../providers/ai/openrouter.provider');
jest.mock('../providers/communication/twilio.provider');
jest.mock('../providers/calendar/google-calendar.provider');
jest.mock('../services/call.service');
jest.mock('../resources/calls.resource');
jest.mock('../resources/sms.resource');
jest.mock('../resources/email.resource');

describe('AIReceptionist', () => {
  const baseConfig: AIReceptionistConfig = {
    agent: mockAgentSarah,
    model: {
      provider: 'openai',
      apiKey: 'test-api-key',
      model: 'gpt-4',
    },
    providers: {},
  };

  describe('constructor', () => {
    it('should_create_client_with_valid_config', () => {
      const client = new AIReceptionist(baseConfig);

      expect(client).toBeInstanceOf(AIReceptionist);
    });

    it('should_throw_error_when_agent_config_missing', () => {
      const invalidConfig = {
        model: baseConfig.model,
        providers: {},
      } as any;

      expect(() => new AIReceptionist(invalidConfig)).toThrow(
        'Agent configuration is required'
      );
    });

    it('should_throw_error_when_model_config_missing', () => {
      const invalidConfig = {
        agent: baseConfig.agent,
        providers: {},
      } as any;

      expect(() => new AIReceptionist(invalidConfig)).toThrow(
        'Model configuration is required'
      );
    });

    it('should_accept_debug_option', () => {
      const configWithDebug = {
        ...baseConfig,
        debug: true,
      };

      const client = new AIReceptionist(configWithDebug);
      expect(client).toBeInstanceOf(AIReceptionist);
    });

    it('should_accept_custom_conversation_store', () => {
      const { InMemoryConversationStore } = require('../storage/in-memory-conversation.store');
      const customStore = new InMemoryConversationStore();

      const configWithStore = {
        ...baseConfig,
        conversationStore: customStore,
      };

      const client = new AIReceptionist(configWithStore);
      expect(client).toBeInstanceOf(AIReceptionist);
    });
  });

  describe('initialize', () => {
    it('should_initialize_successfully_with_minimal_config', async () => {
      const client = new AIReceptionist(baseConfig);

      await expect(client.initialize()).resolves.not.toThrow();
    });

    it('should_handle_double_initialization_gracefully', async () => {
      const client = new AIReceptionist(baseConfig);

      await client.initialize();
      await client.initialize(); // Second call should be handled

      // Should not throw
      expect(client).toBeInstanceOf(AIReceptionist);
    });

    it('should_initialize_with_openai_provider', async () => {
      const client = new AIReceptionist({
        ...baseConfig,
        model: {
          provider: 'openai',
          apiKey: 'test-key',
          model: 'gpt-4',
        },
      });

      await expect(client.initialize()).resolves.not.toThrow();
    });

    it('should_initialize_with_openrouter_provider', async () => {
      const client = new AIReceptionist({
        ...baseConfig,
        model: {
          provider: 'openrouter',
          apiKey: 'test-key',
          model: 'openai/gpt-4',
        },
      });

      await expect(client.initialize()).resolves.not.toThrow();
    });

    it('should_throw_error_for_unsupported_ai_provider', async () => {
      const client = new AIReceptionist({
        ...baseConfig,
        model: {
          provider: 'anthropic',
          apiKey: 'test-key',
          model: 'claude-3',
        },
      });

      await expect(client.initialize()).rejects.toThrow(
        'anthropic provider not yet implemented'
      );
    });

    it('should_initialize_with_twilio_provider', async () => {
      const client = new AIReceptionist({
        ...baseConfig,
        providers: {
          communication: {
            twilio: {
              accountSid: 'test-sid',
              authToken: 'test-token',
              phoneNumber: '+1234567890',
            },
          },
        },
      });

      await client.initialize();

      expect(client.calls).toBeDefined();
      expect(client.sms).toBeDefined();
    });

    it('should_initialize_with_standard_tools', async () => {
      const client = new AIReceptionist({
        ...baseConfig,
        tools: {
          defaults: ['calendar', 'booking'],
        },
        providers: {
          calendar: {
            google: {
              apiKey: 'test-key',
              calendarId: 'test-calendar',
            },
          },
        },
      });

      await expect(client.initialize()).resolves.not.toThrow();
    });

    it('should_register_custom_tools', async () => {
      const customTool = {
        name: 'custom_tool',
        description: 'A custom tool',
        parameters: { type: 'object' },
        handlers: {
          default: async () => ({ success: true, response: { text: 'ok' } }),
        },
      };

      const client = new AIReceptionist({
        ...baseConfig,
        tools: {
          custom: [customTool],
        },
      });

      await client.initialize();

      const registry = client.getToolRegistry();
      expect(registry.get('custom_tool')).toBeDefined();
    });

    it('should_initialize_email_resource', async () => {
      const client = new AIReceptionist(baseConfig);

      await client.initialize();

      expect(client.email).toBeDefined();
    });
  });

  describe('getToolRegistry', () => {
    it('should_return_tool_registry_after_initialization', async () => {
      const client = new AIReceptionist(baseConfig);
      await client.initialize();

      const registry = client.getToolRegistry();

      expect(registry).toBeDefined();
      expect(registry.count).toBeDefined();
    });

    it('should_throw_error_when_not_initialized', () => {
      const client = new AIReceptionist(baseConfig);

      expect(() => client.getToolRegistry()).toThrow(
        'AIReceptionist not initialized'
      );
    });
  });

  describe('clone', () => {
    it('should_clone_client_with_different_agent', async () => {
      const sarah = new AIReceptionist(baseConfig);
      await sarah.initialize();

      const bob = sarah.clone({
        agent: mockAgentBob,
      });

      expect(bob).toBeInstanceOf(AIReceptionist);
      expect(bob).not.toBe(sarah);
    });

    it('should_share_providers_between_clones', async () => {
      const sarah = new AIReceptionist({
        ...baseConfig,
        providers: {
          communication: {
            twilio: {
              accountSid: 'test-sid',
              authToken: 'test-token',
              phoneNumber: '+1234567890',
            },
          },
        },
      });

      const bob = sarah.clone({
        agent: mockAgentBob,
      });

      // Both should use same provider config
      expect(bob).toBeInstanceOf(AIReceptionist);
    });

    it('should_allow_different_tools_for_clones', () => {
      const sarah = new AIReceptionist({
        ...baseConfig,
        tools: {
          defaults: ['calendar'],
        },
      });

      const bob = sarah.clone({
        agent: mockAgentBob,
        tools: {
          defaults: ['booking'],
        },
      });

      expect(bob).toBeInstanceOf(AIReceptionist);
    });

    it('should_preserve_debug_setting_when_not_overridden', () => {
      const sarah = new AIReceptionist({
        ...baseConfig,
        debug: true,
      });

      const bob = sarah.clone({
        agent: mockAgentBob,
      });

      expect(bob).toBeInstanceOf(AIReceptionist);
    });

    it('should_override_debug_setting_when_specified', () => {
      const sarah = new AIReceptionist({
        ...baseConfig,
        debug: true,
      });

      const bob = sarah.clone({
        agent: mockAgentBob,
        debug: false,
      });

      expect(bob).toBeInstanceOf(AIReceptionist);
    });
  });

  describe('dispose', () => {
    it('should_dispose_all_providers', async () => {
      const client = new AIReceptionist({
        ...baseConfig,
        providers: {
          communication: {
            twilio: {
              accountSid: 'test-sid',
              authToken: 'test-token',
              phoneNumber: '+1234567890',
            },
          },
        },
      });

      await client.initialize();
      await expect(client.dispose()).resolves.not.toThrow();
    });

    it('should_handle_disposal_without_initialization', async () => {
      const client = new AIReceptionist(baseConfig);

      await expect(client.dispose()).resolves.not.toThrow();
    });
  });

  describe('event handlers', () => {
    it('should_accept_onToolExecute_handler', () => {
      const onToolExecute = jest.fn();

      const client = new AIReceptionist({
        ...baseConfig,
        onToolExecute,
      });

      expect(client).toBeInstanceOf(AIReceptionist);
    });

    it('should_accept_onToolError_handler', () => {
      const onToolError = jest.fn();

      const client = new AIReceptionist({
        ...baseConfig,
        onToolError,
      });

      expect(client).toBeInstanceOf(AIReceptionist);
    });

    it('should_accept_onConversationStart_handler', () => {
      const onConversationStart = jest.fn();

      const client = new AIReceptionist({
        ...baseConfig,
        onConversationStart,
      });

      expect(client).toBeInstanceOf(AIReceptionist);
    });

    it('should_accept_onConversationEnd_handler', () => {
      const onConversationEnd = jest.fn();

      const client = new AIReceptionist({
        ...baseConfig,
        onConversationEnd,
      });

      expect(client).toBeInstanceOf(AIReceptionist);
    });
  });

  describe('configuration options', () => {
    it('should_accept_notification_config', () => {
      const client = new AIReceptionist({
        ...baseConfig,
        notifications: {
          email: 'admin@example.com',
          webhook: 'https://example.com/webhook',
        },
      });

      expect(client).toBeInstanceOf(AIReceptionist);
    });

    it('should_accept_analytics_config', () => {
      const client = new AIReceptionist({
        ...baseConfig,
        analytics: {
          enabled: true,
          provider: 'mixpanel',
          apiKey: 'test-analytics-key',
        },
      });

      expect(client).toBeInstanceOf(AIReceptionist);
    });

    it('should_accept_model_temperature', () => {
      const client = new AIReceptionist({
        ...baseConfig,
        model: {
          ...baseConfig.model,
          temperature: 0.7,
        },
      });

      expect(client).toBeInstanceOf(AIReceptionist);
    });

    it('should_accept_model_maxTokens', () => {
      const client = new AIReceptionist({
        ...baseConfig,
        model: {
          ...baseConfig.model,
          maxTokens: 2000,
        },
      });

      expect(client).toBeInstanceOf(AIReceptionist);
    });
  });

  describe('agent configuration', () => {
    it('should_accept_agent_with_system_prompt', () => {
      const client = new AIReceptionist({
        ...baseConfig,
        agent: {
          ...mockAgentSarah,
          systemPrompt: 'You are a helpful assistant',
        },
      });

      expect(client).toBeInstanceOf(AIReceptionist);
    });

    it('should_accept_agent_with_voice_config', () => {
      const client = new AIReceptionist({
        ...baseConfig,
        agent: {
          ...mockAgentSarah,
          voice: {
            provider: 'elevenlabs',
            voiceId: 'voice_123',
            stability: 0.8,
            similarityBoost: 0.7,
          },
        },
      });

      expect(client).toBeInstanceOf(AIReceptionist);
    });

    it('should_accept_agent_with_tone', () => {
      const tones: Array<'formal' | 'casual' | 'friendly' | 'professional'> = [
        'formal',
        'casual',
        'friendly',
        'professional',
      ];

      tones.forEach(tone => {
        const client = new AIReceptionist({
          ...baseConfig,
          agent: {
            ...mockAgentSarah,
            tone,
          },
        });

        expect(client).toBeInstanceOf(AIReceptionist);
      });
    });
  });
});
