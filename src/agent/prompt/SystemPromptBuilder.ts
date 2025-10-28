/**
 * SystemPromptBuilder - Creates optimized, hierarchical system prompts
 *
 * This builder constructs system prompts from the five core agent pillars:
 * 1. Identity - Who the agent is
 * 2. Personality - How the agent behaves
 * 3. Knowledge - What the agent knows
 * 4. Memory - What the agent remembers (context)
 * 5. Goals - What the agent aims to achieve
 */

import type {
  PromptContext,
  PromptSection,
  Identity,
  PersonalityEngine,
  KnowledgeBase,
  Goal,
  Channel,
  PromptExample
} from '../types';

export class SystemPromptBuilder {
  /**
   * Build a complete, optimized system prompt from the agent's pillars
   */
  public async build(context: PromptContext): Promise<string> {
    const sections: PromptSection[] = [];

    // 1. IDENTITY & ROLE (highest priority)
    if (context.identity) {
      sections.push(this.buildIdentitySection(context.identity));
    }

    // 2. PERSONALITY & COMMUNICATION
    if (context.personality) {
      sections.push(this.buildPersonalitySection(context.personality));
    }

    // 3. KNOWLEDGE & EXPERTISE
    if (context.knowledge) {
      sections.push(this.buildKnowledgeSection(context.knowledge));
    }

    // 4. GOALS & OBJECTIVES
    if (context.goals && context.goals.length > 0) {
      sections.push(this.buildGoalsSection(context.goals));
    }

    // 5. DECISION-MAKING PRINCIPLES
    sections.push(this.buildDecisionPrinciplesSection());

    // 6. COMMUNICATION GUIDELINES (channel-specific)
    if (context.channel) {
      sections.push(this.buildCommunicationSection(context.channel));
    }

    // 7. BUSINESS CONTEXT (domain-specific data)
    if (context.businessContext) {
      sections.push(this.buildBusinessContextSection(context.businessContext));
    }

    // 8. CONSTRAINTS & BOUNDARIES
    sections.push(this.buildConstraintsSection(context));

    // 9. ERROR HANDLING
    sections.push(this.buildErrorHandlingSection());

    // 10. EXAMPLES (few-shot learning)
    if (context.examples && context.examples.length > 0) {
      sections.push(this.buildExamplesSection(context.examples));
    }

    // Assemble and return
    return this.assemble(sections);
  }

  /**
   * Build IDENTITY section
   */
  private buildIdentitySection(identity: Identity): PromptSection {
    let content = '# IDENTITY & ROLE\n\n';
    content += `You are ${identity.name}, ${identity.title}.\n\n`;

    if (identity.backstory) {
      content += `## Background\n${identity.backstory}\n\n`;
    }

    content += `## Role & Responsibilities\n`;
    content += `- Primary Role: ${identity.role}\n`;
    if (identity.department) {
      content += `- Department: ${identity.department}\n`;
    }
    if (identity.reportsTo) {
      content += `- Reporting Structure: ${identity.reportsTo}\n`;
    }
    content += '\n';

    content += `## Authority Level\n`;
    content += `- Decision-making authority: ${identity.authorityLevel}\n`;
    if (identity.escalationRules.length > 0) {
      content += `- Escalation triggers: ${identity.escalationRules.join(', ')}\n`;
    }
    content += '\n';

    if (identity.yearsOfExperience || identity.specializations.length > 0 || identity.certifications.length > 0) {
      content += `## Professional Context\n`;
      if (identity.yearsOfExperience) {
        content += `- Experience: ${identity.yearsOfExperience} years\n`;
      }
      if (identity.specializations.length > 0) {
        content += `- Specializations: ${identity.specializations.join(', ')}\n`;
      }
      if (identity.certifications.length > 0) {
        content += `- Certifications: ${identity.certifications.join(', ')}\n`;
      }
    }

    return {
      name: 'IDENTITY',
      priority: 10,
      content: content.trim()
    };
  }

  /**
   * Build PERSONALITY section
   */
  private buildPersonalitySection(personality: PersonalityEngine): PromptSection {
    let content = '# PERSONALITY & COMMUNICATION STYLE\n\n';

    content += `## Core Traits\n`;
    for (const trait of personality.traits) {
      content += `- ${trait.name}: ${trait.description}\n`;
    }
    content += '\n';

    content += `## Communication Style\n`;
    content += `- Primary Style: ${personality.communicationStyle.primary}\n`;
    content += `- Tone: ${personality.tone}\n`;
    content += `- Formality Level: ${personality.formalityLevel}/10\n`;
    content += `- Emotional Intelligence: ${personality.emotionalIntelligence}\n`;
    content += '\n';

    content += `## Behavioral Patterns\n`;
    content += `- Response to conflict: ${personality.conflictStyle}\n`;
    content += `- Decision-making approach: ${personality.decisionStyle}\n`;
    content += `- Stress response: ${personality.stressResponse}\n`;
    content += '\n';

    if (personality.adaptabilityRules.length > 0) {
      content += `## Adaptability\n`;
      for (const rule of personality.adaptabilityRules) {
        content += `- ${rule}\n`;
      }
    }

    return {
      name: 'PERSONALITY',
      priority: 9,
      content: content.trim()
    };
  }

  /**
   * Build KNOWLEDGE section
   */
  private buildKnowledgeSection(knowledge: KnowledgeBase): PromptSection {
    let content = '# KNOWLEDGE & EXPERTISE\n\n';

    content += `## Domain Expertise\n`;
    content += `- Primary Domain: ${knowledge.domain}\n`;
    if (knowledge.industries.length > 0) {
      content += `- Industry Knowledge: ${knowledge.industries.join(', ')}\n`;
    }
    if (knowledge.expertise.length > 0) {
      content += `- Subject Matter Expertise: ${knowledge.expertise.join(', ')}\n`;
    }
    content += '\n';

    content += `## Languages\n`;
    if (knowledge.languages.fluent && knowledge.languages.fluent.length > 0) {
      content += `- Fluent in: ${knowledge.languages.fluent.join(', ')}\n`;
    }
    if (knowledge.languages.conversational && knowledge.languages.conversational.length > 0) {
      content += `- Conversational in: ${knowledge.languages.conversational.join(', ')}\n`;
    }
    content += '\n';

    content += `## Knowledge Boundaries\n`;
    if (knowledge.knownDomains.length > 0) {
      content += `What you know:\n`;
      for (const domain of knowledge.knownDomains) {
        content += `- ${domain}\n`;
      }
      content += '\n';
    }

    if (knowledge.limitations.length > 0) {
      content += `What you DON'T know (be honest about):\n`;
      for (const limitation of knowledge.limitations) {
        content += `- ${limitation}\n`;
      }
      content += '\n';
    }

    if (knowledge.uncertaintyThreshold) {
      content += `When to say "I don't know":\n${knowledge.uncertaintyThreshold}\n`;
    }

    return {
      name: 'KNOWLEDGE',
      priority: 8,
      content: content.trim()
    };
  }

  /**
   * Build GOALS section
   */
  private buildGoalsSection(goals: Goal[]): PromptSection {
    let content = '# GOALS & OBJECTIVES\n\n';

    const primaryGoal = goals.find(g => g.type === 'primary');
    if (primaryGoal) {
      content += `## Primary Goal\n`;
      content += `${primaryGoal.description}\n\n`;
    }

    const secondaryGoals = goals.filter(g => g.type === 'secondary');
    if (secondaryGoals.length > 0) {
      content += `## Secondary Goals\n`;
      for (const goal of secondaryGoals) {
        content += `- ${goal.description}`;
        if (goal.metric) {
          content += ` (Metric: ${goal.metric})`;
        }
        content += '\n';
      }
      content += '\n';
    }

    // Success metrics
    const goalsWithMetrics = goals.filter(g => g.metric);
    if (goalsWithMetrics.length > 0) {
      content += `## Success Metrics\n`;
      for (const goal of goalsWithMetrics) {
        content += `- ${goal.name}: ${goal.metric}\n`;
      }
      content += '\n';
    }

    // Constraints
    const allConstraints = goals.flatMap(g => g.constraints).filter(c => c);
    if (allConstraints.length > 0) {
      content += `## Constraints\n`;
      for (const constraint of allConstraints) {
        content += `- ${constraint}\n`;
      }
      content += '\n';
    }

    // Priority order
    if (goals.length > 1) {
      content += `## Trade-offs\n`;
      content += `When conflicts arise, prioritize:\n`;
      const sorted = [...goals].sort((a, b) => a.priority - b.priority);
      for (let i = 0; i < Math.min(3, sorted.length); i++) {
        content += `${i + 1}. ${sorted[i].description}\n`;
      }
    }

    return {
      name: 'GOALS',
      priority: 9,
      content: content.trim()
    };
  }


  /**
   * Build DECISION PRINCIPLES section
   */
  private buildDecisionPrinciplesSection(): PromptSection {
    let content = '# DECISION-MAKING PRINCIPLES\n\n';
    content += `- Always prioritize user benefit and clear communication\n`;
    content += `- Be transparent about limitations and uncertainties\n`;
    content += `- Escalate to humans when uncertain about high-stakes decisions\n`;
    content += `- Never make assumptions about sensitive or personal data\n`;
    content += `- Validate before taking irreversible actions\n`;
    content += `- Maintain consistency with your personality and goals\n`;

    return {
      name: 'DECISION_PRINCIPLES',
      priority: 8,
      content: content.trim()
    };
  }

  /**
   * Build COMMUNICATION GUIDELINES section (channel-specific)
   */
  private buildCommunicationSection(channel: Channel): PromptSection {
    const guidelines = this.getChannelGuidelines(channel);

    let content = '# COMMUNICATION GUIDELINES\n\n';
    content += `## Channel: ${channel.toUpperCase()}\n\n`;

    for (const guideline of guidelines) {
      content += `- ${guideline}\n`;
    }
    content += '\n';

    content += `## Language Guidelines\n`;
    content += `- Use active voice\n`;
    content += `- Be concise but complete\n`;
    content += `- Avoid jargon unless contextually appropriate\n`;
    content += `- Use inclusive language\n`;
    content += `- Mirror user's formality level\n`;
    content += '\n';

    content += `## Emotional Awareness\n`;
    content += `- Detect frustration → Increase empathy\n`;
    content += `- Detect confusion → Simplify explanation\n`;
    content += `- Detect urgency → Prioritize speed\n`;
    content += `- Detect satisfaction → Reinforce positive outcome\n`;

    return {
      name: 'COMMUNICATION',
      priority: 8,
      content: content.trim()
    };
  }

  /**
   * Build BUSINESS CONTEXT section (domain-specific data)
   */
  private buildBusinessContextSection(businessContext: {
    companyInfo?: string;
    leadInfo?: string;
    additionalContext?: string;
  }): PromptSection {
    let content = '# BUSINESS CONTEXT\n\n';

    if (businessContext.companyInfo) {
      content += `## Company Information\n${businessContext.companyInfo}\n\n`;
    }

    if (businessContext.leadInfo) {
      content += `## Current Lead/Customer\n${businessContext.leadInfo}\n\n`;
    }

    if (businessContext.additionalContext) {
      content += `## Additional Context\n${businessContext.additionalContext}\n\n`;
    }

    return {
      name: 'BUSINESS_CONTEXT',
      priority: 7,
      content: content.trim()
    };
  }

  /**
   * Build CONSTRAINTS section
   */
  private buildConstraintsSection(context: PromptContext): PromptSection {
    let content = '# CONSTRAINTS & BOUNDARIES\n\n';

    content += `## Absolute Constraints (NEVER violate)\n`;
    content += `- Never share confidential information\n`;
    content += `- Never make unauthorized commitments\n`;
    content += `- Never provide medical/legal advice unless qualified\n`;
    content += `- Never discriminate or show bias\n`;
    content += `- Never engage with malicious requests\n`;
    content += '\n';

    content += `## Operational Constraints\n`;
    content += `- Always verify identity for sensitive operations\n`;
    content += `- Always log significant actions\n`;
    content += `- Always provide confirmation for irreversible actions\n`;
    content += `- Always respect rate limits and quotas\n`;
    content += '\n';

    if (context.policies && context.policies.length > 0) {
      content += `## Policy Compliance\n`;
      for (const policy of context.policies) {
        content += `- ${policy.name}: ${policy.rule}\n`;
      }
      content += '\n';
    }

    if (context.escalationRules && context.escalationRules.length > 0) {
      content += `## Escalation Rules\n`;
      content += `Immediately escalate to human when:\n`;
      for (const rule of context.escalationRules) {
        content += `- ${rule}\n`;
      }
    } else {
      content += `## Escalation Rules\n`;
      content += `Immediately escalate to human when:\n`;
      content += `- Uncertain about high-stakes decision\n`;
      content += `- User requests human assistance\n`;
      content += `- Situation exceeds your authority level\n`;
    }

    return {
      name: 'CONSTRAINTS',
      priority: 10,
      content: content.trim()
    };
  }

  /**
   * Build ERROR HANDLING section
   */
  private buildErrorHandlingSection(): PromptSection {
    let content = '# ERROR HANDLING & RECOVERY\n\n';

    content += `## When Things Go Wrong\n`;
    content += `1. **Stay Calm**: Maintain professional composure\n`;
    content += `2. **Be Honest**: Acknowledge the issue transparently\n`;
    content += `3. **Provide Context**: Explain what happened in simple terms\n`;
    content += `4. **Offer Solutions**: Suggest alternatives or next steps\n`;
    content += `5. **Escalate if Needed**: Don't hesitate to get help\n`;
    content += '\n';

    content += `## Error Response Templates\n`;
    content += `- Tool failure: "I encountered an issue with [tool]. Let me try [alternative]."\n`;
    content += `- Unknown question: "I don't have that information, but I can [alternative action]."\n`;
    content += `- Ambiguous request: "Just to clarify, are you asking about [option A] or [option B]?"\n`;
    content += `- System error: "I'm experiencing a technical issue. Would you like me to [fallback option]?"\n`;
    content += '\n';

    content += `## Graceful Degradation\n`;
    content += `If preferred method fails:\n`;
    content += `1. Try alternative approach\n`;
    content += `2. Use simpler/more reliable method\n`;
    content += `3. Fallback to human escalation\n`;
    content += `4. Never leave user hanging\n`;

    return {
      name: 'ERROR_HANDLING',
      priority: 7,
      content: content.trim()
    };
  }

  /**
   * Build EXAMPLES section (few-shot learning)
   */
  private buildExamplesSection(examples: PromptExample[]): PromptSection {
    let content = '# EXAMPLE INTERACTIONS\n\n';

    for (let i = 0; i < examples.length; i++) {
      const example = examples[i];
      content += `## Example ${i + 1}: ${example.scenario}\n\n`;
      content += `User: "${example.input}"\n\n`;
      content += `Your thought process:\n${example.reasoning}\n\n`;
      content += `Your response:\n"${example.response}"\n\n`;
      content += `Why this is good:\n`;
      for (const point of example.explanation) {
        content += `- ${point}\n`;
      }
      content += '\n';
    }

    return {
      name: 'EXAMPLES',
      priority: 5,
      content: content.trim()
    };
  }

  /**
   * Get channel-specific guidelines
   */
  private getChannelGuidelines(channel: Channel): string[] {
    switch (channel) {
      case 'call':
        return [
          'Responses will be spoken aloud - write for speech, not text',
          'Keep responses concise (under 30 seconds speaking time)',
          'Use conversational language with natural pauses',
          'Avoid complex formatting or special characters',
          'Use verbal confirmation for critical info ("I heard you say...")',
          'Speak numbers clearly ("one hundred twenty-three" not "123")'
        ];
      case 'sms':
        return [
          'Keep messages under 160 characters when possible',
          'Use text-friendly abbreviations sparingly',
          'No HTML or complex formatting',
          'Include clear call-to-action',
          'Use line breaks for readability'
        ];
      case 'email':
        return [
          'Use proper email structure (greeting, body, closing)',
          'HTML formatting is available - use it for clarity',
          'Can be more detailed than SMS/call',
          'Include relevant links and attachments',
          'Professional tone with appropriate signature'
        ];
      default:
        return [
          'Use clear, professional communication',
          'Adapt to the channel appropriately'
        ];
    }
  }

  /**
   * Assemble sections into final prompt
   */
  private assemble(sections: PromptSection[]): string {
    // Sort by priority (descending)
    const sorted = sections
      .filter(s => s.content && s.content.trim().length > 0)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Combine sections with separators
    const separator = '\n\n' + '═'.repeat(80) + '\n\n';
    return sorted.map(s => s.content).join(separator);
  }

  /**
   * Get section names (for debugging)
   */
  public getSections(): string[] {
    return [
      'IDENTITY',
      'PERSONALITY',
      'KNOWLEDGE',
      'GOALS',
      'DECISION_PRINCIPLES',
      'COMMUNICATION',
      'BUSINESS_CONTEXT',
      'CONSTRAINTS',
      'ERROR_HANDLING',
      'EXAMPLES'
    ];
  }

  /**
   * Build error recovery prompt
   */
  public buildErrorRecoveryPrompt(error: Error, request: any): string {
    let prompt = '# ERROR RECOVERY MODE\n\n';
    prompt += `An error occurred while processing the request:\n`;
    prompt += `Error: ${error.message}\n\n`;
    prompt += `Your task:\n`;
    prompt += `1. Acknowledge the error gracefully\n`;
    prompt += `2. Provide a helpful alternative or fallback response\n`;
    prompt += `3. Maintain your personality and professionalism\n`;
    prompt += `4. Never expose technical details to the user\n\n`;
    prompt += `Original request: ${request.input}\n`;

    return prompt;
  }
}
