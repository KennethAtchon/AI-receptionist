/**
 * Capability - Represents a high-level capability composed of skills
 *
 * Note: Tools are managed separately by ToolRegistry.
 * Capabilities describe WHAT the agent can do conceptually.
 * Tools in ToolRegistry are HOW the agent does it at runtime.
 */

import type { Capability as ICapability, Channel, Skill } from '../types';

export class Capability implements ICapability {
  public readonly name: string;
  public readonly description: string;
  public readonly skills: Skill[];
  public readonly supportedChannels: Channel[];

  constructor(
    name: string,
    description: string,
    skills: Skill[],
    supportedChannels: Channel[]
  ) {
    this.name = name;
    this.description = description;
    this.skills = skills;
    this.supportedChannels = supportedChannels;
  }

  /**
   * Check if capability is available on a specific channel
   */
  public isAvailableOn(channel: Channel): boolean {
    return this.supportedChannels.includes(channel);
  }

  /**
   * Get all skill names
   */
  public getSkillNames(): string[] {
    return this.skills.map(s => s.name);
  }

  /**
   * Find a skill by name
   */
  public findSkill(skillName: string): Skill | undefined {
    return this.skills.find(s => s.name === skillName);
  }

  /**
   * Get capability metadata
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      description: this.description,
      skills: this.skills.map(s => ({
        name: s.name,
        description: s.description
      })),
      skillCount: this.skills.length,
      supportedChannels: this.supportedChannels
    };
  }
}
