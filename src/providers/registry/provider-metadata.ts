/**
 * Provider Metadata System
 * Defines metadata for provider auto-discovery and registration
 */

import type { IProvider } from '../../types';
import type { ICredentialValidator } from '../validation/credential-validator.interface';

/**
 * Metadata for a provider
 * Contains all information needed to register and load a provider
 */
export interface ProviderMetadata {
  // Provider identification
  name: string;
  type: 'ai' | 'api' | 'email' | 'custom';
  category: 'ai' | 'email' | 'twilio' | 'google';
  
  // Dynamic loading
  factory: () => Promise<{ default: new (...args: any[]) => IProvider }>;
  validatorFactory: () => Promise<{ default: new () => ICredentialValidator }>;
  
  // Configuration
  configPath: string;  // e.g., 'providers.twilio' or 'model'
  configKey?: string;  // e.g., 'twilio' (optional, defaults to name)
  required: boolean;    // Whether this provider is required
  
  // Dependencies
  dependsOn?: string[];  // Other provider names this depends on
}

