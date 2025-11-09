/**
 * Database schema for agent memory storage
 * Uses Drizzle ORM for type-safe database operations
 */

import { pgTable, uuid, text, timestamp, integer, jsonb, boolean, index } from 'drizzle-orm/pg-core';

/**
 * Memory table - stores all agent memories including conversations,
 * decisions, tool executions, and system events.
 *
 * This is the single source of truth for all conversational data.
 */
export const memory = pgTable('ai_receptionist_memory', {
  // Core fields
  id: uuid('id').primaryKey().defaultRandom(),
  externalId: text('external_id'), // User-provided text ID (e.g., "msg-lead-2-1762673752098")
  content: text('content').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  type: text('type').notNull(), // 'conversation' | 'decision' | 'error' | 'tool_execution' | 'system'
  importance: integer('importance'),

  // Channel tracking
  channel: text('channel'), // 'call' | 'sms' | 'email' | 'text'

  // Session metadata (stored as JSONB)
  sessionMetadata: jsonb('session_metadata').$type<{
    conversationId?: string;
    callSid?: string;
    messageSid?: string;
    emailId?: string;
    inReplyTo?: string; // REQUIRED for threading (this is enough!)
    from?: string; // REQUIRED for participant matching
    to?: string; // REQUIRED for participant matching
    subject?: string; // REQUIRED for subject matching
    // Remove references entirely - can rebuild from conversation history
  }>(),

  // Role tracking
  role: text('role'), // 'system' | 'user' | 'assistant' | 'tool'

  // Tool execution tracking (stored as JSONB)
  toolCall: jsonb('tool_call').$type<{
    id: string;
    name: string;
    parameters: any;
  }>(),

  toolResult: jsonb('tool_result').$type<{
    success: boolean;
    data?: any;
    error?: string;
  }>(),

  // Additional metadata
  metadata: jsonb('metadata'),
  goalAchieved: boolean('goal_achieved'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  // Indexes for memory table
  index('memory_conversation_id_idx').on(table.sessionMetadata),
  index('memory_channel_idx').on(table.channel),
  index('memory_type_idx').on(table.type),
  index('memory_timestamp_idx').on(table.timestamp),
  index('memory_importance_idx').on(table.importance),
  index('memory_external_id_idx').on(table.externalId),
]);

/**
 * Currently not used
 * Optional: Leads table for business logic
 * Stores customer/lead information collected by AI
 */
export const leads = pgTable('ai_receptionist_leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email'),
  phone: text('phone'),
  source: text('source'), // 'call' | 'sms' | 'email' | 'text'
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  // Indexes for leads table
  index('leads_source_idx').on(table.source),
  index('leads_created_at_idx').on(table.createdAt),
]);

/**
 * Currently not used
 * Optional: Call logs table for analytics
 * Stores call outcomes and summaries
 */
export const callLogs = pgTable('ai_receptionist_call_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id'),
  phoneNumber: text('phone_number'),
  duration: integer('duration'), // in seconds
  outcome: text('outcome'), // 'booked' | 'callback' | 'not_interested' | etc.
  summary: text('summary'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  // Indexes for call logs table
  index('call_logs_conversation_id_idx').on(table.conversationId),
  index('call_logs_outcome_idx').on(table.outcome),
  index('call_logs_created_at_idx').on(table.createdAt),
]);

/**
 * Unified allowlist table for auto-reply control
 * Stores emails and phone numbers that are permitted to receive auto-replies
 */
export const allowlist = pgTable('ai_receptionist_allowlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(), // email or phone number
  type: text('type').notNull(), // 'email' | 'sms'
  addedAt: timestamp('added_at').defaultNow().notNull(),
  addedBy: text('added_by') // 'system' | 'manual' | 'conversation_init' | 'opt_in'
}, (table) => [
  // Indexes for allowlist table
  index('allowlist_identifier_type_idx').on(table.identifier, table.type),
  index('allowlist_type_idx').on(table.type),
  index('allowlist_added_at_idx').on(table.addedAt),
  // Unique constraint on identifier + type combination
  index('allowlist_unique_idx').on(table.identifier, table.type),
]);

// Type exports for use in code
export type Memory = typeof memory.$inferSelect;
export type NewMemory = typeof memory.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type CallLog = typeof callLogs.$inferSelect;
export type NewCallLog = typeof callLogs.$inferInsert;
export type Allowlist = typeof allowlist.$inferSelect;
export type NewAllowlist = typeof allowlist.$inferInsert;
