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
  id: uuid('id').primaryKey(),
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
    status?: 'active' | 'completed' | 'failed';
    duration?: number;
    participants?: string[];
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
}, (table) => ({
  // Indexes for memory table
  memoryConversationIdIdx: index('memory_conversation_id_idx').on(table.sessionMetadata),
  memoryChannelIdx: index('memory_channel_idx').on(table.channel),
  memoryTypeIdx: index('memory_type_idx').on(table.type),
  memoryTimestampIdx: index('memory_timestamp_idx').on(table.timestamp),
  memoryImportanceIdx: index('memory_importance_idx').on(table.importance),
}));

/**
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
}, (table) => ({
  // Indexes for leads table
  leadsSourceIdx: index('leads_source_idx').on(table.source),
  leadsCreatedAtIdx: index('leads_created_at_idx').on(table.createdAt),
}));

/**
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
}, (table) => ({
  // Indexes for call logs table
  callLogsConversationIdIdx: index('call_logs_conversation_id_idx').on(table.conversationId),
  callLogsOutcomeIdx: index('call_logs_outcome_idx').on(table.outcome),
  callLogsCreatedAtIdx: index('call_logs_created_at_idx').on(table.createdAt),
}));

/**
 * Email allowlist table for auto-reply control
 * Stores emails that are permitted to receive auto-replies
 */
export const emailAllowlist = pgTable('ai_receptionist_email_allowlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  addedAt: timestamp('added_at').defaultNow().notNull(),
  addedBy: text('added_by') // 'system' | 'manual' | 'conversation_init'
}, (table) => ({
  // Indexes for email allowlist table
  emailAllowlistEmailIdx: index('email_allowlist_email_idx').on(table.email),
  emailAllowlistAddedAtIdx: index('email_allowlist_added_at_idx').on(table.addedAt),
}));

// Type exports for use in code
export type Memory = typeof memory.$inferSelect;
export type NewMemory = typeof memory.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type CallLog = typeof callLogs.$inferSelect;
export type NewCallLog = typeof callLogs.$inferInsert;
export type EmailAllowlist = typeof emailAllowlist.$inferSelect;
export type NewEmailAllowlist = typeof emailAllowlist.$inferInsert;
