/**
 * Test Fixtures - Agent Configurations
 */

import { AgentConfig } from '../../types';

export const mockAgentSarah: AgentConfig = {
  name: 'Sarah',
  role: 'Sales Representative',
  personality: 'friendly and enthusiastic',
  tone: 'friendly',
  instructions: 'Help customers with product inquiries and bookings',
};

export const mockAgentBob: AgentConfig = {
  name: 'Bob',
  role: 'Support Specialist',
  personality: 'patient and helpful',
  tone: 'professional',
  systemPrompt: 'You are a helpful support specialist',
};

export const mockAgentTech: AgentConfig = {
  name: 'TechBot',
  role: 'Technical Support',
  personality: 'precise and knowledgeable',
  tone: 'formal',
  voice: {
    provider: 'elevenlabs',
    voiceId: 'tech-voice-001',
    stability: 0.8,
    similarityBoost: 0.7,
  },
};
