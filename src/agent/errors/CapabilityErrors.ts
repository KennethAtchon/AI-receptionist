/**
 * Custom errors for capability and skill management
 */

export class CapabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CapabilityError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class CapabilityNotFoundError extends CapabilityError {
  constructor(message: string) {
    super(message);
    this.name = 'CapabilityNotFoundError';
  }
}

export class SkillNotFoundError extends CapabilityError {
  constructor(message: string) {
    super(message);
    this.name = 'SkillNotFoundError';
  }
}

export class SkillExecutionError extends CapabilityError {
  constructor(
    message: string,
    public readonly skillName: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'SkillExecutionError';
  }
}
