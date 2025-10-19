/**
 * Tests for Standard Tools
 */

import { ToolRegistry } from '../../registry';
import { setupStandardTools } from '../index';
import type { ToolConfig, ProviderConfig } from '../../../types';

// Mock the logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('setupStandardTools', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('calendar tool', () => {
    it('should register calendar tool when configured', async () => {
      const toolConfig: ToolConfig = {
        defaults: ['calendar'],
        calendar: {
          provider: 'google',
          calendarId: 'test-calendar'
        }
      };

      const providerConfig: ProviderConfig = {
        calendar: {
          google: {
            apiKey: 'test-key',
            calendarId: 'test-calendar'
          }
        }
      };

      await setupStandardTools(registry, toolConfig, providerConfig);

      const tool = registry.get('check_calendar');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('check_calendar');
      expect(tool?.description).toContain('calendar');
    });

    it('should warn when calendar tool requested but not configured', async () => {
      const { logger } = require('../../../utils/logger');

      const toolConfig: ToolConfig = {
        defaults: ['calendar']
      };

      const providerConfig: ProviderConfig = {};

      await setupStandardTools(registry, toolConfig, providerConfig);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Calendar tool requested but no calendar provider configured')
      );

      const tool = registry.get('check_calendar');
      expect(tool).toBeUndefined();
    });
  });

  describe('booking tool', () => {
    it('should register booking tool when configured', async () => {
      const toolConfig: ToolConfig = {
        defaults: ['booking'],
        booking: {
          provider: 'calendly',
          apiKey: 'test-key'
        }
      };

      const providerConfig: ProviderConfig = {};

      await setupStandardTools(registry, toolConfig, providerConfig);

      const tool = registry.get('booking');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('booking');
      expect(tool?.description).toContain('booking');
    });

    it('should warn when booking tool requested but not configured', async () => {
      const { logger } = require('../../../utils/logger');

      const toolConfig: ToolConfig = {
        defaults: ['booking']
      };

      const providerConfig: ProviderConfig = {};

      await setupStandardTools(registry, toolConfig, providerConfig);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Booking tool requested but no booking config provided')
      );
    });
  });

  describe('crm tool', () => {
    it('should register CRM tool when configured', async () => {
      const toolConfig: ToolConfig = {
        defaults: ['crm'],
        crm: {
          provider: 'salesforce',
          apiKey: 'test-key'
        }
      };

      const providerConfig: ProviderConfig = {};

      await setupStandardTools(registry, toolConfig, providerConfig);

      const tool = registry.get('crm');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('crm');
      expect(tool?.description).toContain('CRM');
    });

    it('should warn when CRM tool requested but not configured', async () => {
      const { logger } = require('../../../utils/logger');

      const toolConfig: ToolConfig = {
        defaults: ['crm']
      };

      const providerConfig: ProviderConfig = {};

      await setupStandardTools(registry, toolConfig, providerConfig);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('CRM tool requested but no CRM config provided')
      );
    });
  });

  describe('multiple tools', () => {
    it('should register multiple tools when configured', async () => {
      const toolConfig: ToolConfig = {
        defaults: ['calendar', 'booking', 'crm'],
        calendar: { provider: 'google' },
        booking: { provider: 'calendly' },
        crm: { provider: 'salesforce' }
      };

      const providerConfig: ProviderConfig = {
        calendar: {
          google: {
            apiKey: 'test-key',
            calendarId: 'test-calendar'
          }
        }
      };

      await setupStandardTools(registry, toolConfig, providerConfig);

      expect(registry.get('check_calendar')).toBeDefined();
      expect(registry.get('booking')).toBeDefined();
      expect(registry.get('crm')).toBeDefined();
    });
  });

  describe('unknown tools', () => {
    it('should warn for unknown tool names', async () => {
      const { logger } = require('../../../utils/logger');

      const toolConfig: ToolConfig = {
        defaults: ['unknown_tool']
      };

      const providerConfig: ProviderConfig = {};

      await setupStandardTools(registry, toolConfig, providerConfig);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unknown standard tool: unknown_tool')
      );
    });
  });

  describe('empty defaults', () => {
    it('should handle empty defaults array', async () => {
      const toolConfig: ToolConfig = {
        defaults: []
      };

      const providerConfig: ProviderConfig = {};

      await setupStandardTools(registry, toolConfig, providerConfig);

      expect(registry.listAvailable()).toEqual([]);
    });

    it('should handle missing defaults', async () => {
      const toolConfig: ToolConfig = {};

      const providerConfig: ProviderConfig = {};

      await setupStandardTools(registry, toolConfig, providerConfig);

      expect(registry.listAvailable()).toEqual([]);
    });
  });
});
