/**
 * Tool Template
 * Copy this file to create a new tool quickly.
 */

import { ToolBuilder } from '../builder';
import type { ITool } from '../../types';

export function buildToolTemplate(): ITool {
  return new ToolBuilder()
    .withName('tool_name')
    .withDescription('Short description of what this tool does')
    .withParameters({
      type: 'object',
      properties: {
        // Define your parameters here
        example: { type: 'string', description: 'Example parameter' }
      },
      required: []
    })
    .default(async (params, context) => {
      // Implement the core action here
      return {
        success: true,
        data: { echo: params.example },
        response: { text: `Executed tool_name with example='${params.example || ''}'` }
      };
    })
    .build();
}

// Optional: export a default instance for quick registration
export const ToolTemplate = buildToolTemplate();


