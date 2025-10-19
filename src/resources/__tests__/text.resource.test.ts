/**
 * Tests for TextResource
 */

import { TextResource } from '../text.resource';
import { Agent } from '../../agent/core/Agent';
import type { GenerateTextOptions } from '../../types';

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('TextResource', () => {
  let mockAgent: jest.Mocked<Agent>;
  let textResource: TextResource;

  beforeEach(() => {
    // Create a mock agent
    mockAgent = {
      process: jest.fn()
    } as any;

    textResource = new TextResource(mockAgent);
  });

  describe('generate', () => {
    it('should generate text using the agent', async () => {
      const mockResponse = {
        content: 'Hello! How can I help you today?',
        metadata: {
          model: 'test-model',
          tokens: 10
        }
      };

      mockAgent.process.mockResolvedValue(mockResponse);

      const options: GenerateTextOptions = {
        prompt: 'What is your name?'
      };

      const result = await textResource.generate(options);

      expect(mockAgent.process).toHaveBeenCalledWith(
        expect.objectContaining({
          input: 'What is your name?',
          channel: 'text',
          context: expect.objectContaining({
            channel: 'text'
          })
        })
      );

      expect(result.text).toBe('Hello! How can I help you today?');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.timestamp).toBeInstanceOf(Date);
    });

    it('should include conversationId in options', async () => {
      const mockResponse = {
        content: 'Response text',
        metadata: {}
      };

      mockAgent.process.mockResolvedValue(mockResponse);

      const options: GenerateTextOptions = {
        prompt: 'Test prompt',
        conversationId: 'conv-123'
      };

      const result = await textResource.generate(options);

      expect(mockAgent.process).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            conversationId: 'conv-123'
          })
        })
      );

      expect(result.metadata.conversationId).toBe('conv-123');
    });

    it('should include metadata in context when provided', async () => {
      const mockResponse = {
        content: 'Response text',
        metadata: {}
      };

      mockAgent.process.mockResolvedValue(mockResponse);

      const options: GenerateTextOptions = {
        prompt: 'Test prompt',
        metadata: {
          context: 'documentation',
          audience: 'developers'
        }
      };

      await textResource.generate(options);

      expect(mockAgent.process).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            metadata: {
              context: 'documentation',
              audience: 'developers'
            }
          })
        })
      );
    });

    it('should throw error when agent fails', async () => {
      const error = new Error('Agent processing failed');
      mockAgent.process.mockRejectedValue(error);

      const options: GenerateTextOptions = {
        prompt: 'Test prompt'
      };

      await expect(textResource.generate(options)).rejects.toThrow('Agent processing failed');
    });
  });

  describe('stream', () => {
    it('should throw error as streaming is not implemented', async () => {
      const options: GenerateTextOptions = {
        prompt: 'Test prompt'
      };

      const generator = textResource.stream(options);

      await expect(generator.next()).rejects.toThrow('Streaming not implemented yet. Use generate() instead.');
    });
  });
});
