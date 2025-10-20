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
    this._name = config.name;
    this._role = config.role;
    this._title = config.title || config.role;
    this._backstory = config.backstory || `I am ${config.name}, working as ${config.role}.`;
    this._department = config.department;
    this._reportsTo = config.reportsTo;
    this._authorityLevel = config.authorityLevel || 'medium';
    this._escalationRules = config.escalationRules || [
      'Complex technical issues beyond my expertise',
      'Requests requiring management approval',
      'Complaints or sensitive situations'
    ];
    this._yearsOfExperience = config.yearsOfExperience || 5;
    this._specializations = config.specializations || [];
    this._certifications = config.certifications || [];
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

  // ==================== UPDATE METHODS ====================

  /**
   * Update the agent's name
   */
  public updateName(name: string): void {
    this._name = name;
  }

  /**
   * Update the agent's role
   */
  public updateRole(role: string): void {
    this._role = role;
    // Also update title if it was auto-generated from role
    if (this._title === this._role) {
      this._title = role;
    }
  }

  /**
   * Update the agent's title
   */
  public updateTitle(title: string): void {
    this._title = title;
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
}
