/**
 * Skill - Represents a specific capability the agent can execute
 */

import type { Skill as ISkill, SkillDefinition } from '../types';

export class Skill implements ISkill {
  public readonly name: string;
  public readonly description: string;
  public readonly execute: (params: any) => Promise<any>;
  public readonly prerequisites?: string[];

  constructor(definition: SkillDefinition) {
    this.name = definition.name;
    this.description = definition.description;
    this.execute = definition.execute;
    this.prerequisites = definition.prerequisites;
  }

  /**
   * Check if prerequisites are met
   */
  public hasPrerequisites(): boolean {
    return !!this.prerequisites && this.prerequisites.length > 0;
  }

  /**
   * Check if a specific prerequisite is required
   */
  public requiresPrerequisite(prerequisite: string): boolean {
    return !!this.prerequisites?.includes(prerequisite);
  }

  /**
   * Get skill metadata
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      description: this.description,
      prerequisites: this.prerequisites
    };
  }
}
