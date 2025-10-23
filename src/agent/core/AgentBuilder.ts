/**
 * Fluent builder for creating agents with compile-time safety
 *
 * Example usage:
 * ```typescript
 * const agent = Agent.builder()
 *   .withIdentity({ name: 'Sarah', role: 'Sales Rep' })
 *   .withPersonality({ traits: ['empathetic', 'patient'] })
 *   .withCapabilities(['sales', 'scheduling'])
 *   .withProvider(aiProvider)
 *   .build();
 * ```
 */

import type {
  AgentConfiguration,
  IdentityConfig,
  PersonalityConfig,
  KnowledgeConfig,
  MemoryConfig,
  GoalConfig,
  ObservabilityConfig
} from '../types';

import { Agent } from './Agent';

export class AgentBuilder {
  private config: Partial<AgentConfiguration> = {};

  /**
   * Set the agent's identity (REQUIRED)
   */
  public withIdentity(identity: IdentityConfig): this {
    this.config.identity = identity;
    return this;
  }

  /**
   * Set the agent's personality (OPTIONAL)
   */
  public withPersonality(personality: PersonalityConfig): this {
    this.config.personality = personality;
    return this;
  }

  /**
   * Set the agent's knowledge base (OPTIONAL)
   */
  public withKnowledge(knowledge: KnowledgeConfig): this {
    this.config.knowledge = knowledge;
    return this;
  }


  /**
   * Set the agent's memory configuration (OPTIONAL)
   */
  public withMemory(memory: MemoryConfig): this {
    this.config.memory = memory;
    return this;
  }

  /**
   * Set the agent's goals (OPTIONAL)
   */
  public withGoals(goals: GoalConfig): this {
    this.config.goals = goals;
    return this;
  }

  /**
   * Set the agent's tools (OPTIONAL)
   */
  public withTools(tools: any[]): this {
    this.config.tools = tools;
    return this;
  }

  /**
   * Set the AI provider (REQUIRED)
   */
  public withProvider(provider: any): this {
    this.config.aiProvider = provider;
    return this;
  }

  /**
   * Alias for withProvider for clarity
   */
  public withAIProvider(provider: any): this {
    return this.withProvider(provider);
  }


  /**
   * Set the tool registry (OPTIONAL - source of truth for available tools)
   */
  public withToolRegistry(registry: any): this {
    (this.config as any).toolRegistry = registry;
    return this;
  }

  /**
   * Set the conversation service (OPTIONAL - for integration with existing SDK)
   */
  public withConversationService(service: any): this {
    (this.config as any).conversationService = service;
    return this;
  }

  /**
   * Set observability configuration (OPTIONAL)
   */
  public withObservability(config: ObservabilityConfig): this {
    this.config.observability = config;
    return this;
  }

  /**
   * Create a new builder instance
   */
  public static create(): AgentBuilder {
    return new AgentBuilder();
  }

  /**
   * Build and validate the agent
   */
  public build(): Agent {
    this.validate();
    return new (Agent as any)(this.config as AgentConfiguration);
  }

  /**
   * Validate required configuration
   */
  private validate(): void {
    const errors: string[] = [];

    if (!this.config.identity) {
      errors.push('Agent identity is required. Use .withIdentity()');
    }

    if (!this.config.aiProvider) {
      errors.push('AI provider is required. Use .withProvider()');
    }

    // Validate identity fields
    if (this.config.identity) {
      if (!this.config.identity.name) {
        errors.push('Identity.name is required');
      }
      if (!this.config.identity.role) {
        errors.push('Identity.role is required');
      }
    }

    // Validate personality if provided
    if (this.config.personality) {
      // Personality is optional, but if provided, validate structure
      // All fields are optional, so no required validation needed
    }

    // Validate knowledge if provided
    if (this.config.knowledge && !this.config.knowledge.domain) {
      errors.push('Knowledge.domain is required when knowledge is provided');
    }

    // Validate memory configuration
    if (this.config.memory) {
      if (this.config.memory.vectorEnabled && !this.config.memory.vectorStore) {
        errors.push('Vector store is required when vectorEnabled is true');
      }
      if (this.config.memory.longTermEnabled && !this.config.memory.longTermStorage) {
        errors.push('Long-term storage is required when longTermEnabled is true');
      }
    }

    if (errors.length > 0) {
      throw new AgentBuilderValidationError(
        `Agent configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`
      );
    }
  }
}

/**
 * Custom error for agent builder validation failures
 */
export class AgentBuilderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentBuilderValidationError';
    Error.captureStackTrace(this, this.constructor);
  }
}
