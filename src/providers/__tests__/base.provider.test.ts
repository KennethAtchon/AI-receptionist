/**
 * Tests for BaseProvider
 */

import { BaseProvider } from '../base.provider';

describe('BaseProvider', () => {
  // Create a concrete implementation for testing
  class TestProvider extends BaseProvider {
    readonly name = 'test-provider';
    readonly type = 'custom' as const;

    async initialize(): Promise<void> {
      this.initialized = true;
    }

    async dispose(): Promise<void> {
      this.initialized = false;
    }

    async healthCheck(): Promise<boolean> {
      return this.initialized;
    }
  }

  let provider: TestProvider;

  beforeEach(() => {
    provider = new TestProvider();
  });

  describe('constructor', () => {
    it('should create provider with initialized set to false', () => {
      expect(provider['initialized']).toBe(false);
    });

    it('should have name and type properties', () => {
      expect(provider.name).toBe('test-provider');
      expect(provider.type).toBe('custom');
    });
  });

  describe('ensureInitialized', () => {
    it('should throw error when not initialized', () => {
      expect(() => provider['ensureInitialized']()).toThrow(
        'test-provider provider not initialized. Call initialize() first.'
      );
    });

    it('should not throw when initialized', async () => {
      await provider.initialize();

      expect(() => provider['ensureInitialized']()).not.toThrow();
    });
  });

  describe('initialize', () => {
    it('should set initialized to true', async () => {
      expect(provider['initialized']).toBe(false);

      await provider.initialize();

      expect(provider['initialized']).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should set initialized to false', async () => {
      await provider.initialize();
      expect(provider['initialized']).toBe(true);

      await provider.dispose();

      expect(provider['initialized']).toBe(false);
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

  describe('different provider types', () => {
    it('should support communication provider type', () => {
      class CommunicationProvider extends BaseProvider {
        readonly name = 'test-comm';
        readonly type = 'communication' as const;

        async initialize(): Promise<void> {}
        async dispose(): Promise<void> {}
        async healthCheck(): Promise<boolean> {
          return true;
        }
      }

      const commProvider = new CommunicationProvider();
      expect(commProvider.type).toBe('communication');
    });

    it('should support ai provider type', () => {
      class AIProvider extends BaseProvider {
        readonly name = 'test-ai';
        readonly type = 'ai' as const;

        async initialize(): Promise<void> {}
        async dispose(): Promise<void> {}
        async healthCheck(): Promise<boolean> {
          return true;
        }
      }

      const aiProvider = new AIProvider();
      expect(aiProvider.type).toBe('ai');
    });

    it('should support calendar provider type', () => {
      class CalendarProvider extends BaseProvider {
        readonly name = 'test-calendar';
        readonly type = 'calendar' as const;

        async initialize(): Promise<void> {}
        async dispose(): Promise<void> {}
        async healthCheck(): Promise<boolean> {
          return true;
        }
      }

      const calProvider = new CalendarProvider();
      expect(calProvider.type).toBe('calendar');
    });
  });
});
