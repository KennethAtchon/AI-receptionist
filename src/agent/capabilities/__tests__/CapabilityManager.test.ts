/**
 * Tests for CapabilityManager
 */

import { CapabilityManagerImpl } from '../CapabilityManager';
import { Capability } from '../Capability';
import { Skill } from '../Skill';
import type { Channel } from '../../types';
import { CapabilityNotFoundError, SkillNotFoundError } from '../../errors/CapabilityErrors';

describe('CapabilityManager', () => {
  let manager: CapabilityManagerImpl;

  beforeEach(() => {
    manager = new CapabilityManagerImpl();
  });

  describe('initialize', () => {
    it('should initialize without errors', async () => {
      await expect(manager.initialize()).resolves.toBeUndefined();
    });
  });

  describe('register', () => {
    it('should register a capability and its skills', () => {
      const skill1 = new Skill({
        name: 'schedule_appointment',
        description: 'Schedule an appointment',
        execute: async () => ({ success: true })
      });

      const skill2 = new Skill({
        name: 'cancel_appointment',
        description: 'Cancel an appointment',
        execute: async () => ({ success: true })
      });

      const capability = new Capability(
        'appointment_management',
        'Manage appointments',
        [skill1, skill2],
        [],
        ['call', 'sms']
      );

      manager.register(capability);

      expect(manager.has('appointment_management')).toBe(true);
      expect(manager.hasSkill('schedule_appointment')).toBe(true);
      expect(manager.hasSkill('cancel_appointment')).toBe(true);
    });
  });

  describe('has', () => {
    it('should return true for registered capabilities', () => {
      const capability = new Capability('test_capability', 'Test', [], [], ['call']);
      manager.register(capability);

      expect(manager.has('test_capability')).toBe(true);
    });

    it('should return false for unregistered capabilities', () => {
      expect(manager.has('nonexistent_capability')).toBe(false);
    });
  });

  describe('get', () => {
    it('should return registered capability', () => {
      const capability = new Capability('test_capability', 'Test', [], [], ['call']);
      manager.register(capability);

      const retrieved = manager.get('test_capability');
      expect(retrieved).toBe(capability);
    });

    it('should return undefined for unregistered capability', () => {
      expect(manager.get('nonexistent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered capabilities', () => {
      const cap1 = new Capability('cap1', 'Capability 1', [], [], ['call']);
      const cap2 = new Capability('cap2', 'Capability 2', [], [], ['sms']);

      manager.register(cap1);
      manager.register(cap2);

      const all = manager.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContain(cap1);
      expect(all).toContain(cap2);
    });

    it('should return empty array when no capabilities registered', () => {
      expect(manager.getAll()).toEqual([]);
    });
  });

  describe('getTools', () => {
    it('should return tools for specific channel', () => {
      const callTool = { name: 'call_tool', description: 'Call tool' };
      const smsTool = { name: 'sms_tool', description: 'SMS tool' };

      const callCapability = new Capability('call_cap', 'Call Capability', [], [callTool], ['call']);
      const smsCapability = new Capability('sms_cap', 'SMS Capability', [], [smsTool], ['sms']);
      const multiCapability = new Capability('multi_cap', 'Multi Capability', [], [callTool, smsTool], ['call', 'sms']);

      manager.register(callCapability);
      manager.register(smsCapability);
      manager.register(multiCapability);

      const callTools = manager.getTools('call');
      const smsTools = manager.getTools('sms');

      expect(callTools).toContainEqual(callTool);
      expect(smsTools).toContainEqual(smsTool);
    });

    it('should return empty array for channel with no tools', () => {
      const tools = manager.getTools('email');
      expect(tools).toEqual([]);
    });
  });

  describe('list', () => {
    it('should list all capability names', () => {
      const cap1 = new Capability('cap1', 'Capability 1', [], [], ['call']);
      const cap2 = new Capability('cap2', 'Capability 2', [], [], ['sms']);

      manager.register(cap1);
      manager.register(cap2);

      const names = manager.list();
      expect(names).toEqual(['cap1', 'cap2']);
    });
  });

  describe('count', () => {
    it('should count total capabilities', () => {
      expect(manager.count()).toBe(0);

      manager.register(new Capability('cap1', 'Test', [], [], ['call']));
      expect(manager.count()).toBe(1);

      manager.register(new Capability('cap2', 'Test', [], [], ['sms']));
      expect(manager.count()).toBe(2);
    });
  });

  describe('countSkills', () => {
    it('should count total skills across all capabilities', () => {
      const skill1 = new Skill({
        name: 'skill1',
        description: 'Skill 1',
        execute: async () => ({})
      });

      const skill2 = new Skill({
        name: 'skill2',
        description: 'Skill 2',
        execute: async () => ({})
      });

      const capability = new Capability('test_cap', 'Test', [skill1, skill2], [], ['call']);

      manager.register(capability);

      expect(manager.countSkills()).toBe(2);
    });
  });

  describe('execute', () => {
    it('should execute a registered skill', async () => {
      const mockExecute = jest.fn(async (params) => ({ result: 'success', params }));

      const skill = new Skill({
        name: 'test_skill',
        description: 'Test skill',
        execute: mockExecute
      });

      const capability = new Capability('test_cap', 'Test', [skill], [], ['call']);
      manager.register(capability);

      const result = await manager.execute('test_skill', { data: 'test' });

      expect(mockExecute).toHaveBeenCalledWith({ data: 'test' });
      expect(result).toEqual({ result: 'success', params: { data: 'test' } });
    });

    it('should throw SkillNotFoundError for unregistered skill', async () => {
      await expect(
        manager.execute('nonexistent_skill', {})
      ).rejects.toThrow(SkillNotFoundError);
    });

    it('should check prerequisites before execution', async () => {
      const skill = new Skill({
        name: 'dependent_skill',
        description: 'Skill with prerequisites',
        execute: async () => ({}),
        prerequisites: ['required_skill']
      });

      const capability = new Capability('test_cap', 'Test', [skill], [], ['call']);
      manager.register(capability);

      await expect(
        manager.execute('dependent_skill', {})
      ).rejects.toThrow(/requires prerequisite skill/);
    });
  });

  describe('getSkills', () => {
    it('should return skills for a capability', () => {
      const skill1 = new Skill({
        name: 'skill1',
        description: 'Skill 1',
        execute: async () => ({})
      });

      const skill2 = new Skill({
        name: 'skill2',
        description: 'Skill 2',
        execute: async () => ({})
      });

      const capability = new Capability('test_cap', 'Test', [skill1, skill2], [], ['call']);
      manager.register(capability);

      const skills = manager.getSkills('test_cap');
      expect(skills).toEqual([skill1, skill2]);
    });

    it('should throw CapabilityNotFoundError for unregistered capability', () => {
      expect(() => manager.getSkills('nonexistent')).toThrow(CapabilityNotFoundError);
    });
  });

  describe('hasSkill', () => {
    it('should return true for registered skills', () => {
      const skill = new Skill({
        name: 'test_skill',
        description: 'Test',
        execute: async () => ({})
      });

      const capability = new Capability('test_cap', 'Test', [skill], [], ['call']);
      manager.register(capability);

      expect(manager.hasSkill('test_skill')).toBe(true);
    });

    it('should return false for unregistered skills', () => {
      expect(manager.hasSkill('nonexistent_skill')).toBe(false);
    });
  });

  describe('getDescription', () => {
    it('should generate description for capabilities', () => {
      const skill = new Skill({
        name: 'test_skill',
        description: 'Test skill',
        execute: async () => ({})
      });

      const capability = new Capability(
        'test_capability',
        'A test capability',
        [skill],
        [],
        ['call', 'sms']
      );

      manager.register(capability);

      const description = manager.getDescription();

      expect(description).toContain('## Capabilities');
      expect(description).toContain('test_capability');
      expect(description).toContain('A test capability');
      expect(description).toContain('test_skill');
      expect(description).toContain('call, sms');
    });

    it('should return default message when no capabilities registered', () => {
      const description = manager.getDescription();
      expect(description).toContain('No specific capabilities configured');
    });
  });

  describe('toJSON', () => {
    it('should convert to JSON format', () => {
      const skill = new Skill({
        name: 'test_skill',
        description: 'Test',
        execute: async () => ({})
      });

      const capability = new Capability('test_cap', 'Test', [skill], [], ['call']);
      manager.register(capability);

      const json = manager.toJSON();

      expect(json).toHaveProperty('capabilities');
      expect(json).toHaveProperty('totalSkills', 1);
      expect(Array.isArray(json.capabilities)).toBe(true);
    });
  });
});
