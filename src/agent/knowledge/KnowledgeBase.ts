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
  public readonly domain: string;
  public readonly expertise: string[];
  public readonly languages: LanguageConfig;
  public readonly certifications: string[];
  public readonly industries: string[];
  public readonly knownDomains: string[];
  public readonly limitations: string[];
  public readonly uncertaintyThreshold: string;

  constructor(config: KnowledgeConfig) {
    this.domain = config.domain;
    this.expertise = config.expertise || [];
    this.languages = this.processLanguages(config.languages);
    this.certifications = config.certifications || [];
    this.industries = config.industries || [];
    this.knownDomains = config.knownDomains || [this.domain];
    this.limitations = config.limitations || [
      'Information outside my domain of expertise',
      'Real-time data I don\'t have access to',
      'Personal opinions or subjective matters'
    ];
    this.uncertaintyThreshold = config.uncertaintyThreshold ||
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
    // - Load knowledge from vector databases
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
}
