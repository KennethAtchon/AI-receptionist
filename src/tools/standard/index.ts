/**
 * Standard Tool Library
 * Setup standard tools (calendar, booking, CRM, database)
 */

import { ToolRegistry } from '../registry';
import { ToolBuilder } from '../builder';
import { ToolConfig, ProviderConfig } from '../../types';
import { logger } from '../../utils/logger';

// Re-export all standard tool modules
export { setupDatabaseTools } from './database-tools';
export type { DatabaseToolsConfig } from './database-tools';

export { setupCallTools } from './call-tools';
export type { CallToolsConfig } from './call-tools';

export { setupMessagingTools } from './messaging-tools';
export type { MessagingToolsConfig } from './messaging-tools';

export { setupGoogleTools } from './google-tools';
export type { GoogleServicesToolsConfig } from './google-tools';

/**
 * Setup simple test tools - no provider configuration needed
 * These are basic tools to verify AI can use tools correctly
 */
export async function setupStandardTools(
  registry: ToolRegistry,
  _toolConfig: ToolConfig,
  _providerConfig: ProviderConfig
): Promise<void> {
  logger.info('[StandardTools] Setting up simplified test tools');

  // Simple calculator tool
  const calculatorTool = new ToolBuilder()
    .withName('calculator')
    .withDescription('Perform basic math calculations (add, subtract, multiply, divide)')
    .withParameters({
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number' }
      },
      required: ['operation', 'a', 'b']
    })
    .default(async (params) => {
      let result: number;
      switch (params.operation) {
        case 'add': result = params.a + params.b; break;
        case 'subtract': result = params.a - params.b; break;
        case 'multiply': result = params.a * params.b; break;
        case 'divide':
          result = params.b !== 0 ? params.a / params.b : NaN;
          break;
        default:
          return {
            success: false,
            error: 'Invalid operation',
            response: { text: 'Invalid operation' }
          };
      }

      logger.info(`[Calculator] ${params.a} ${params.operation} ${params.b} = ${result}`);
      return {
        success: true,
        data: { result },
        response: { text: `Result: ${result}` }
      };
    })
    .build();

  // Simple note-taking tool
  const noteTool = new ToolBuilder()
    .withName('take_note')
    .withDescription('Save a quick note or reminder')
    .withParameters({
      type: 'object',
      properties: {
        note: { type: 'string', description: 'The note content' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' }
      },
      required: ['note']
    })
    .default(async (params) => {
      const noteId = `NOTE_${Date.now()}`;
      logger.info(`[TakeNote] Saved note (${params.priority}): ${params.note}`);
      return {
        success: true,
        data: { noteId, note: params.note, priority: params.priority },
        response: { text: `Note saved with ID: ${noteId}` }
      };
    })
    .build();

  // Simple weather tool (mock data)
  const weatherTool = new ToolBuilder()
    .withName('get_weather')
    .withDescription('Get current weather for a location')
    .withParameters({
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name or zip code' }
      },
      required: ['location']
    })
    .default(async (params) => {
      // Mock weather data
      const temp = Math.floor(Math.random() * 30) + 50;
      const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)];

      logger.info(`[Weather] Checked weather for ${params.location}`);
      return {
        success: true,
        data: { location: params.location, temperature: temp, conditions },
        response: { text: `Weather in ${params.location}: ${temp}°F, ${conditions}` }
      };
    })
    .build();

  registry.register(calculatorTool);
  registry.register(noteTool);
  registry.register(weatherTool);

  logger.info('[StandardTools] Registered 3 test tools: calculator, take_note, get_weather');
}
