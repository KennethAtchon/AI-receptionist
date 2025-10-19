/**
 * PillarManager - Centralized manager for updating agent pillars at runtime
 *
 * This class provides a clean API for updating all six pillars of the agent:
 * 1. Identity
 * 2. Personality
 * 3. Knowledge
 * 4. Capabilities
 * 5. Memory
 * 6. Goals
 *
 * All updates automatically trigger system prompt rebuilding to ensure
 * changes propagate to all channels (text, email, calls, etc.)
 */

import type { Agent } from './Agent';
import type {
  PersonalityTrait,
  CommunicationStyleConfig,
  Goal
} from '../types';
import { logger } from '../../utils/logger';

export class PillarManager {
  constructor(private agent: Agent) {}

  /**
   * Rebuild system prompt after updates
   * Automatically called by all update methods
   */
  private async rebuild(): Promise<void> {
    await this.agent.rebuildSystemPrompt();
  }

  // ==================== PERSONALITY PILLAR ====================

  /**
   * Add a personality trait
   *
   * @example
   * ```typescript
   * await pillarManager.personality.addTrait('enthusiastic');
   *
   * await pillarManager.personality.addTrait({
   *   name: 'technical',
   *   description: 'Uses technical terminology appropriately',
   *   weight: 0.8
   * });
   * ```
   */
  async addPersonalityTrait(trait: string | PersonalityTrait): Promise<void> {
    await this.agent.addPersonalityTrait(trait);
    logger.info('[PillarManager] Personality trait added', { trait });
  }

  /**
   * Remove a personality trait
   *
   * @example
   * ```typescript
   * await pillarManager.personality.removeTrait('enthusiastic');
   * ```
   */
  async removePersonalityTrait(traitName: string): Promise<void> {
    await this.agent.removePersonalityTrait(traitName);
    logger.info('[PillarManager] Personality trait removed', { traitName });
  }

  /**
   * Update communication style
   *
   * @example
   * ```typescript
   * await pillarManager.personality.updateCommunicationStyle({
   *   primary: 'empathetic',
   *   tone: 'friendly',
   *   formalityLevel: 5
   * });
   * ```
   */
  async updateCommunicationStyle(style: Partial<CommunicationStyleConfig>): Promise<void> {
    await this.agent.updateCommunicationStyle(style);
    logger.info('[PillarManager] Communication style updated', { style });
  }

  /**
   * Set formality level (1-10)
   *
   * @example
   * ```typescript
   * await pillarManager.personality.setFormalityLevel(8); // More formal
   * await pillarManager.personality.setFormalityLevel(3); // More casual
   * ```
   */
  async setFormalityLevel(level: number): Promise<void> {
    await this.agent.setFormalityLevel(level);
    logger.info('[PillarManager] Formality level updated', { level });
  }

  /**
   * Update multiple personality settings at once
   *
   * @example
   * ```typescript
   * await pillarManager.personality.update({
   *   traits: ['professional', 'helpful'],
   *   communicationStyle: { primary: 'consultative', formalityLevel: 7 }
   * });
   * ```
   */
  async updatePersonality(updates: {
    traits?: Array<string | PersonalityTrait>;
    communicationStyle?: Partial<CommunicationStyleConfig>;
    formalityLevel?: number;
  }): Promise<void> {
    if (updates.traits) {
      for (const trait of updates.traits) {
        await this.addPersonalityTrait(trait);
      }
    }

    if (updates.communicationStyle) {
      await this.updateCommunicationStyle(updates.communicationStyle);
    }

    if (updates.formalityLevel !== undefined) {
      await this.setFormalityLevel(updates.formalityLevel);
    }

    logger.info('[PillarManager] Personality updated', { updates });
  }

  // ==================== KNOWLEDGE PILLAR ====================

  /**
   * Update the primary domain
   */
  async updateDomain(domain: string): Promise<void> {
    this.agent.getKnowledge().updateDomain(domain);
    await this.rebuild();
    logger.info('[PillarManager] Domain updated', { domain });
  }

  /**
   * Add area of expertise
   */
  async addExpertise(area: string): Promise<void> {
    this.agent.getKnowledge().addExpertise(area);
    await this.rebuild();
    logger.info('[PillarManager] Expertise added', { area });
  }

  /**
   * Remove area of expertise
   */
  async removeExpertise(area: string): Promise<void> {
    this.agent.getKnowledge().removeExpertise(area);
    await this.rebuild();
    logger.info('[PillarManager] Expertise removed', { area });
  }

  /**
   * Add a language
   */
  async addLanguage(language: string, proficiency: 'fluent' | 'conversational' = 'fluent'): Promise<void> {
    this.agent.getKnowledge().addLanguage(language, proficiency);
    await this.rebuild();
    logger.info('[PillarManager] Language added', { language, proficiency });
  }

  /**
   * Remove a language
   */
  async removeLanguage(language: string): Promise<void> {
    this.agent.getKnowledge().removeLanguage(language);
    await this.rebuild();
    logger.info('[PillarManager] Language removed', { language });
  }

  /**
   * Add industry knowledge
   */
  async addIndustry(industry: string): Promise<void> {
    this.agent.getKnowledge().addIndustry(industry);
    await this.rebuild();
    logger.info('[PillarManager] Industry added', { industry });
  }

  /**
   * Remove industry knowledge
   */
  async removeIndustry(industry: string): Promise<void> {
    this.agent.getKnowledge().removeIndustry(industry);
    await this.rebuild();
    logger.info('[PillarManager] Industry removed', { industry });
  }

  // ==================== GOALS PILLAR ====================

  /**
   * Add a goal
   */
  async addGoal(goal: Goal): Promise<void> {
    this.agent.getGoals().addGoal(goal);
    await this.rebuild();
    logger.info('[PillarManager] Goal added', { goal });
  }

  /**
   * Remove a goal
   */
  async removeGoal(name: string): Promise<void> {
    this.agent.getGoals().removeGoal(name);
    await this.rebuild();
    logger.info('[PillarManager] Goal removed', { name });
  }

  /**
   * Update a goal
   */
  async updateGoal(name: string, updates: Partial<Goal>): Promise<void> {
    this.agent.getGoals().updateGoal(name, updates);
    await this.rebuild();
    logger.info('[PillarManager] Goal updated', { name, updates });
  }

  // ==================== IDENTITY PILLAR ====================

  /**
   * Update the agent's role
   */
  async updateRole(role: string): Promise<void> {
    this.agent.getIdentity().updateRole(role);
    await this.rebuild();
    logger.info('[PillarManager] Role updated', { role });
  }

  /**
   * Update the agent's title
   */
  async updateTitle(title: string): Promise<void> {
    this.agent.getIdentity().updateTitle(title);
    await this.rebuild();
    logger.info('[PillarManager] Title updated', { title });
  }

  /**
   * Update the agent's backstory
   */
  async updateBackstory(backstory: string): Promise<void> {
    this.agent.getIdentity().updateBackstory(backstory);
    await this.rebuild();
    logger.info('[PillarManager] Backstory updated', { backstory });
  }

  /**
   * Set authority level
   */
  async setAuthorityLevel(level: 'low' | 'medium' | 'high'): Promise<void> {
    this.agent.getIdentity().setAuthorityLevel(level);
    await this.rebuild();
    logger.info('[PillarManager] Authority level updated', { level });
  }

  /**
   * Add specialization
   */
  async addSpecialization(specialization: string): Promise<void> {
    this.agent.getIdentity().addSpecialization(specialization);
    await this.rebuild();
    logger.info('[PillarManager] Specialization added', { specialization });
  }

  /**
   * Remove specialization
   */
  async removeSpecialization(specialization: string): Promise<void> {
    this.agent.getIdentity().removeSpecialization(specialization);
    await this.rebuild();
    logger.info('[PillarManager] Specialization removed', { specialization });
  }

  // ==================== MEMORY PILLAR ====================

  /**
   * Clear short-term memory
   */
  async clearShortTermMemory(): Promise<void> {
    await this.agent.getMemory().clearShortTerm();
    logger.info('[PillarManager] Short-term memory cleared');
  }

  /**
   * Clear long-term memory
   */
  async clearLongTermMemory(): Promise<void> {
    await this.agent.getMemory().clearLongTerm();
    logger.info('[PillarManager] Long-term memory cleared');
  }

  // ==================== CAPABILITIES PILLAR ====================
  // Capabilities are managed through the tool registry
  // Access via client.getToolRegistry()

  /**
   * Rebuild the system prompt after manual updates
   * (automatically called by update methods, but exposed for manual use)
   */
  async rebuildSystemPrompt(): Promise<void> {
    await this.agent.rebuildSystemPrompt();
    logger.info('[PillarManager] System prompt rebuilt');
  }
}
