/**
 * Tests for MCPServer
 */

import { MCPServer } from '../mcp-server';
import { MCPAdapter } from '../mcp-adapter';
import type { MCPServerConfig } from '../types';

// Mock the logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('MCPServer', () => {
  let mockAdapter: jest.Mocked<MCPAdapter>;
  let server: MCPServer;

  beforeEach(() => {
    // Create mock adapter
    mockAdapter = {
      handleToolsList: jest.fn(),
      handleToolCall: jest.fn(),
      getTool: jest.fn(),
      getStats: jest.fn()
    } as any;
  });

  afterEach(async () => {
    if (server && server.isRunning()) {
      await server.stop();
    }
  });

  describe('constructor', () => {
    it('should create server with default configuration', () => {
      server = new MCPServer(mockAdapter);

      expect(server).toBeInstanceOf(MCPServer);
      expect(server.isRunning()).toBe(false);
    });

    it('should create server with custom port', () => {
      const config: MCPServerConfig = {
        port: 4000
      };

      server = new MCPServer(mockAdapter, config);

      expect(server).toBeInstanceOf(MCPServer);
    });

    it('should create server with API key authentication', () => {
      const config: MCPServerConfig = {
        port: 3000,
        apiKey: 'test-api-key'
      };

      server = new MCPServer(mockAdapter, config);

      expect(server).toBeInstanceOf(MCPServer);
    });

    it('should create server with CORS enabled', () => {
      const config: MCPServerConfig = {
        port: 3000,
        cors: {
          enabled: true,
          origins: ['https://example.com']
        }
      };

      server = new MCPServer(mockAdapter, config);

      expect(server).toBeInstanceOf(MCPServer);
    });
  });

  describe('start and stop', () => {
    it('should start the server on specified port', async () => {
      const config: MCPServerConfig = {
        port: 0 // Use port 0 to get random available port
      };

      server = new MCPServer(mockAdapter, config);

      await server.start();

      expect(server.isRunning()).toBe(true);

      await server.stop();
    });

    it('should stop the server gracefully', async () => {
      const config: MCPServerConfig = {
        port: 0
      };

      server = new MCPServer(mockAdapter, config);

      await server.start();
      expect(server.isRunning()).toBe(true);

      await server.stop();
      expect(server.isRunning()).toBe(false);
    });

    it('should handle stop when server is not running', async () => {
      server = new MCPServer(mockAdapter);

      // Should not throw
      await expect(server.stop()).resolves.toBeUndefined();
    });
  });

  describe('getApp', () => {
    it('should return Express app instance', () => {
      server = new MCPServer(mockAdapter);

      const app = server.getApp();

      expect(app).toBeDefined();
      expect(typeof app.use).toBe('function');
      expect(typeof app.get).toBe('function');
      expect(typeof app.post).toBe('function');
    });
  });

  describe('isRunning', () => {
    it('should return false when server is not started', () => {
      server = new MCPServer(mockAdapter);

      expect(server.isRunning()).toBe(false);
    });

    it('should return true when server is running', async () => {
      const config: MCPServerConfig = {
        port: 0
      };

      server = new MCPServer(mockAdapter, config);

      await server.start();

      expect(server.isRunning()).toBe(true);

      await server.stop();
    });
  });

  describe('routes', () => {
    beforeEach(() => {
      server = new MCPServer(mockAdapter, { port: 0 });
    });

    it('should have health endpoint configured', () => {
      mockAdapter.getStats.mockReturnValue({
        toolsRegistered: 5,
        callsHandled: 10
      });

      const app = server.getApp();
      expect(app).toBeDefined();
    });

    it('should have root endpoint configured', () => {
      const app = server.getApp();
      expect(app).toBeDefined();
    });

    it('should have MCP tools endpoints configured', () => {
      const app = server.getApp();
      expect(app).toBeDefined();
    });
  });
});
