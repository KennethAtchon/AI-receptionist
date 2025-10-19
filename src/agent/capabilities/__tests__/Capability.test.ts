/**
 * Tests for Capability class
 */

import { Capability } from '../Capability';
import type { Skill, Channel } from '../../types';

describe('Capability', () => {
  const mockSkills: Skill[] = [
    {
      name: 'schedule_appointment',
      description: 'Schedule an appointment',
      execute: async () => ({ success: true }),
      prerequisites: ['calendar_access']
    },
    {
      name: 'cancel_appointment',
      description: 'Cancel an appointment',
      execute: async () => ({ success: true })
    }
  ];

  const mockTools = [
    { name: 'calendar_tool', description: 'Calendar integration' }
  ];

  const supportedChannels: Channel[] = ['call', 'sms'];

  describe('constructor', () => {
    it('should create a capability with all properties', () => {
      const capability = new Capability(
        'appointment_management',
        'Manage appointments',
        mockSkills,
        mockTools,
        supportedChannels
      );

      expect(capability.name).toBe('appointment_management');
      expect(capability.description).toBe('Manage appointments');
      expect(capability.skills).toEqual(mockSkills);
      expect(capability.tools).toEqual(mockTools);
      expect(capability.supportedChannels).toEqual(supportedChannels);
    });
  });

  describe('isAvailableOn', () => {
    it('should return true for supported channels', () => {
      const capability = new Capability(
        'test_capability',
        'Test',
        mockSkills,
        mockTools,
        supportedChannels
      );

      expect(capability.isAvailableOn('call')).toBe(true);
      expect(capability.isAvailableOn('sms')).toBe(true);
    });

    it('should return false for unsupported channels', () => {
      const capability = new Capability(
        'test_capability',
        'Test',
        mockSkills,
        mockTools,
        supportedChannels
      );

      expect(capability.isAvailableOn('email')).toBe(false);
    });
  });

  describe('getSkillNames', () => {
    it('should return all skill names', () => {
      const capability = new Capability(
        'test_capability',
        'Test',
        mockSkills,
        mockTools,
        supportedChannels
      );

      const skillNames = capability.getSkillNames();
      expect(skillNames).toEqual(['schedule_appointment', 'cancel_appointment']);
    });

    it('should return empty array when no skills', () => {
      const capability = new Capability(
        'test_capability',
        'Test',
        [],
        mockTools,
        supportedChannels
      );

      expect(capability.getSkillNames()).toEqual([]);
    });
  });

  describe('findSkill', () => {
    it('should find skill by name', () => {
      const capability = new Capability(
        'test_capability',
        'Test',
        mockSkills,
        mockTools,
        supportedChannels
      );

      const skill = capability.findSkill('schedule_appointment');
      expect(skill).toBeDefined();
      expect(skill?.name).toBe('schedule_appointment');
    });

    it('should return undefined for non-existent skill', () => {
      const capability = new Capability(
        'test_capability',
        'Test',
        mockSkills,
        mockTools,
        supportedChannels
      );

      const skill = capability.findSkill('nonexistent_skill');
      expect(skill).toBeUndefined();
    });
  });

  describe('toJSON', () => {
    it('should return capability metadata', () => {
      const capability = new Capability(
        'appointment_management',
        'Manage appointments',
        mockSkills,
        mockTools,
        supportedChannels
      );

      const json = capability.toJSON();

      expect(json).toEqual({
        name: 'appointment_management',
        description: 'Manage appointments',
        skills: [
          { name: 'schedule_appointment', description: 'Schedule an appointment' },
          { name: 'cancel_appointment', description: 'Cancel an appointment' }
        ],
        toolCount: 1,
        supportedChannels: ['call', 'sms']
      });
    });
  });
});
