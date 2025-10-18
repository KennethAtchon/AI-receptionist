/**
 * GoalSystem - Defines what the agent aims to achieve
 *
 * The Goals pillar encompasses:
 * - Primary and secondary goals
 * - Success metrics
 * - Constraints
 * - Progress tracking
 */

import type {
  GoalSystem as IGoalSystem,
  GoalConfig,
  Goal,
  AgentRequest,
  AgentResponse
} from '../types';

export class GoalSystemImpl implements IGoalSystem {
  private goals: Goal[];
  private progressLog: Array<{
    timestamp: Date;
    request: AgentRequest;
    response: AgentResponse;
    goalProgress: Record<string, any>;
  }> = [];

  constructor(config: GoalConfig) {
    this.goals = this.parseGoals(config);
  }

  /**
   * Parse goal configuration into Goal objects
   */
  private parseGoals(config: GoalConfig): Goal[] {
    const goals: Goal[] = [];

    // Add primary goal
    goals.push({
      name: 'Primary Goal',
      description: config.primary,
      type: 'primary',
      priority: 1,
      constraints: config.constraints || []
    });

    // Add secondary goals
    if (config.secondary) {
      config.secondary.forEach((goal, index) => {
        goals.push({
          name: `Secondary Goal ${index + 1}`,
          description: goal,
          type: 'secondary',
          priority: index + 2,
          constraints: []
        });
      });
    }

    // Add metrics to goals
    if (config.metrics) {
      Object.entries(config.metrics).forEach(([name, metric]) => {
        const goal = goals.find(g => g.description.toLowerCase().includes(name.toLowerCase()));
        if (goal) {
          goal.metric = metric;
        }
      });
    }

    return goals;
  }

  /**
   * Get current goals
   */
  public getCurrent(): Goal[] {
    return [...this.goals];
  }

  /**
   * Get primary goal
   */
  public getPrimary(): Goal | undefined {
    return this.goals.find(g => g.type === 'primary');
  }

  /**
   * Get secondary goals
   */
  public getSecondary(): Goal[] {
    return this.goals.filter(g => g.type === 'secondary');
  }

  /**
   * Track progress toward goals
   */
  public async trackProgress(request: AgentRequest, response: AgentResponse): Promise<void> {
    const progress: Record<string, any> = {};

    // Analyze if the response moved toward any goals
    for (const goal of this.goals) {
      progress[goal.name] = this.evaluateGoalProgress(goal, request, response);
    }

    // Log the interaction and progress
    this.progressLog.push({
      timestamp: new Date(),
      request,
      response,
      goalProgress: progress
    });

    // Keep only recent progress (last 100 interactions)
    if (this.progressLog.length > 100) {
      this.progressLog = this.progressLog.slice(-100);
    }
  }

  /**
   * Evaluate progress toward a specific goal
   */
  private evaluateGoalProgress(
    goal: Goal,
    request: AgentRequest,
    response: AgentResponse
  ): any {
    // Simple heuristic - in production, this would be more sophisticated
    const responseLength = response.content.length;
    const hasMetadata = !!response.metadata;
    const confidence = response.metadata?.confidence || 0.5;

    return {
      contributed: confidence > 0.7,
      confidence,
      timestamp: new Date()
    };
  }

  /**
   * Get progress statistics
   */
  public getProgressStats(): {
    totalInteractions: number;
    goalContributions: Record<string, number>;
  } {
    const stats = {
      totalInteractions: this.progressLog.length,
      goalContributions: {} as Record<string, number>
    };

    for (const goal of this.goals) {
      const contributions = this.progressLog.filter(
        log => log.goalProgress[goal.name]?.contributed
      ).length;
      stats.goalContributions[goal.name] = contributions;
    }

    return stats;
  }

  /**
   * Add a new goal
   */
  public addGoal(goal: Goal): void {
    this.goals.push(goal);
  }

  /**
   * Remove a goal by name
   */
  public removeGoal(name: string): boolean {
    const initialLength = this.goals.length;
    this.goals = this.goals.filter(g => g.name !== name);
    return this.goals.length < initialLength;
  }

  /**
   * Update a goal
   */
  public updateGoal(name: string, updates: Partial<Goal>): boolean {
    const goal = this.goals.find(g => g.name === name);
    if (!goal) return false;

    Object.assign(goal, updates);
    return true;
  }

  /**
   * Convert goals to JSON for serialization
   */
  public toJSON(): Record<string, unknown> {
    return {
      goals: this.goals,
      progressStats: this.getProgressStats()
    };
  }

  /**
   * Get goal description for system prompts
   */
  public getDescription(): string {
    let description = '## Goals & Objectives\n\n';

    const primary = this.getPrimary();
    if (primary) {
      description += `### Primary Goal\n`;
      description += `${primary.description}\n\n`;

      if (primary.metric) {
        description += `**Success Metric:** ${primary.metric}\n\n`;
      }
    }

    const secondary = this.getSecondary();
    if (secondary.length > 0) {
      description += `### Secondary Goals\n`;
      for (const goal of secondary) {
        description += `${goal.priority}. ${goal.description}`;
        if (goal.metric) {
          description += ` (Metric: ${goal.metric})`;
        }
        description += '\n';
      }
      description += '\n';
    }

    // Add constraints from all goals
    const allConstraints = this.goals.flatMap(g => g.constraints);
    if (allConstraints.length > 0) {
      description += `### Constraints\n`;
      description += 'You must adhere to these constraints:\n';
      description += allConstraints.map(c => `- ${c}`).join('\n');
      description += '\n\n';
    }

    // Add prioritization guidance
    if (this.goals.length > 1) {
      description += `### Priority Order\n`;
      description += 'When conflicts arise, prioritize goals in this order:\n';
      const sorted = [...this.goals].sort((a, b) => a.priority - b.priority);
      description += sorted.map((g, i) => `${i + 1}. ${g.description}`).join('\n');
    }

    return description;
  }
}
