/**
 * MCP HTTP Server
 *
 * Exposes MCP adapter over HTTP with authentication and CORS support.
 * Provides standard MCP protocol endpoints for external clients.
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import { MCPAdapter } from './mcp-adapter';
import { logger } from '../../utils/logger';
import type { MCPServerConfig } from './types';

/**
 * MCPServer - HTTP server for MCP protocol
 *
 * Exposes the MCP adapter via HTTP endpoints following the MCP specification.
 * Supports authentication, CORS, and graceful shutdown.
 *
 * @example
 * ```typescript
 * const server = new MCPServer(adapter, {
 *   port: 3000,
 *   apiKey: process.env.MCP_API_KEY,
 *   cors: {
 *     enabled: true,
 *     origins: ['https://example.com']
 *   }
 * });
 *
 * await server.start();
 * console.log('MCP server running on http://localhost:3000');
 *
 * // Later...
 * await server.stop();
 * ```
 */
export class MCPServer {
  private app: Application;
  private server?: any;
  private readonly port: number;
  private readonly apiKey?: string;

  constructor(
    private readonly adapter: MCPAdapter,
    config: MCPServerConfig = {}
  ) {
    this.port = config.port || 3000;
    this.apiKey = config.apiKey;
    this.app = express();

    this.setupMiddleware(config);
    this.setupRoutes();
    this.setupErrorHandling();

    logger.info('[MCPServer] Server configured', {
      port: this.port,
      authEnabled: !!this.apiKey,
      corsEnabled: config.cors?.enabled || false
    });
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(config: MCPServerConfig): void {
    // Parse JSON bodies
    this.app.use(express.json());

    // CORS support
    if (config.cors?.enabled) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        const allowedOrigins = config.cors!.origins || ['*'];
        const origin = req.headers.origin;

        if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
          res.setHeader('Access-Control-Allow-Origin', origin || '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.setHeader('Access-Control-Max-Age', '86400');
        }

        if (req.method === 'OPTIONS') {
          return res.status(204).end();
        }

        next();
      });
    }

    // Authentication middleware
    if (this.apiKey) {
      this.app.use('/mcp', (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Missing or invalid Authorization header'
          });
        }

        const token = authHeader.substring(7);
        if (token !== this.apiKey) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid API key'
          });
        }

        next();
      });
    }

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info('[MCPServer] Request', {
        method: req.method,
        path: req.path,
        ip: req.ip
      });
      next();
    });
  }

  /**
   * Setup MCP protocol routes
   */
  private setupRoutes(): void {
    /**
     * GET /mcp/tools
     * List all available tools
     *
     * Query params:
     * - channel: Optional filter by channel (call|sms|email)
     */
    this.app.get('/mcp/tools', async (req: Request, res: Response) => {
      try {
        const channel = req.query.channel as 'call' | 'sms' | 'email' | undefined;

        if (channel && !['call', 'sms', 'email'].includes(channel)) {
          return res.status(400).json({
            error: 'Invalid channel parameter',
            message: 'Channel must be one of: call, sms, email'
          });
        }

        const response = await this.adapter.handleToolsList(channel);
        res.json(response);
      } catch (error) {
        logger.error('[MCPServer] tools/list failed', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    /**
     * POST /mcp/tools/call
     * Execute a tool
     *
     * Body:
     * - name: Tool name
     * - arguments: Tool arguments object
     */
    this.app.post('/mcp/tools/call', async (req: Request, res: Response) => {
      try {
        const { name, arguments: args } = req.body;

        if (!name || typeof name !== 'string') {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Missing or invalid "name" field'
          });
        }

        if (!args || typeof args !== 'object') {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Missing or invalid "arguments" field'
          });
        }

        const response = await this.adapter.handleToolCall({
          name,
          arguments: args
        });

        // Return appropriate HTTP status based on result
        const statusCode = response.isError ? 400 : 200;
        res.status(statusCode).json(response);
      } catch (error) {
        logger.error('[MCPServer] tools/call failed', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    /**
     * GET /mcp/tools/:name
     * Get a specific tool definition
     */
    this.app.get('/mcp/tools/:name', async (req: Request, res: Response) => {
      try {
        const { name } = req.params;
        const tool = await this.adapter.getTool(name);

        if (!tool) {
          return res.status(404).json({
            error: 'Tool not found',
            message: `No tool named "${name}" is registered`
          });
        }

        res.json(tool);
      } catch (error) {
        logger.error('[MCPServer] get tool failed', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    /**
     * GET /health
     * Health check endpoint
     */
    this.app.get('/health', (req: Request, res: Response) => {
      const stats = this.adapter.getStats();
      res.json({
        status: 'ok',
        server: 'mcp',
        ...stats
      });
    });

    /**
     * GET /
     * Server info
     */
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'AI Receptionist MCP Server',
        version: '1.0.0',
        protocol: 'Model Context Protocol',
        endpoints: {
          listTools: 'GET /mcp/tools',
          callTool: 'POST /mcp/tools/call',
          getTool: 'GET /mcp/tools/:name',
          health: 'GET /health'
        },
        documentation: 'https://github.com/loctelli/ai-receptionist'
      });
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.path} not found`
      });
    });

    // Global error handler
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('[MCPServer] Unhandled error', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message
      });
    });
  }

  /**
   * Start the server
   *
   * @returns Promise that resolves when server is listening
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          logger.info(`[MCPServer] Started on port ${this.port}`);
          resolve();
        });

        this.server.on('error', (error: Error) => {
          logger.error('[MCPServer] Server error', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   *
   * @returns Promise that resolves when server is closed
   */
  async stop(): Promise<void> {
    if (!this.server) {
      logger.warn('[MCPServer] Server not running');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server!.close((error?: Error) => {
        if (error) {
          logger.error('[MCPServer] Error stopping server', error);
          reject(error);
        } else {
          logger.info('[MCPServer] Stopped');
          this.server = undefined;
          resolve();
        }
      });
    });
  }

  /**
   * Get the Express app instance
   * Useful for adding custom routes or middleware
   *
   * @returns Express application
   */
  getApp(): Application {
    return this.app;
  }

  /**
   * Check if server is running
   *
   * @returns True if server is listening
   */
  isRunning(): boolean {
    return !!this.server;
  }
}
