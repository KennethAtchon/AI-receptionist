/**
 * KnowledgeBase - Defines what the agent knows
 *
 * The Knowledge pillar encompasses:
 * - Domain expertise
 * - Languages
 * - Known and unknown areas
 * - Knowledge boundaries
 */

import type { KnowledgeConfig, KnowledgeBase, LanguageConfig } from '../types';

export class KnowledgeBaseImpl implements KnowledgeBase {
  private _domain: string;
  private _expertise: string[];
  private _languages: LanguageConfig;
  private _certifications: string[];
  private _industries: string[];
  private _knownDomains: string[];
  private _limitations: string[];
  private _uncertaintyThreshold: string;

  // Readonly getters
  public get domain(): string { return this._domain; }
  public get expertise(): string[] { return [...this._expertise]; }
  public get languages(): LanguageConfig { return { ...this._languages }; }
  public get certifications(): string[] { return [...this._certifications]; }
  public get industries(): string[] { return [...this._industries]; }
  public get knownDomains(): string[] { return [...this._knownDomains]; }
  public get limitations(): string[] { return [...this._limitations]; }
  public get uncertaintyThreshold(): string { return this._uncertaintyThreshold; }

  constructor(config: KnowledgeConfig) {
    this._domain = config.domain;
    this._expertise = config.expertise || [];
    this._languages = this.processLanguages(config.languages);
    this._certifications = config.certifications || [];
    this._industries = config.industries || [];
    this._knownDomains = config.knownDomains || [this._domain];
    this._limitations = config.limitations || [
      'Information outside my domain of expertise',
      'Real-time data I don\'t have access to',
      'Personal opinions or subjective matters'
    ];
    this._uncertaintyThreshold = config.uncertaintyThreshold ||
      'I will say "I don\'t know" when I\'m not confident in my answer or when the question is outside my expertise.';
  }

  /**
   * Process language configuration
   */
  private processLanguages(languages?: string[] | LanguageConfig): LanguageConfig {
    if (!languages) {
      return {
        fluent: ['English'],
        conversational: []
      };
    }

    if (Array.isArray(languages)) {
      return {
        fluent: languages,
        conversational: []
      };
    }

    return {
      fluent: languages.fluent || ['English'],
      conversational: languages.conversational || []
    };
  }

  /**
   * Load knowledge base (placeholder for future RAG integration)
   */
  public async load(): Promise<void> {
    // In the future, this would:
    // - Initialize RAG systems
    // - Cache frequently accessed knowledge
    // For now, it's a no-op
  }

  /**
   * Dispose of knowledge base resources
   */
  public async dispose(): Promise<void> {
    // Cleanup resources when implemented
  }

  /**
   * Convert knowledge to JSON for serialization
   */
  public toJSON(): Record<string, unknown> {
    return {
      domain: this.domain,
      expertise: this.expertise,
      languages: this.languages,
      certifications: this.certifications,
      industries: this.industries,
      knownDomains: this.knownDomains,
      limitations: this.limitations,
      uncertaintyThreshold: this.uncertaintyThreshold
    };
  }

  /**
   * Get knowledge description for system prompts
   */
  public getDescription(): string {
    let description = '## Knowledge & Expertise\n\n';

    description += `### Primary Domain\n`;
    description += `You are an expert in: **${this.domain}**\n\n`;

    if (this.expertise.length > 0) {
      description += `### Areas of Expertise\n`;
      description += this.expertise.map(e => `- ${e}`).join('\n');
      description += '\n\n';
    }

    if (this.industries.length > 0) {
      description += `### Industry Knowledge\n`;
      description += `You have knowledge of: ${this.industries.join(', ')}\n\n`;
    }

    description += `### Languages\n`;
    description += `- Fluent in: ${this.languages.fluent?.join(', ') || 'English'}\n`;
    if (this.languages.conversational && this.languages.conversational.length > 0) {
      description += `- Conversational in: ${this.languages.conversational.join(', ')}\n`;
    }
    description += '\n';

    if (this.certifications.length > 0) {
      description += `### Certifications\n`;
      description += this.certifications.map(c => `- ${c}`).join('\n');
      description += '\n\n';
    }

    description += `### Knowledge Boundaries\n\n`;
    description += `**What you know:**\n`;
    description += this.knownDomains.map(d => `- ${d}`).join('\n');
    description += '\n\n';

    description += `**What you DON'T know (be honest about):**\n`;
    description += this.limitations.map(l => `- ${l}`).join('\n');
    description += '\n\n';

    description += `**When to say "I don't know":**\n`;
    description += this.uncertaintyThreshold;

    return description;
  }

  /**
   * Check if the agent has knowledge in a specific domain
   */
  public hasKnowledge(domain: string): boolean {
    const domainLower = domain.toLowerCase();
    return this.knownDomains.some(d => d.toLowerCase().includes(domainLower)) ||
           this.expertise.some(e => e.toLowerCase().includes(domainLower));
  }

  /**
   * Check if a topic is within limitations
   */
  public isLimitedKnowledge(topic: string): boolean {
    const topicLower = topic.toLowerCase();
    return this.limitations.some(l => l.toLowerCase().includes(topicLower));
  }

  // ==================== UPDATE METHODS ====================

  /**
   * Update the primary domain
   */
  public updateDomain(domain: string): void {
    this._domain = domain;
    // Ensure domain is in knownDomains
    if (!this._knownDomains.includes(domain)) {
      this._knownDomains.push(domain);
    }
  }

  /**
   * Add area of expertise
   */
  public addExpertise(area: string): void {
    if (!this._expertise.includes(area)) {
      this._expertise.push(area);
    }
  }

  /**
   * Remove area of expertise
   */
  public removeExpertise(area: string): void {
    this._expertise = this._expertise.filter(e => e !== area);
  }

  /**
   * Add a language
   */
  public addLanguage(language: string, proficiency: 'fluent' | 'conversational' = 'fluent'): void {
    if (proficiency === 'fluent') {
      if (!this._languages.fluent) {
        this._languages.fluent = [];
      }
      if (!this._languages.fluent.includes(language)) {
        this._languages.fluent.push(language);
      }
    } else {
      if (!this._languages.conversational) {
        this._languages.conversational = [];
      }
      if (!this._languages.conversational.includes(language)) {
        this._languages.conversational.push(language);
      }
    }
  }

  /**
   * Remove a language
   */
  public removeLanguage(language: string): void {
    if (this._languages.fluent) {
      this._languages.fluent = this._languages.fluent.filter(l => l !== language);
    }
    if (this._languages.conversational) {
      this._languages.conversational = this._languages.conversational.filter(l => l !== language);
    }
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

  /**
   * Add industry knowledge
   */
  public addIndustry(industry: string): void {
    if (!this._industries.includes(industry)) {
      this._industries.push(industry);
    }
  }

  /**
   * Remove industry knowledge
   */
  public removeIndustry(industry: string): void {
    this._industries = this._industries.filter(i => i !== industry);
  }

  /**
   * Add known domain
   */
  public addKnownDomain(domain: string): void {
    if (!this._knownDomains.includes(domain)) {
      this._knownDomains.push(domain);
    }
  }

  /**
   * Remove known domain
   */
  public removeKnownDomain(domain: string): void {
    this._knownDomains = this._knownDomains.filter(d => d !== domain);
  }

  /**
   * Add limitation
   */
  public addLimitation(limitation: string): void {
    if (!this._limitations.includes(limitation)) {
      this._limitations.push(limitation);
    }
  }

  /**
   * Remove limitation
   */
  public removeLimitation(limitation: string): void {
    this._limitations = this._limitations.filter(l => l !== limitation);
  }

  /**
   * Update uncertainty threshold
   */
  public updateUncertaintyThreshold(threshold: string): void {
    this._uncertaintyThreshold = threshold;
  }
}
