/**
 * CapabilityManager - Manages agent capabilities and skills
 *
 * The Capability pillar encompasses:
 * - High-level capabilities
 * - Individual skills
 * - Tool access and management
 * - Channel-specific functionality
 */

import type { CapabilityManager as ICapabilityManager, Capability, Skill, Channel } from '../types';
import { CapabilityNotFoundError, SkillNotFoundError } from '../errors/CapabilityErrors';

export class CapabilityManagerImpl implements ICapabilityManager {
  private skills: Map<string, Skill> = new Map();
  private capabilities: Map<string, Capability> = new Map();

  /**
   * Initialize the capability manager
   */
  public async initialize(): Promise<void> {
    // Future: Load capabilities from configuration
    // For now, capabilities are registered via register()
  }

  /**
   * Register a capability
   */
  public register(capability: Capability): void {
    this.capabilities.set(capability.name, capability);

    // Register associated skills
    for (const skill of capability.skills) {
      this.skills.set(skill.name, skill);
    }
  }

  /**
   * Check if agent has a capability
   */
  public has(capabilityName: string): boolean {
    return this.capabilities.has(capabilityName);
  }

  /**
   * Get a capability by name
   */
  public get(capabilityName: string): Capability | undefined {
    return this.capabilities.get(capabilityName);
  }

  /**
   * Get all registered capabilities
   */
  public getAll(): Capability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Get tools available for a specific channel
   */
  public getTools(channel: Channel): any[] {
    const tools: any[] = [];

    for (const capability of this.capabilities.values()) {
      if (capability.supportedChannels.includes(channel)) {
        tools.push(...capability.tools);
      }
    }

    // Remove duplicates
    return Array.from(new Set(tools));
  }

  /**
   * List all capability names
   */
  public list(): string[] {
    return Array.from(this.capabilities.keys());
  }

  /**
   * Count total capabilities
   */
  public count(): number {
    return this.capabilities.size;
  }

  /**
   * Count total skills
   */
  public countSkills(): number {
    return this.skills.size;
  }

  /**
   * Execute a skill by name
   */
  public async execute(skillName: string, params: any): Promise<any> {
    const skill = this.skills.get(skillName);

    if (!skill) {
      throw new SkillNotFoundError(
        `Skill '${skillName}' not found. Available skills: ${Array.from(this.skills.keys()).join(', ')}`
      );
    }

    // Check prerequisites
    if (skill.prerequisites && skill.prerequisites.length > 0) {
      for (const prereq of skill.prerequisites) {
        if (!this.skills.has(prereq)) {
          throw new Error(
            `Skill '${skillName}' requires prerequisite skill '${prereq}' which is not registered`
          );
        }
      }
    }

    return skill.execute(params);
  }

  /**
   * Get all skills for a capability
   */
  public getSkills(capabilityName: string): Skill[] {
    const capability = this.capabilities.get(capabilityName);

    if (!capability) {
      throw new CapabilityNotFoundError(
        `Capability '${capabilityName}' not found. Available capabilities: ${this.list().join(', ')}`
      );
    }

    return capability.skills;
  }

  /**
   * Check if a skill exists
   */
  public hasSkill(skillName: string): boolean {
    return this.skills.has(skillName);
  }

  /**
   * Get capability description for system prompts
   */
  public getDescription(): string {
    if (this.capabilities.size === 0) {
      return '## Capabilities\n\nNo specific capabilities configured.';
    }

    let description = '## Capabilities\n\n';
    description += 'You have the following capabilities:\n\n';

    for (const capability of this.capabilities.values()) {
      description += `### ${capability.name}\n`;
      description += `${capability.description}\n\n`;

      if (capability.skills.length > 0) {
        description += '**Skills:**\n';
        for (const skill of capability.skills) {
          description += `- **${skill.name}**: ${skill.description}\n`;
        }
        description += '\n';
      }

      description += `**Available on:** ${capability.supportedChannels.join(', ')}\n\n`;
    }

    return description;
  }

  /**
   * Convert to JSON for serialization
   */
  public toJSON(): Record<string, unknown> {
    return {
      capabilities: Array.from(this.capabilities.values()).map(c => c.toJSON()),
      totalSkills: this.skills.size
    };
  }
}
