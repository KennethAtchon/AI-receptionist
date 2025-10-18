/**
 * Mock Providers for Testing
 */

import { IProvider, IAIProvider, AIResponse, ChatOptions } from '../../types';

export class MockAIProvider implements IAIProvider {
  name = 'mock-ai';
  type = 'ai' as const;
  initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async dispose(): Promise<void> {
    this.initialized = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }

  async chat(options: ChatOptions): Promise<AIResponse> {
    return {
      content: 'Mock AI response',
      finishReason: 'stop',
    };
  }
}

export class MockTwilioProvider implements IProvider {
  name = 'mock-twilio';
  type = 'communication' as const;
  initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async dispose(): Promise<void> {
    this.initialized = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }

  async makeCall(to: string, webhookUrl: string): Promise<any> {
    return {
      sid: 'CA_MOCK_123',
      to,
      status: 'initiated',
    };
  }

  async sendSMS(to: string, body: string): Promise<any> {
    return {
      sid: 'SM_MOCK_456',
      to,
      body,
      status: 'queued',
    };
  }
}

export class MockCalendarProvider implements IProvider {
  name = 'mock-calendar';
  type = 'calendar' as const;
  initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async dispose(): Promise<void> {
    this.initialized = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }

  async listEvents(startDate: Date, endDate: Date): Promise<any[]> {
    return [];
  }

  async createEvent(event: any): Promise<any> {
    return { id: 'event_mock_123', ...event };
  }
}
