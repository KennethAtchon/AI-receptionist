/**
 * Tests for Skill class
 */

import { Skill } from '../Skill';
import type { SkillDefinition } from '../../types';

describe('Skill', () => {
  const mockExecute = jest.fn(async (params: any) => ({ success: true, data: params }));

  describe('constructor', () => {
    it('should create a skill with all properties', () => {
      const definition: SkillDefinition = {
        name: 'send_email',
        description: 'Send an email',
        execute: mockExecute,
        prerequisites: ['email_access', 'auth']
      };

      const skill = new Skill(definition);

      expect(skill.name).toBe('send_email');
      expect(skill.description).toBe('Send an email');
      expect(skill.execute).toBe(mockExecute);
      expect(skill.prerequisites).toEqual(['email_access', 'auth']);
    });

    it('should create a skill without prerequisites', () => {
      const definition: SkillDefinition = {
        name: 'greet_user',
        description: 'Greet the user',
        execute: mockExecute
      };

      const skill = new Skill(definition);

      expect(skill.name).toBe('greet_user');
      expect(skill.prerequisites).toBeUndefined();
    });
  });

  describe('hasPrerequisites', () => {
    it('should return true when prerequisites exist', () => {
      const definition: SkillDefinition = {
        name: 'test_skill',
        description: 'Test',
        execute: mockExecute,
        prerequisites: ['some_prerequisite']
      };

      const skill = new Skill(definition);
      expect(skill.hasPrerequisites()).toBe(true);
    });

    it('should return false when prerequisites array is empty', () => {
      const definition: SkillDefinition = {
        name: 'test_skill',
        description: 'Test',
        execute: mockExecute,
        prerequisites: []
      };

      const skill = new Skill(definition);
      expect(skill.hasPrerequisites()).toBe(false);
    });

    it('should return false when prerequisites is undefined', () => {
      const definition: SkillDefinition = {
        name: 'test_skill',
        description: 'Test',
        execute: mockExecute
      };

      const skill = new Skill(definition);
      expect(skill.hasPrerequisites()).toBe(false);
    });
  });

  describe('requiresPrerequisite', () => {
    it('should return true when specific prerequisite is required', () => {
      const definition: SkillDefinition = {
        name: 'test_skill',
        description: 'Test',
        execute: mockExecute,
        prerequisites: ['calendar_access', 'auth']
      };

      const skill = new Skill(definition);
      expect(skill.requiresPrerequisite('calendar_access')).toBe(true);
      expect(skill.requiresPrerequisite('auth')).toBe(true);
    });

    it('should return false when prerequisite is not required', () => {
      const definition: SkillDefinition = {
        name: 'test_skill',
        description: 'Test',
        execute: mockExecute,
        prerequisites: ['calendar_access']
      };

      const skill = new Skill(definition);
      expect(skill.requiresPrerequisite('email_access')).toBe(false);
    });

    it('should return false when no prerequisites exist', () => {
      const definition: SkillDefinition = {
        name: 'test_skill',
        description: 'Test',
        execute: mockExecute
      };

      const skill = new Skill(definition);
      expect(skill.requiresPrerequisite('any_prerequisite')).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should return skill metadata with prerequisites', () => {
      const definition: SkillDefinition = {
        name: 'complex_skill',
        description: 'Complex operation',
        execute: mockExecute,
        prerequisites: ['auth', 'permissions']
      };

      const skill = new Skill(definition);
      const json = skill.toJSON();

      expect(json).toEqual({
        name: 'complex_skill',
        description: 'Complex operation',
        prerequisites: ['auth', 'permissions']
      });
    });

    it('should return skill metadata without prerequisites', () => {
      const definition: SkillDefinition = {
        name: 'simple_skill',
        description: 'Simple operation',
        execute: mockExecute
      };

      const skill = new Skill(definition);
      const json = skill.toJSON();

      expect(json).toEqual({
        name: 'simple_skill',
        description: 'Simple operation',
        prerequisites: undefined
      });
    });
  });

  describe('execute', () => {
    it('should execute the skill function', async () => {
      const mockFn = jest.fn(async (params: any) => ({ result: 'success', params }));
      const definition: SkillDefinition = {
        name: 'test_skill',
        description: 'Test',
        execute: mockFn
      };

      const skill = new Skill(definition);
      const result = await skill.execute({ input: 'test data' });

      expect(mockFn).toHaveBeenCalledWith({ input: 'test data' });
      expect(result).toEqual({ result: 'success', params: { input: 'test data' } });
    });
  });
});
