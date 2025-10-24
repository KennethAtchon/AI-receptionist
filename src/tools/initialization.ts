/**
 * Tool Initialization Module
 * Handles registration of all tools (standard, custom, and provider-specific)
 */

import { ToolRegistry } from './registry';
import { ToolStore } from './tool-store';
import { setupStandardTools } from './standard';
import type { AIReceptionistConfig, ProviderConfig } from '../types';
import type { Agent } from '../agent/core/Agent';
import type { CallProcessor } from '../processors/call.processor';
import type { MessagingProcessor } from '../processors/messaging.processor';
import type { CalendarProcessor } from '../processors/calendar.processor';
import { logger } from '../utils/logger';

export interface ToolInitializationContext {
  config: AIReceptionistConfig;
  agent: Agent;
  callProcessor?: CallProcessor;
  messagingProcessor?: MessagingProcessor;
  calendarProcessor?: CalendarProcessor;
}

/**
 * Initialize tool registry and tool store
 */
export function createToolInfrastructure(): {
  toolRegistry: ToolRegistry;
  toolStore: ToolStore;
} {
  const toolRegistry = new ToolRegistry();
  const toolStore = new ToolStore();
  toolRegistry.setToolStore(toolStore);

  logger.info('[ToolInit] Tool infrastructure created');

  return { toolRegistry, toolStore };
}

/**
 * Register all configured tools
 * This includes standard tools, custom tools, and provider-specific tools
 */
export async function registerAllTools(
  context: ToolInitializationContext,
  toolRegistry: ToolRegistry
): Promise<void> {
  // 1. Register standard tools (calendar, booking, etc.)
  await registerStandardTools(context, toolRegistry);

  // 2. Register custom tools
  await registerCustomTools(context, toolRegistry);

  // 3. Register database tools (if long-term memory enabled)
  await registerDatabaseTools(context, toolRegistry);

  // 4. Register provider-specific tools (call, messaging, calendar)
  await registerProviderTools(context, toolRegistry);

  logger.info(`[ToolInit] Total tools registered: ${toolRegistry.count()}`);
}

/**
 * Register standard tools (calendar, booking, etc.)
 */
async function registerStandardTools(
  context: ToolInitializationContext,
  toolRegistry: ToolRegistry
): Promise<void> {
  if (!context.config.tools?.defaults) {
    logger.info('[ToolInit] No standard tools requested');
    return;
  }

  await setupStandardTools(
    toolRegistry,
    context.config.tools,
    context.config.providers || {}
  );

  logger.info('[ToolInit] Standard tools registered', {
    tools: context.config.tools.defaults
  });
}

/**
 * Register custom tools provided by user
 */
async function registerCustomTools(
  context: ToolInitializationContext,
  toolRegistry: ToolRegistry
): Promise<void> {
  if (!context.config.tools?.custom) {
    logger.info('[ToolInit] No custom tools provided');
    return;
  }

  for (const tool of context.config.tools.custom) {
    toolRegistry.register(tool);
  }

  logger.info('[ToolInit] Custom tools registered', {
    count: context.config.tools.custom.length
  });
}

/**
 * Register database tools for long-term memory
 */
async function registerDatabaseTools(
  context: ToolInitializationContext,
  toolRegistry: ToolRegistry
): Promise<void> {
  const memoryConfig = context.config.agent.memory;

  if (!memoryConfig?.longTermEnabled || !memoryConfig?.longTermStorage) {
    logger.info('[ToolInit] Long-term memory disabled, skipping database tools');
    return;
  }

  logger.info('[ToolInit] Auto-registering database tools (memory storage enabled)');

  const { setupDatabaseTools } = await import('./standard/database-tools');
  setupDatabaseTools(toolRegistry, {
    agent: context.agent,
    storage: memoryConfig.longTermStorage
  });

  logger.info('[ToolInit] Database tools registered');
}

/**
 * Register provider-specific tools (Twilio calls/SMS, Google Calendar, etc.)
 * Uses config to determine which tools should be registered
 */
async function registerProviderTools(
  context: ToolInitializationContext,
  toolRegistry: ToolRegistry
): Promise<void> {
  // Register call and messaging tools (if Twilio configured)
  if (context.config.providers?.communication?.twilio) {
    if (!context.callProcessor || !context.messagingProcessor) {
      throw new Error('Twilio configured but processors not initialized');
    }
    await registerTwilioTools(context, toolRegistry);
  }

  // Register calendar tools (if Google Calendar configured)
  if (context.config.providers?.calendar?.google) {
    if (!context.calendarProcessor) {
      throw new Error('Google Calendar configured but processor not initialized');
    }
    await registerCalendarTools(context, toolRegistry);
  }
}

/**
 * Register Twilio-specific tools (calls and messaging)
 */
async function registerTwilioTools(
  context: ToolInitializationContext,
  toolRegistry: ToolRegistry
): Promise<void> {
  // Register call tools
  const { setupCallTools } = await import('./standard/call-tools');
  await setupCallTools(toolRegistry, { callProcessor: context.callProcessor! });

  // Register messaging tools
  const { setupMessagingTools } = await import('./standard/messaging-tools');
  await setupMessagingTools(toolRegistry, { messagingProcessor: context.messagingProcessor! });

  logger.info('[ToolInit] Twilio tools registered (calls, messaging)');
}

/**
 * Register Google Calendar tools
 */
async function registerCalendarTools(
  context: ToolInitializationContext,
  toolRegistry: ToolRegistry
): Promise<void> {
  const { setupCalendarTools } = await import('./standard/calendar-tools');
  await setupCalendarTools(toolRegistry, { calendarProcessor: context.calendarProcessor! });

  logger.info('[ToolInit] Calendar tools registered (Google Calendar)');
}
