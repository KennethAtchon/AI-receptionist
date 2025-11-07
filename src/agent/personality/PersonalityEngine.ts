/**
 * PersonalityEngine - Defines how the agent behaves
 *
 * The Personality pillar encompasses:
 * - Core traits
 * - Communication style
 * - Emotional intelligence
 * - Adaptability and responses
 */

import type {
  PersonalityConfig,
  PersonalityEngine,
  PersonalityTrait,
  CommunicationStyleConfig,
  Channel
} from '../types';

export class PersonalityEngineImpl implements PersonalityEngine {
  private _traits: PersonalityTrait[];
  private _communicationStyle: CommunicationStyleConfig;
  private _tone: string;
  private _formalityLevel: number;
  private _emotionalIntelligence: 'low' | 'medium' | 'high';
  private _adaptability: 'low' | 'medium' | 'high';
  private _conflictStyle: string;
  private _decisionStyle: string;
  private _stressResponse: string;
  private _adaptabilityRules: string[];

  // Readonly getters
  public get traits(): PersonalityTrait[] { return [...this._traits]; }
  public get communicationStyle(): CommunicationStyleConfig { return { ...this._communicationStyle }; }
  public get tone(): string { return this._tone; }
  public get formalityLevel(): number { return this._formalityLevel; }
  public get emotionalIntelligence(): 'low' | 'medium' | 'high' { return this._emotionalIntelligence; }
  public get adaptability(): 'low' | 'medium' | 'high' { return this._adaptability; }
  public get conflictStyle(): string { return this._conflictStyle; }
  public get decisionStyle(): string { return this._decisionStyle; }
  public get stressResponse(): string { return this._stressResponse; }
  public get adaptabilityRules(): string[] { return [...this._adaptabilityRules]; }

  constructor(config: PersonalityConfig) {
    // Process traits
    this._traits = this.processTraits(config.traits || ['professional', 'helpful', 'patient']);

    // Process communication style
    this._communicationStyle = this.processCommunicationStyle(config.communicationStyle);
    this._tone = this._communicationStyle.tone || 'professional';
    this._formalityLevel = this._communicationStyle.formalityLevel || 7;

    // Set behavioral attributes
    this._emotionalIntelligence = config.emotionalIntelligence || 'high';
    this._adaptability = config.adaptability || 'high';
    this._conflictStyle = config.conflictStyle || 'collaborative';
    this._decisionStyle = config.decisionStyle || 'analytical';
    this._stressResponse = config.stressResponse || 'remain calm and focused';

    // Set adaptability rules
    this._adaptabilityRules = config.adaptabilityRules || [
      'Mirror the user\'s formality level',
      'Increase empathy when detecting frustration',
      'Simplify language when detecting confusion',
      'Be more direct when detecting urgency'
    ];
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Process traits from config
   */
  private processTraits(traits: string[] | PersonalityTrait[]): PersonalityTrait[] {
    if (traits.length === 0) {
      return [];
    }

    // If first element is a string, convert all to PersonalityTrait objects
    if (typeof traits[0] === 'string') {
      return (traits as string[]).map(trait => ({
        name: trait,
        description: this.getTraitDescription(trait),
        weight: 1
      }));
    }

    return traits as PersonalityTrait[];
  }

  /**
   * Get default description for common traits
   */
  private getTraitDescription(trait: string): string {
    const descriptions: Record<string, string> = {
      'professional': 'Maintains professionalism in all interactions',
      'helpful': 'Eager to assist and provide value',
      'patient': 'Takes time to understand and explain thoroughly',
      'empathetic': 'Shows understanding and compassion',
      'analytical': 'Takes a logical, data-driven approach',
      'enthusiastic': 'Brings positive energy to conversations',
      'consultative': 'Asks questions to understand needs deeply',
      'assertive': 'Confident and direct in communication',
      'friendly': 'Warm and approachable',
      'detail-oriented': 'Pays attention to specifics and accuracy'
    };

    return descriptions[trait.toLowerCase()] || `Demonstrates ${trait} in interactions`;
  }

  /**
   * Process communication style from config
   */
  private processCommunicationStyle(
    style?: string | CommunicationStyleConfig
  ): CommunicationStyleConfig {
    if (!style) {
      return {
        primary: 'consultative',
        tone: 'professional',
        formalityLevel: 7
      };
    }

    if (typeof style === 'string') {
      // Map string style to valid tone values
      const toneMap: Record<string, 'casual' | 'formal' | 'friendly' | 'professional'> = {
        'casual': 'casual',
        'friendly': 'friendly',
        'professional': 'professional',
        'formal': 'formal',
        'consultative': 'professional',
        'empathetic': 'friendly',
        'analytical': 'professional',
        'assertive': 'professional'
      };

      return {
        primary: style as 'consultative' | 'assertive' | 'empathetic' | 'analytical' | 'casual',
        tone: toneMap[style.toLowerCase()] || 'professional',
        formalityLevel: this.getDefaultFormalityLevel(style)
      };
    }

    return {
      primary: style.primary || 'consultative',
      tone: style.tone || 'professional',
      formalityLevel: style.formalityLevel || 7
    };
  }

  /**
   * Get default formality level for a communication style
   */
  private getDefaultFormalityLevel(style: string): number {
    const levels: Record<string, number> = {
      'casual': 3,
      'friendly': 5,
      'professional': 7,
      'formal': 9,
      'consultative': 7,
      'empathetic': 6,
      'analytical': 8,
      'assertive': 6
    };

    return levels[style.toLowerCase()] || 7;
  }

  // ==================== PUBLIC GETTER METHODS ====================

  /**
   * Get error message based on channel and personality
   */
  public getErrorMessage(channel: Channel): string {
    const messages: Record<Channel, string> = {
      call: this.getCallErrorMessage(),
      sms: this.getSmsErrorMessage(),
      email: this.getEmailErrorMessage(),
      text: this.getDefaultErrorMessage()
    };

    return messages[channel] || this.getDefaultErrorMessage();
  }

  private getCallErrorMessage(): string {
    if (this.formalityLevel >= 8) {
      return "I apologize, but I'm experiencing a technical difficulty at the moment. Would you mind if I have someone call you back shortly?";
    } else if (this.formalityLevel <= 4) {
      return "Oops! I'm having a bit of trouble right now. Can I have someone get back to you in a few minutes?";
    } else {
      return "I'm sorry, but I'm experiencing a technical issue. Let me have someone reach out to you shortly to help.";
    }
  }

  private getSmsErrorMessage(): string {
    if (this.formalityLevel >= 8) {
      return "We apologize for the inconvenience. Our system is experiencing difficulties. A team member will contact you shortly.";
    } else {
      return "Sorry, we're having technical issues. Someone will text you back soon!";
    }
  }

  private getEmailErrorMessage(): string {
    return `Dear Valued Customer,\n\nWe apologize for any inconvenience. Our system is currently experiencing technical difficulties.\n\nA member of our team will reach out to you shortly to assist with your request.\n\nThank you for your patience and understanding.\n\nBest regards,\n${this.tone === 'formal' ? 'Customer Service Team' : 'The Team'}`;
  }

  private getDefaultErrorMessage(): string {
    return "I apologize, but I'm experiencing technical difficulties. Please try again in a moment, or contact support if the issue persists.";
  }

  // ==================== UPDATE METHODS ====================

  /**
   * Add a new personality trait
   */
  public addTrait(trait: string | PersonalityTrait): void {
    const newTrait: PersonalityTrait = typeof trait === 'string'
      ? { name: trait, description: this.getTraitDescription(trait), weight: 1 }
      : trait;

    // Check if trait already exists
    const exists = this._traits.some(t => t.name.toLowerCase() === newTrait.name.toLowerCase());
    if (!exists) {
      this._traits.push(newTrait);
    }
  }

  /**
   * Remove a personality trait by name
   */
  public removeTrait(traitName: string): void {
    this._traits = this._traits.filter(t => t.name.toLowerCase() !== traitName.toLowerCase());
  }

  /**
   * Update a personality trait
   */
  public updateTrait(traitName: string, updates: Partial<PersonalityTrait>): void {
    const trait = this._traits.find(t => t.name.toLowerCase() === traitName.toLowerCase());
    if (trait) {
      Object.assign(trait, updates);
    }
  }

  /**
   * Update communication style
   */
  public updateCommunicationStyle(style: Partial<CommunicationStyleConfig>): void {
    this._communicationStyle = { ...this._communicationStyle, ...style };
    if (style.tone) {
      this._tone = style.tone;
    }
    if (style.formalityLevel !== undefined) {
      this._formalityLevel = style.formalityLevel;
    }
  }

  /**
   * Update formality level
   */
  public setFormalityLevel(level: number): void {
    if (typeof level !== 'number' || isNaN(level)) {
      throw new Error('Formality level must be a number');
    }
    this._formalityLevel = Math.max(1, Math.min(10, level)); // Clamp between 1-10
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Convert personality to JSON for serialization
   */
  public toJSON(): Record<string, unknown> {
    return {
      traits: this.traits,
      communicationStyle: this.communicationStyle,
      tone: this.tone,
      formalityLevel: this.formalityLevel,
      emotionalIntelligence: this.emotionalIntelligence,
      adaptability: this.adaptability,
      conflictStyle: this.conflictStyle,
      decisionStyle: this.decisionStyle,
      stressResponse: this.stressResponse,
      adaptabilityRules: this.adaptabilityRules
    };
  }

  /**
   * Get personality description for system prompts
   */
  public getDescription(): string {
    let description = '# PERSONALITY & COMMUNICATION STYLE\n\n';

    description += '## Core Traits\n';
    for (const trait of this.traits) {
      description += `- ${trait.name}: ${trait.description}\n`;
    }
    description += '\n';

    description += `## Communication Style\n`;
    description += `- Primary Style: ${this.communicationStyle.primary}\n`;
    description += `- Tone: ${this.tone}\n`;
    description += `- Formality Level: ${this.formalityLevel}/10\n`;
    description += `- Emotional Intelligence: ${this.emotionalIntelligence}\n`;
    description += '\n';

    description += `## Behavioral Patterns\n`;
    description += `- Response to conflict: ${this.conflictStyle}\n`;
    description += `- Decision-making approach: ${this.decisionStyle}\n`;
    description += `- Stress response: ${this.stressResponse}\n`;
    description += '\n';

    if (this.adaptabilityRules.length > 0) {
      description += `## Adaptability\n`;
      for (const rule of this.adaptabilityRules) {
        description += `- ${rule}\n`;
      }
    }

    return description.trim();
  }
}
