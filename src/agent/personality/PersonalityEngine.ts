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
  public readonly traits: PersonalityTrait[];
  public readonly communicationStyle: CommunicationStyleConfig;
  public readonly tone: string;
  public readonly formalityLevel: number;
  public readonly emotionalIntelligence: 'low' | 'medium' | 'high';
  public readonly adaptability: 'low' | 'medium' | 'high';
  public readonly conflictStyle: string;
  public readonly decisionStyle: string;
  public readonly stressResponse: string;
  public readonly adaptabilityRules: string[];

  constructor(config: PersonalityConfig) {
    // Process traits
    this.traits = this.processTraits(config.traits || ['professional', 'helpful', 'patient']);

    // Process communication style
    this.communicationStyle = this.processCommunicationStyle(config.communicationStyle);
    this.tone = this.communicationStyle.tone || 'professional';
    this.formalityLevel = this.communicationStyle.formalityLevel || 7;

    // Set behavioral attributes
    this.emotionalIntelligence = config.emotionalIntelligence || 'high';
    this.adaptability = config.adaptability || 'high';
    this.conflictStyle = config.conflictStyle || 'collaborative';
    this.decisionStyle = config.decisionStyle || 'analytical';
    this.stressResponse = config.stressResponse || 'remain calm and focused';

    // Set adaptability rules
    this.adaptabilityRules = config.adaptabilityRules || [
      'Mirror the user\'s formality level',
      'Increase empathy when detecting frustration',
      'Simplify language when detecting confusion',
      'Be more direct when detecting urgency'
    ];
  }

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
        primary: 'professional',
        tone: 'professional',
        formalityLevel: 7
      };
    }

    if (typeof style === 'string') {
      return {
        primary: style as any,
        tone: style,
        formalityLevel: this.getDefaultFormalityLevel(style)
      };
    }

    return {
      primary: style.primary || 'professional',
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

  /**
   * Get error message based on channel and personality
   */
  public getErrorMessage(channel: Channel): string {
    const messages: Record<Channel, string> = {
      call: this.getCallErrorMessage(),
      sms: this.getSmsErrorMessage(),
      email: this.getEmailErrorMessage()
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
    let description = '## Personality\n\n';

    description += '### Core Traits\n';
    description += this.traits.map(t => `- **${t.name}**: ${t.description}`).join('\n');

    description += '\n\n### Communication Style\n';
    description += `- Primary Style: ${this.communicationStyle.primary}\n`;
    description += `- Tone: ${this.tone}\n`;
    description += `- Formality Level: ${this.formalityLevel}/10\n`;

    description += '\n\n### Emotional Intelligence\n';
    description += `You have ${this.emotionalIntelligence} emotional intelligence. `;
    if (this.emotionalIntelligence === 'high') {
      description += 'You are highly attuned to emotional cues and respond with appropriate empathy.';
    }

    description += '\n\n### Adaptability\n';
    description += `Your adaptability level is ${this.adaptability}.\n`;
    description += this.adaptabilityRules.map(rule => `- ${rule}`).join('\n');

    description += '\n\n### Behavioral Patterns\n';
    description += `- Conflict Resolution: ${this.conflictStyle}\n`;
    description += `- Decision Making: ${this.decisionStyle}\n`;
    description += `- Under Stress: ${this.stressResponse}\n`;

    return description;
  }
}
