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

export { Identity };

export class IdentityImpl implements Identity {
  private _name: string;
  private _role: string;
  private _title: string;
  private _backstory: string;
  private _department?: string;
  private _reportsTo?: string;
  private _authorityLevel: 'low' | 'medium' | 'high';
  private _escalationRules: string[];
  private _yearsOfExperience: number;
  private _specializations: string[];
  private _certifications: string[];

  // Readonly getters
  public get name(): string { return this._name; }
  public get role(): string { return this._role; }
  public get title(): string { return this._title; }
  public get backstory(): string { return this._backstory; }
  public get department(): string | undefined { return this._department; }
  public get reportsTo(): string | undefined { return this._reportsTo; }
  public get authorityLevel(): 'low' | 'medium' | 'high' { return this._authorityLevel; }
  public get escalationRules(): string[] { return [...this._escalationRules]; }
  public get yearsOfExperience(): number { return this._yearsOfExperience; }
  public get specializations(): string[] { return [...this._specializations]; }
  public get certifications(): string[] { return [...this._certifications]; }

  constructor(config: IdentityConfig) {
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Identity name is required');
    }
    if (!config.role || config.role.trim().length === 0) {
      throw new Error('Identity role is required');
    }

    this._name = config.name.trim();
    this._role = config.role.trim();
    this._title = config.title?.trim() || config.role.trim();
    this._backstory = config.backstory?.trim() || `I am ${config.name}, working as ${config.role}.`;
    this._department = config.department?.trim();
    this._reportsTo = config.reportsTo?.trim();
    this._authorityLevel = config.authorityLevel || 'medium';
    this._escalationRules = config.escalationRules || [
      'Complex technical issues beyond my expertise',
      'Requests requiring management approval',
      'Complaints or sensitive situations'
    ];
    this._yearsOfExperience = Math.max(0, config.yearsOfExperience || 5);
    this._specializations = config.specializations || [];
    this._certifications = config.certifications || [];
  }

  // ==================== PUBLIC GETTER METHODS ====================

  /**
   * Get a summary of the agent's identity
   */
  public summary(): string {
    return `${this.name} (${this.title})`;
  }

  // ==================== UPDATE METHODS ====================

  /**
   * Update the agent's name
   */
  public updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Name cannot be empty');
    }
    this._name = name.trim();
  }

  /**
   * Update the agent's role
   */
  public updateRole(role: string): void {
    if (!role || role.trim().length === 0) {
      throw new Error('Role cannot be empty');
    }
    // Save old role before updating
    const oldRole = this._role;
    this._role = role.trim();
    // Also update title if it was auto-generated from role
    if (this._title === oldRole) {
      this._title = role.trim();
    }
  }

  /**
   * Update the agent's title
   */
  public updateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error('Title cannot be empty');
    }
    this._title = title.trim();
  }

  /**
   * Update the agent's backstory
   */
  public updateBackstory(backstory: string): void {
    this._backstory = backstory;
  }

  /**
   * Update the agent's department
   */
  public updateDepartment(department: string): void {
    this._department = department;
  }

  /**
   * Update who the agent reports to
   */
  public updateReportsTo(reportsTo: string): void {
    this._reportsTo = reportsTo;
  }

  /**
   * Set authority level
   */
  public setAuthorityLevel(level: 'low' | 'medium' | 'high'): void {
    this._authorityLevel = level;
  }

  /**
   * Add escalation rule
   */
  public addEscalationRule(rule: string): void {
    if (!this._escalationRules.includes(rule)) {
      this._escalationRules.push(rule);
    }
  }

  /**
   * Remove escalation rule
   */
  public removeEscalationRule(rule: string): void {
    this._escalationRules = this._escalationRules.filter(r => r !== rule);
  }

  /**
   * Set years of experience
   */
  public setYearsOfExperience(years: number): void {
    this._yearsOfExperience = Math.max(0, years);
  }

  /**
   * Add specialization
   */
  public addSpecialization(specialization: string): void {
    if (!this._specializations.includes(specialization)) {
      this._specializations.push(specialization);
    }
  }

  /**
   * Remove specialization
   */
  public removeSpecialization(specialization: string): void {
    this._specializations = this._specializations.filter(s => s !== specialization);
  }

  /**
   * Add certification
   */
  public addCertification(certification: string): void {
    if (!this._certifications.includes(certification)) {
      this._certifications.push(certification);
    }
  }

  /**
   * Remove certification
   */
  public removeCertification(certification: string): void {
    this._certifications = this._certifications.filter(c => c !== certification);
  }

  // ==================== UTILITY METHODS ====================

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
    let description = '# IDENTITY & ROLE\n\n';
    description += `You are ${this.name}, ${this.title}.\n\n`;

    if (this.backstory) {
      description += `## Background\n${this.backstory}\n\n`;
    }

    description += `## Role & Responsibilities\n`;
    description += `- Primary Role: ${this.role}\n`;
    if (this.department) {
      description += `- Department: ${this.department}\n`;
    }
    if (this.reportsTo) {
      description += `- Reporting Structure: ${this.reportsTo}\n`;
    }
    description += '\n';

    description += `## Authority Level\n`;
    description += `- Decision-making authority: ${this.authorityLevel}\n`;
    if (this.escalationRules.length > 0) {
      description += `- Escalation triggers: ${this.escalationRules.join(', ')}\n`;
    }
    description += '\n';

    if (this.yearsOfExperience > 0 || this.specializations.length > 0 || this.certifications.length > 0) {
      description += `## Professional Context\n`;
      if (this.yearsOfExperience > 0) {
        description += `- Experience: ${this.yearsOfExperience} years\n`;
      }
      if (this.specializations.length > 0) {
        description += `- Specializations: ${this.specializations.join(', ')}\n`;
      }
      if (this.certifications.length > 0) {
        description += `- Certifications: ${this.certifications.join(', ')}\n`;
      }
    }

    return description.trim();
  }
}
