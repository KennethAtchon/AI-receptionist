/**
 * Database Tools for Customer Management and Memory
 *
 * These tools allow the AI to:
 * - Save and find customer information
 * - Log call outcomes
 * - Remember and recall user preferences
 *
 * All data is persisted through the agent's memory system.
 */

import { ToolBuilder } from '../builder';
import { ToolRegistry } from '../registry';
import type { Agent } from '../../agent/core/Agent';
import type { IStorage } from '../../agent/types';
import type { ToolResult } from '../../types';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration for database tools
 */
export interface DatabaseToolsConfig {
  agent: Agent;
  storage?: IStorage; // Optional - if not provided, uses agent's memory
}

/**
 * Setup all database tools
 */
export function setupDatabaseTools(
  registry: ToolRegistry,
  config: DatabaseToolsConfig
): void {
  logger.info('[DatabaseTools] Registering database management tools');

  // Customer management tools
  registry.register(createSaveCustomerInfoTool(config));
  registry.register(createFindCustomerTool(config));

  // Call logging tools
  registry.register(createLogCallOutcomeTool(config));

  // Preference management tools
  registry.register(createRememberPreferenceTool(config));
  registry.register(createRecallPreferenceTool(config));

  logger.info('[DatabaseTools] Registered 5 database tools');
}

/**
 * Tool: save_customer_info
 * AI can save customer data collected during conversations
 */
function createSaveCustomerInfoTool(config: DatabaseToolsConfig) {
  return new ToolBuilder()
    .withName('save_customer_info')
    .withDescription('Save customer information collected during conversation (name, email, phone, company, notes)')
    .withParameters({
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Customer full name'
        },
        email: {
          type: 'string',
          format: 'email',
          description: 'Customer email address'
        },
        phone: {
          type: 'string',
          description: 'Customer phone number'
        },
        company: {
          type: 'string',
          description: 'Customer company name'
        },
        notes: {
          type: 'string',
          description: 'Additional notes about the customer'
        }
      },
      required: []
    })
    .default(async (params, ctx) => {
      logger.info('[SaveCustomerInfo] Saving customer data', {
        name: params.name,
        channel: ctx.channel
      });

      try {
        // Create a memory entry for the customer info
        const customerMemory = {
          id: `customer-${uuidv4()}`,
          content: `Customer information: ${JSON.stringify(params)}`,
          timestamp: new Date(),
          type: 'decision' as const,
          importance: 9, // High importance for customer data
          channel: ctx.channel,
          sessionMetadata: {
            conversationId: ctx.conversationId,
            callSid: ctx.callSid,
            messageSid: ctx.messageSid,
            status: 'active' as const,
          },
          metadata: {
            toolName: 'save_customer_info',
            customerData: params,
          },
        };

        // Store in agent memory
        await config.agent.getMemory().store(customerMemory);

        // Build response based on channel
        const customerFields = [
          params.name && `name: ${params.name}`,
          params.email && `email: ${params.email}`,
          params.phone && `phone: ${params.phone}`,
          params.company && `company: ${params.company}`,
        ].filter(Boolean).join(', ');

        const responseText = `I've saved your information (${customerFields}).`;

        return {
          success: true,
          data: {
            customerId: customerMemory.id,
            savedFields: Object.keys(params),
          },
          response: {
            speak: responseText,
            message: `✓ ${responseText}`,
            text: responseText,
          },
        };
      } catch (error) {
        logger.error('[SaveCustomerInfo] Failed to save customer data', error instanceof Error ? error : undefined);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save customer information',
          response: {
            speak: 'I apologize, but I encountered an error saving your information. Let me try again.',
            message: 'Error saving information. Please try again.',
            text: 'Error saving customer information',
          },
        } as ToolResult;
      }
    })
    .build();
}

/**
 * Tool: find_customer
 * Search for existing customers by email or phone
 */
function createFindCustomerTool(config: DatabaseToolsConfig) {
  return new ToolBuilder()
    .withName('find_customer')
    .withDescription('Find existing customer by email or phone number')
    .withParameters({
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          description: 'Customer email to search for'
        },
        phone: {
          type: 'string',
          description: 'Customer phone number to search for'
        }
      },
      required: []
    })
    .default(async (params, ctx) => {
      logger.info('[FindCustomer] Searching for customer', {
        email: params.email,
        phone: params.phone,
      });

      try {
        // Search in memory for customer records
        const memories = await config.agent.getMemory().search({
          type: 'decision',
          keywords: [params.email, params.phone].filter(Boolean) as string[],
          limit: 10,
        });

        // Filter for customer info memories
        const customerMemories = memories.filter(
          (m) => m.metadata?.toolName === 'save_customer_info'
        );

        if (customerMemories.length === 0) {
          return {
            success: true,
            data: { found: false },
            response: {
              speak: "I don't have any previous records for that contact.",
              message: 'No customer found.',
              text: 'Customer not found',
            },
          };
        }

        // Get the most recent customer record
        const latestCustomer = customerMemories[0];
        const customerData = (latestCustomer.metadata?.customerData || {}) as {
          name?: string;
          email?: string;
          phone?: string;
          company?: string;
          notes?: string;
        };

        return {
          success: true,
          data: {
            found: true,
            customer: customerData,
            memoryId: latestCustomer.id,
          },
          response: {
            speak: `I found a record for ${customerData.name || 'this customer'}.`,
            message: `Found: ${customerData.name || 'Customer'}\n${customerData.email || ''}\n${customerData.phone || ''}`,
            text: `Customer found: ${JSON.stringify(customerData)}`,
          },
        };
      } catch (error) {
        logger.error('[FindCustomer] Search failed', error instanceof Error ? error : undefined);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to search for customer',
          response: {
            speak: 'I had trouble searching for that information.',
            message: 'Search error.',
            text: 'Error searching for customer',
          },
        } as ToolResult;
      }
    })
    .build();
}

/**
 * Tool: log_call_outcome
 * Log call results and next steps
 */
function createLogCallOutcomeTool(config: DatabaseToolsConfig) {
  return new ToolBuilder()
    .withName('log_call_outcome')
    .withDescription('Log the outcome of a call conversation with summary and next steps')
    .withParameters({
      type: 'object',
      properties: {
        outcome: {
          type: 'string',
          enum: [
            'appointment_booked',
            'callback_requested',
            'not_interested',
            'info_provided',
            'voicemail',
            'qualified_lead',
            'needs_follow_up',
          ],
          description: 'The outcome of the call',
        },
        summary: {
          type: 'string',
          description: 'Brief summary of what happened during the call',
        },
        nextSteps: {
          type: 'string',
          description: 'What needs to happen next (optional)',
        },
      },
      required: ['outcome', 'summary'],
    })
    .default(async (params, ctx) => {
      logger.info('[LogCallOutcome] Logging call result', {
        outcome: params.outcome,
        conversationId: ctx.conversationId,
      });

      try {
        // Create a memory entry for the call outcome
        const outcomeMemory = {
          id: `outcome-${uuidv4()}`,
          content: `Call outcome: ${params.outcome}. ${params.summary}${
            params.nextSteps ? ` Next: ${params.nextSteps}` : ''
          }`,
          timestamp: new Date(),
          type: 'system' as const,
          importance: 8, // High importance for outcomes
          channel: ctx.channel,
          sessionMetadata: {
            conversationId: ctx.conversationId,
            callSid: ctx.callSid,
            status: 'completed' as const,
          },
          metadata: {
            toolName: 'log_call_outcome',
            outcome: params.outcome,
            summary: params.summary,
            nextSteps: params.nextSteps,
          },
          goalAchieved: ['appointment_booked', 'qualified_lead'].includes(params.outcome),
        };

        // Store in agent memory
        await config.agent.getMemory().store(outcomeMemory);

        return {
          success: true,
          data: {
            outcomeId: outcomeMemory.id,
            outcome: params.outcome,
          },
          response: {
            speak: 'I\'ve logged the outcome of this call.',
            message: `✓ Logged: ${params.outcome}`,
            text: `Call outcome logged: ${params.outcome}`,
          },
        };
      } catch (error) {
        logger.error('[LogCallOutcome] Failed to log outcome', error instanceof Error ? error : undefined);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to log call outcome',
          response: {
            speak: 'I had trouble logging that information.',
            message: 'Error logging outcome.',
            text: 'Error logging call outcome',
          },
        } as ToolResult;
      }
    })
    .build();
}

/**
 * Tool: remember_preference
 * Store customer preferences in agent memory
 */
function createRememberPreferenceTool(config: DatabaseToolsConfig) {
  return new ToolBuilder()
    .withName('remember_preference')
    .withDescription('Remember a customer preference or important detail for future conversations')
    .withParameters({
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'The preference category (e.g., "preferred_time", "communication_style", "interests")',
        },
        value: {
          type: 'string',
          description: 'The preference value (e.g., "morning appointments", "formal communication")',
        },
        importance: {
          type: 'number',
          minimum: 1,
          maximum: 10,
          description: 'How important is this preference (1-10, default: 7)',
          default: 7,
        },
      },
      required: ['key', 'value'],
    })
    .default(async (params, ctx) => {
      logger.info('[RememberPreference] Storing preference', {
        key: params.key,
        value: params.value,
      });

      try {
        // Create a memory entry for the preference
        const preferenceMemory = {
          id: `pref-${params.key}-${uuidv4()}`,
          content: `Customer preference: ${params.key} = ${params.value}`,
          timestamp: new Date(),
          type: 'decision' as const,
          importance: params.importance || 7,
          channel: ctx.channel,
          sessionMetadata: {
            conversationId: ctx.conversationId,
            callSid: ctx.callSid,
            messageSid: ctx.messageSid,
          },
          metadata: {
            toolName: 'remember_preference',
            preferenceKey: params.key,
            preferenceValue: params.value,
          },
        };

        // Store in agent memory
        await config.agent.getMemory().store(preferenceMemory);

        return {
          success: true,
          data: {
            preferenceId: preferenceMemory.id,
            key: params.key,
            value: params.value,
          },
          response: {
            speak: `Got it, I'll remember that you prefer ${params.value}.`,
            message: `✓ Remembered: ${params.key} = ${params.value}`,
            text: `Preference saved: ${params.key} = ${params.value}`,
          },
        };
      } catch (error) {
        logger.error('[RememberPreference] Failed to store preference', error instanceof Error ? error : undefined);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to remember preference',
          response: {
            speak: 'I had trouble saving that preference.',
            message: 'Error saving preference.',
            text: 'Error remembering preference',
          },
        } as ToolResult;
      }
    })
    .build();
}

/**
 * Tool: recall_preference
 * Retrieve previously saved preferences from agent memory
 */
function createRecallPreferenceTool(config: DatabaseToolsConfig) {
  return new ToolBuilder()
    .withName('recall_preference')
    .withDescription('Recall a previously saved customer preference')
    .withParameters({
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'The preference category to recall (e.g., "preferred_time")',
        },
      },
      required: ['key'],
    })
    .default(async (params, ctx) => {
      logger.info('[RecallPreference] Recalling preference', {
        key: params.key,
      });

      try {
        // Search in memory for preference records
        const memories = await config.agent.getMemory().search({
          type: 'decision',
          keywords: [params.key],
          limit: 5,
        });

        // Filter for preference memories with this key
        const preferenceMemories = memories.filter(
          (m) =>
            m.metadata?.toolName === 'remember_preference' &&
            m.metadata?.preferenceKey === params.key
        );

        if (preferenceMemories.length === 0) {
          return {
            success: true,
            data: { found: false },
            response: {
              speak: `I don't have a saved preference for ${params.key}.`,
              message: `No preference found for ${params.key}`,
              text: `Preference not found: ${params.key}`,
            },
          };
        }

        // Get the most recent preference
        const latestPreference = preferenceMemories[0];
        const preferenceValue = latestPreference.metadata?.preferenceValue;

        return {
          success: true,
          data: {
            found: true,
            key: params.key,
            value: preferenceValue,
            memoryId: latestPreference.id,
          },
          response: {
            speak: `I remember you prefer ${preferenceValue}.`,
            message: `${params.key}: ${preferenceValue}`,
            text: `Preference found: ${params.key} = ${preferenceValue}`,
          },
        };
      } catch (error) {
        logger.error('[RecallPreference] Failed to recall preference', error instanceof Error ? error : undefined);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to recall preference',
          response: {
            speak: 'I had trouble recalling that information.',
            message: 'Error recalling preference.',
            text: 'Error recalling preference',
          },
        } as ToolResult;
      }
    })
    .build();
}
