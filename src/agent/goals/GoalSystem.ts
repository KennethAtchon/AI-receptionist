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
    // Validate that primary goal exists
    if (!config.primary || config.primary.trim().length === 0) {
      throw new Error('GoalConfig must have a non-empty primary goal');
    }
    this.goals = this.parseGoals(config);
  }

  /**
   * Parse goal configuration into Goal objects
   */
  private parseGoals(config: GoalConfig): Goal[] {
    const goals: Goal[] = [];

    // Add primary goal (guaranteed to exist due to constructor validation)
    goals.push({
      name: 'Primary Goal',
      description: config.primary.trim(),
      type: 'primary',
      priority: 1,
      constraints: config.constraints || [],
      completed: false
    });

    // Add secondary goals
    if (config.secondary) {
      config.secondary.forEach((goal, index) => {
        // Skip empty secondary goals
        if (goal && goal.trim().length > 0) {
          goals.push({
            name: `Secondary Goal ${index + 1}`,
            description: goal.trim(),
            type: 'secondary',
            priority: index + 2,
            constraints: [],
            completed: false
          });
        }
      });
    }

    // Add metrics to goals
    // Match metrics to goals by name (primary/secondary) or by description keyword
    if (config.metrics) {
      Object.entries(config.metrics).forEach(([metricName, metricValue]) => {
        // First try to match by goal name (e.g., "Primary Goal", "Secondary Goal 1")
        let goal = goals.find(g => g.name.toLowerCase() === metricName.toLowerCase());
        
        // If not found, try to match by description keyword
        if (!goal) {
          goal = goals.find(g => 
            g.description.toLowerCase().includes(metricName.toLowerCase()) ||
            metricName.toLowerCase().includes(g.description.toLowerCase().split(' ')[0])
          );
        }
        
        // If still not found, try to match primary goal if metric name suggests it
        if (!goal && (metricName.toLowerCase().includes('primary') || metricName.toLowerCase().includes('main'))) {
          goal = goals.find(g => g.type === 'primary');
        }
        
        if (goal) {
          goal.metric = metricValue;
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
   * Get completed goals
   */
  public getCompleted(): Goal[] {
    return this.goals.filter(g => g.completed === true);
  }

  /**
   * Get incomplete goals
   */
  public getIncomplete(): Goal[] {
    return this.goals.filter(g => !g.completed);
  }

  /**
   * Check if a goal is completed
   */
  public isGoalCompleted(name: string): boolean {
    const goal = this.goals.find(g => g.name === name);
    return goal?.completed === true;
  }

  /**
   * Mark a goal as completed
   */
  public markGoalCompleted(name: string, completionCriteria?: string): boolean {
    const goal = this.goals.find(g => g.name === name);
    if (!goal) {
      return false;
    }
    
    goal.completed = true;
    goal.completedAt = new Date();
    if (completionCriteria) {
      goal.completionCriteria = completionCriteria;
    }
    
    return true;
  }

  /**
   * Mark a goal as incomplete (reopen it)
   */
  public markGoalIncomplete(name: string): boolean {
    const goal = this.goals.find(g => g.name === name);
    if (!goal) {
      return false;
    }
    
    goal.completed = false;
    goal.completedAt = undefined;
    goal.completionCriteria = undefined;
    
    return true;
  }

  /**
   * Track progress toward goals
   */
  public async trackProgress(request: AgentRequest, response: AgentResponse): Promise<void> {
    const progress: Record<string, any> = {};

    // Analyze if the response moved toward any goals
    for (const goal of this.goals) {
      const goalProgress = this.evaluateGoalProgress(goal, request, response);
      progress[goal.name] = goalProgress;

      // Auto-complete goal if response indicates achievement
      if (goalProgress.goalAchieved && !goal.completed) {
        this.markGoalCompleted(
          goal.name,
          `Achieved during interaction: ${request.input.substring(0, 100)}`
        );
      }
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
    // Skip evaluation if goal is already completed
    if (goal.completed) {
      return {
        contributed: false,
        confidence: 0,
        alreadyCompleted: true,
        timestamp: new Date()
      };
    }

    // Simple heuristic - in production, this would be more sophisticated
    const responseLength = response.content.length;
    const hasMetadata = !!response.metadata;
    const confidence = response.metadata?.confidence || 0.5;

    // Check if response metadata indicates goal achievement
    const goalAchieved = response.metadata?.goalAchieved === true ||
                         response.metadata?.goalAchieved?.[goal.name] === true;

    return {
      contributed: confidence > 0.7 || goalAchieved,
      confidence,
      goalAchieved,
      timestamp: new Date()
    };
  }

  /**
   * Get progress statistics
   */
  public getProgressStats(): {
    totalInteractions: number;
    goalContributions: Record<string, number>;
    completedGoals: number;
    totalGoals: number;
  } {
    const stats = {
      totalInteractions: this.progressLog.length,
      goalContributions: {} as Record<string, number>,
      completedGoals: this.getCompleted().length,
      totalGoals: this.goals.length
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
    if (!goal || !goal.name || !goal.description) {
      throw new Error('Goal must have name and description');
    }
    // Check for duplicate names
    if (this.goals.some(g => g.name === goal.name)) {
      throw new Error(`Goal with name "${goal.name}" already exists`);
    }
    // Ensure new goals start as incomplete
    const newGoal: Goal = {
      ...goal,
      completed: goal.completed ?? false,
      completedAt: goal.completed ? (goal.completedAt || new Date()) : undefined
    };
    this.goals.push(newGoal);
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
    if (!name || name.trim().length === 0) {
      throw new Error('Goal name cannot be empty');
    }
    const goal = this.goals.find(g => g.name === name);
    if (!goal) return false;

    // Validate updates
    if (updates.name !== undefined && updates.name.trim().length === 0) {
      throw new Error('Goal name cannot be empty');
    }
    if (updates.description !== undefined && updates.description.trim().length === 0) {
      throw new Error('Goal description cannot be empty');
    }
    if (updates.priority !== undefined && updates.priority < 1) {
      throw new Error('Goal priority must be at least 1');
    }

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

    // Only include incomplete goals in the prompt (completed goals are achieved)
    const incompleteGoals = this.getIncomplete();

    const primary = this.getPrimary();
    if (primary && !primary.completed) {
      description += `### Primary Goal\n`;
      description += `${primary.description}\n\n`;

      if (primary.metric) {
        description += `**Success Metric:** ${primary.metric}\n\n`;
      }
    }

    const incompleteSecondary = this.getSecondary().filter(g => !g.completed);
    if (incompleteSecondary.length > 0) {
      description += `### Secondary Goals\n`;
      for (const goal of incompleteSecondary) {
        description += `${goal.priority}. ${goal.description}`;
        if (goal.metric) {
          description += ` (Metric: ${goal.metric})`;
        }
        description += '\n';
      }
      description += '\n';
    }

    // Show completed goals summary if any
    const completedGoals = this.getCompleted();
    if (completedGoals.length > 0) {
      description += `### Completed Goals ✓\n`;
      description += 'The following goals have been achieved:\n';
      for (const goal of completedGoals) {
        description += `- ✓ ${goal.name}: ${goal.description}`;
        if (goal.completedAt) {
          description += ` (Completed: ${goal.completedAt.toISOString().split('T')[0]})`;
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

    // Add prioritization guidance for incomplete goals
    if (incompleteGoals.length > 1) {
      description += `### Priority Order\n`;
      description += 'When conflicts arise, prioritize goals in this order:\n';
      const sorted = [...incompleteGoals].sort((a, b) => a.priority - b.priority);
      description += sorted.map((g, i) => `${i + 1}. ${g.description}`).join('\n');
    }

    return description;
  }
}
