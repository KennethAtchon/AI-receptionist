/**
 * GoalSystem - Defines what the agent aims to achieve
 *
 * The Goals pillar encompasses:
 * - Primary and secondary goals
 * - Success metrics
 * - Constraints
 */

import type {
  GoalSystem as IGoalSystem,
  GoalConfig,
  Goal
} from '../types';

export class GoalSystemImpl implements IGoalSystem {
  private goals: Goal[];

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
      constraints: config.constraints || []
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
            constraints: []
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
      goals: this.goals
    };
  }

  /**
   * Get goal description for system prompts
   */
  public getDescription(): string {
    let description = '# GOALS & OBJECTIVES\n\n';

    const primary = this.getPrimary();
    if (primary) {
      description += `## Primary Goal\n`;
      description += `${primary.description}\n\n`;

      if (primary.metric) {
        description += `**Success Metric:** ${primary.metric}\n\n`;
      }
    }

    const secondaryGoals = this.getSecondary();
    if (secondaryGoals.length > 0) {
      description += `## Secondary Goals\n`;
      for (const goal of secondaryGoals) {
        description += `- ${goal.description}`;
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
      description += `## Constraints\n`;
      description += 'You must adhere to these constraints:\n';
      description += allConstraints.map(c => `- ${c}`).join('\n');
      description += '\n\n';
    }

    // Add prioritization guidance if multiple goals
    if (this.goals.length > 1) {
      description += `## Priority Order\n`;
      description += 'When conflicts arise, prioritize goals in this order:\n';
      const sorted = [...this.goals].sort((a, b) => a.priority - b.priority);
      description += sorted.map((g, i) => `${i + 1}. ${g.description}`).join('\n');
    }

    return description;
  }
}
