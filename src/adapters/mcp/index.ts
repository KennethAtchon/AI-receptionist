/**
 * MCP Adapter Module
 *
 * Exposes AI Receptionist tools via Model Context Protocol.
 *
 * @module adapters/mcp
 */

export { MCPAdapter } from './mcp-adapter';
export { MCPServer } from './mcp-server';

export type {
  MCPTool,
  MCPToolListResponse,
  MCPToolCallRequest,
  MCPToolCallResponse,
  MCPContent,
  MCPContentType,
  MCPServerConfig,
  MCPAdapterOptions
} from './types';
