/**
 * Base Provider Interface
 * All providers (Twilio, OpenAI, Google Calendar, etc.) implement this
 */

import { IProvider } from '../types';

export abstract class BaseProvider implements IProvider {
  abstract readonly name: string;
  abstract readonly type: 'communication' | 'ai' | 'calendar' | 'crm' | 'storage' | 'custom';

  protected initialized = false;

  abstract initialize(): Promise<void>;
  abstract dispose(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;

  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`${this.name} provider not initialized. Call initialize() first.`);
    }
  }
}
