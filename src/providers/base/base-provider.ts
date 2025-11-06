/**
 * Base Provider Interface
 * All providers implement this base class
 */

import { IProvider } from '../../types';

export abstract class BaseProvider implements IProvider {
  abstract readonly name: string;
  abstract readonly type: 'ai' | 'api' | 'email' | 'custom';

  protected initialized = false;
  protected config: any; // Typed in subclasses - can be overridden in subclasses

  constructor(config: any) {
    this.config = config;
  }

  abstract initialize(): Promise<void>;
  abstract dispose(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;

  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`${this.name} provider not initialized. Call initialize() first.`);
    }
  }

  /**
   * Get provider configuration
   */
  getConfig(): any {
    return { ...this.config };
  }
}

