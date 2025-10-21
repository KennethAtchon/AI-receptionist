/**
 * MCP Protocol Types
 * Based on Model Context Protocol specification
 */

import { Channel } from '../../types';

/**
 * MCP Tool Definition
 * Represents a tool in MCP format
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
    [key: string]: any;
  };
}

/**
 * Response for tools/list request
 */
export interface MCPToolListResponse {
  tools: MCPTool[];
}

/**
 * Request for tools/call
 */
export interface MCPToolCallRequest {
  name: string;
  arguments: Record<string, any>;
}

/**
 * Content types for MCP responses
 */
export type MCPContentType = 'text' | 'image' | 'resource';

/**
 * MCP Content Block
 */
export interface MCPContent {
  type: MCPContentType;
  text?: string;
  data?: string;
  mimeType?: string;
}

/**
 * Response for tools/call request
 */
export interface MCPToolCallResponse {
  content: MCPContent[];
  isError?: boolean;
}

/**
 * MCP Server Configuration
 */
export interface MCPServerConfig {
  port?: number;
  apiKey?: string;
  cors?: {
    enabled: boolean;
    origins?: string[];
  };
}

/**
 * MCP Adapter Options
 */
export interface MCPAdapterOptions {
  defaultChannel?: Channel;
  metadata?: Record<string, any>;
}
