/**
 * Identity - Defines who the agent is
 *
 * The Identity pillar encompasses:
 * - Name and role
 * - Professional background
 * - Authority and decision-making power
 * - Specializations and expertise
 */

import type { IdentityConfig, Identity } from '../types';

export class IdentityImpl implements Identity {
  public readonly name: string;
  public readonly role: string;
  public readonly title: string;
  public readonly backstory: string;
  public readonly department?: string;
  public readonly reportsTo?: string;
  public readonly authorityLevel: 'low' | 'medium' | 'high';
  public readonly escalationRules: string[];
  public readonly yearsOfExperience: number;
  public readonly specializations: string[];
  public readonly certifications: string[];

  constructor(config: IdentityConfig) {
    this.name = config.name;
    this.role = config.role;
    this.title = config.title || config.role;
    this.backstory = config.backstory || `I am ${config.name}, working as ${config.role}.`;
    this.department = config.department;
    this.reportsTo = config.reportsTo;
    this.authorityLevel = config.authorityLevel || 'medium';
    this.escalationRules = config.escalationRules || [
      'Complex technical issues beyond my expertise',
      'Requests requiring management approval',
      'Complaints or sensitive situations'
    ];
    this.yearsOfExperience = config.yearsOfExperience || 5;
    this.specializations = config.specializations || [];
    this.certifications = config.certifications || [];
  }

  /**
   * Get a summary of the agent's identity
   */
  public summary(): string {
    return `${this.name} (${this.title})`;
  }

  /**
   * Convert identity to JSON for serialization
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      role: this.role,
      title: this.title,
      backstory: this.backstory,
      department: this.department,
      reportsTo: this.reportsTo,
      authorityLevel: this.authorityLevel,
      escalationRules: this.escalationRules,
      yearsOfExperience: this.yearsOfExperience,
      specializations: this.specializations,
      certifications: this.certifications
    };
  }

  /**
   * Get full identity description for system prompts
   */
  public getDescription(): string {
    let description = `You are ${this.name}, ${this.title}.`;

    if (this.backstory) {
      description += `\n\n${this.backstory}`;
    }

    if (this.yearsOfExperience > 0) {
      description += `\n\nYou have ${this.yearsOfExperience} years of experience in this role.`;
    }

    if (this.specializations.length > 0) {
      description += `\n\nYour specializations include: ${this.specializations.join(', ')}.`;
    }

    if (this.certifications.length > 0) {
      description += `\n\nYou hold the following certifications: ${this.certifications.join(', ')}.`;
    }

    if (this.department) {
      description += `\n\nYou work in the ${this.department} department`;
      if (this.reportsTo) {
        description += `, reporting to ${this.reportsTo}`;
      }
      description += '.';
    }

    description += `\n\nYour authority level is ${this.authorityLevel}.`;

    if (this.escalationRules.length > 0) {
      description += `\n\nYou should escalate to a human supervisor when:\n${this.escalationRules.map(rule => `- ${rule}`).join('\n')}`;
    }

    return description;
  }
}
