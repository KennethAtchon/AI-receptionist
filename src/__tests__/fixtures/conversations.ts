/**
 * Test Fixtures - Conversation Data
 */

import { Conversation, ConversationMessage } from '../../types';

export const mockConversationMessages: ConversationMessage[] = [
  {
    role: 'system',
    content: 'You are a helpful assistant named Sarah',
    timestamp: new Date('2025-01-15T10:00:00Z'),
  },
  {
    role: 'user',
    content: 'Hi, I need to book an appointment',
    timestamp: new Date('2025-01-15T10:00:10Z'),
  },
  {
    role: 'assistant',
    content: 'I\'d be happy to help you book an appointment! What date works best for you?',
    timestamp: new Date('2025-01-15T10:00:15Z'),
  },
  {
    role: 'user',
    content: 'How about tomorrow at 2pm?',
    timestamp: new Date('2025-01-15T10:00:30Z'),
  },
];

export const mockConversationCall: Conversation = {
  id: 'conv_call_123',
  channel: 'call',
  messages: mockConversationMessages,
  status: 'active',
  startedAt: new Date('2025-01-15T10:00:00Z'),
  callSid: 'CA123456789',
  metadata: {
    phoneNumber: '+1234567890',
    leadId: 'lead_001',
  },
};

export const mockConversationSMS: Conversation = {
  id: 'conv_sms_456',
  channel: 'sms',
  messages: [
    {
      role: 'user',
      content: 'What are your hours?',
      timestamp: new Date('2025-01-15T11:00:00Z'),
    },
    {
      role: 'assistant',
      content: 'We are open Monday-Friday 9am-5pm',
      timestamp: new Date('2025-01-15T11:00:05Z'),
    },
  ],
  status: 'completed',
  startedAt: new Date('2025-01-15T11:00:00Z'),
  endedAt: new Date('2025-01-15T11:01:00Z'),
  messageSid: 'SM123456789',
  metadata: {
    phoneNumber: '+0987654321',
  },
};

export const mockConversationCompleted: Conversation = {
  id: 'conv_completed_789',
  channel: 'call',
  messages: mockConversationMessages,
  status: 'completed',
  startedAt: new Date('2025-01-15T09:00:00Z'),
  endedAt: new Date('2025-01-15T09:15:00Z'),
  callSid: 'CA987654321',
};

export const mockConversationFailed: Conversation = {
  id: 'conv_failed_321',
  channel: 'email',
  messages: [],
  status: 'failed',
  startedAt: new Date('2025-01-15T08:00:00Z'),
  endedAt: new Date('2025-01-15T08:00:30Z'),
  metadata: {
    error: 'Connection timeout',
  },
};
