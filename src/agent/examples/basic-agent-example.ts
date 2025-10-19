/**
 * Example: Creating and using a basic AI Receptionist agent
 *
 * This example demonstrates how to build an agent using the new
 * six-pillar architecture (Identity, Personality, Knowledge,
 * Capabilities, Memory, Goals)
 */

import { AgentBuilder } from '../core/AgentBuilder';
import { Capability } from '../capabilities/Capability';
import { Skill } from '../capabilities/Skill';

/**
 * Example 1: Creating a basic receptionist agent
 */
export async function createBasicReceptionistAgent() {
  // Define a simple capability
  const schedulingCapability = new Capability(
    'scheduling',
    'Schedule and manage appointments',
    [
      new Skill(
        'schedule-appointment',
        'Schedule a new appointment',
        async (params: { date: string; time: string; customerName: string }) => {
          // In production, this would call a real scheduling system
          console.log(`Scheduling appointment for ${params.customerName} on ${params.date} at ${params.time}`);
          return {
            success: true,
            appointmentId: 'APT-' + Date.now(),
            message: `Appointment scheduled for ${params.date} at ${params.time}`
          };
        }
      ),
      new Skill(
        'check-availability',
        'Check if a time slot is available',
        async (params: { date: string; time: string }) => {
          // Simulated availability check
          return {
            available: true,
            alternativeTimes: ['10:00 AM', '2:00 PM', '4:00 PM']
          };
        }
      )
    ],
    [], // tools (would include actual tools in production)
    ['call', 'sms', 'email']
  );

  // Build the agent using the fluent builder pattern
  const agent = AgentBuilder.create()
    .withIdentity({
      name: 'Sarah',
      role: 'Receptionist',
      title: 'Virtual Receptionist',
      backstory: 'An experienced receptionist with excellent customer service skills and attention to detail',
      authorityLevel: 'medium',
      yearsOfExperience: 5,
      specializations: ['appointment scheduling', 'customer service', 'phone etiquette']
    })
    .withPersonality({
      traits: [
        { name: 'friendly', description: 'Warm and welcoming in all interactions' },
        { name: 'professional', description: 'Maintains professionalism at all times' },
        { name: 'patient', description: 'Patient with customers who need extra help' }
      ],
      communicationStyle: {
        primary: 'empathetic',
        tone: 'friendly',
        formalityLevel: 6
      },
      emotionalIntelligence: 'high',
      adaptability: 'high'
    })
    .withKnowledge({
      domain: 'Customer Service',
      expertise: ['appointment scheduling', 'phone etiquette', 'customer relations'],
      languages: {
        fluent: ['English'],
        conversational: ['Spanish']
      },
      industries: ['Healthcare', 'Professional Services'],
      knownDomains: ['Scheduling systems', 'CRM software', 'Customer service best practices'],
      limitations: ['Cannot provide medical advice', 'Cannot access patient records directly'],
      uncertaintyThreshold: 'When in doubt about medical information or patient privacy, escalate to staff'
    })
    .withGoals({
      primary: 'Provide excellent customer service and efficiently schedule appointments',
      secondary: [
        'Build positive relationships with customers',
        'Reduce wait times',
        'Maintain accurate schedules'
      ],
      constraints: [
        'Never share confidential information',
        'Always verify customer identity for sensitive requests',
        'Follow HIPAA guidelines when applicable'
      ],
      metrics: {
        'customer satisfaction': 'Target: 4.5/5.0 average rating',
        'scheduling accuracy': 'Target: 99% accuracy in appointment details'
      }
    })
    .withMemory({
      type: 'simple',
      contextWindow: 20,
      longTermEnabled: false // Enable in production with actual storage
    })
    .withCapability(schedulingCapability)
    .build();

  // Initialize the agent
  await agent.initialize();

  return agent;
}

/**
 * Example 2: Using the agent to process requests
 */
export async function exampleAgentInteraction() {
  const agent = await createBasicReceptionistAgent();

  // Example conversation
  const request1 = {
    id: 'REQ-001',
    input: 'Hi, I would like to schedule an appointment for next Tuesday at 2 PM',
    channel: 'call' as const,
    context: {
      conversationId: 'CONV-001',
      customerName: 'John Doe',
      customerId: 'CUST-123'
    }
  };

  console.log('\n=== Agent Interaction Example ===\n');
  console.log(`User: ${request1.input}\n`);

  // Process the request
  const response1 = await agent.process(request1);

  console.log(`Agent: ${response1.content}\n`);

  // Follow-up request
  const request2 = {
    id: 'REQ-002',
    input: 'Actually, can we make it 3 PM instead?',
    channel: 'call' as const,
    context: {
      conversationId: 'CONV-001',
      customerName: 'John Doe',
      customerId: 'CUST-123'
    }
  };

  console.log(`User: ${request2.input}\n`);

  const response2 = await agent.process(request2);

  console.log(`Agent: ${response2.content}\n`);

  // Get agent state
  const state = agent.getState();
  console.log('\n=== Agent State ===');
  console.log(JSON.stringify(state, null, 2));

  // Clean up
  await agent.dispose();
}

/**
 * Example 3: Creating a specialized sales agent
 */
export async function createSalesAgent() {
  const salesCapability = new Capability(
    'sales',
    'Lead qualification and sales process management',
    [
      new Skill(
        'qualify-lead',
        'Qualify leads using BANT framework',
        async (params: { leadInfo: any }) => {
          // BANT: Budget, Authority, Need, Timeline
          console.log('Qualifying lead:', params.leadInfo);
          return {
            qualified: true,
            score: 8.5,
            bant: {
              budget: 'Qualified',
              authority: 'Decision maker',
              need: 'Clear need identified',
              timeline: '1-3 months'
            }
          };
        },
        [] // no prerequisites
      ),
      new Skill(
        'schedule-demo',
        'Schedule a product demonstration',
        async (params: { prospectName: string; date: string }) => {
          console.log(`Scheduling demo for ${params.prospectName} on ${params.date}`);
          return {
            success: true,
            demoId: 'DEMO-' + Date.now(),
            meetingLink: 'https://example.com/demo/12345'
          };
        }
      )
    ],
    [], // tools
    ['call', 'email']
  );

  const agent = AgentBuilder.create()
    .withIdentity({
      name: 'Alex',
      role: 'Sales Representative',
      title: 'Senior Sales Specialist',
      backstory: 'Former engineer turned sales professional with deep technical knowledge',
      authorityLevel: 'high',
      yearsOfExperience: 8,
      specializations: ['B2B sales', 'SaaS solutions', 'enterprise accounts'],
      certifications: ['Certified Sales Professional', 'Solution Selling']
    })
    .withPersonality({
      traits: [
        { name: 'consultative', description: 'Takes a consultative approach to selling' },
        { name: 'analytical', description: 'Analyzes customer needs deeply' },
        { name: 'persistent', description: 'Follows up consistently without being pushy' }
      ],
      communicationStyle: {
        primary: 'consultative',
        tone: 'professional',
        formalityLevel: 7
      },
      emotionalIntelligence: 'high',
      adaptability: 'high'
    })
    .withKnowledge({
      domain: 'B2B SaaS Sales',
      expertise: ['enterprise software', 'cloud architecture', 'security', 'ROI analysis'],
      languages: {
        fluent: ['English'],
        conversational: ['Spanish']
      },
      industries: ['Technology', 'Finance', 'Healthcare'],
      knownDomains: ['SaaS pricing models', 'Enterprise sales cycles', 'BANT qualification'],
      limitations: ['Cannot offer discounts without approval', 'Cannot access contract details'],
      uncertaintyThreshold: 'Escalate pricing questions above $50k to sales manager'
    })
    .withGoals({
      primary: 'Qualify and convert enterprise leads into customers',
      secondary: [
        'Build trust and credibility',
        'Educate prospects on product value',
        'Schedule product demonstrations'
      ],
      constraints: [
        'Never discount without manager approval',
        'Always follow BANT qualification framework',
        'Never make commitments about features not yet available'
      ],
      metrics: {
        'qualification rate': 'Target: 60% of leads qualified',
        'demo conversion': 'Target: 40% demo attendance to opportunity'
      }
    })
    .withMemory({
      type: 'simple',
      contextWindow: 30,
      longTermEnabled: false
    })
    .withCapability(salesCapability)
    .build();

  await agent.initialize();
  return agent;
}

/**
 * Run all examples
 */
export async function runExamples() {
  console.log('='.repeat(80));
  console.log('AGENT SYSTEM EXAMPLES');
  console.log('='.repeat(80));

  console.log('\n\n--- Example 1: Basic Receptionist Agent ---\n');
  await exampleAgentInteraction();

  console.log('\n\n--- Example 2: Sales Agent (created, not run) ---\n');
  const salesAgent = await createSalesAgent();
  console.log('Sales agent created successfully!');
  console.log('Agent state:', salesAgent.getState());
  await salesAgent.dispose();

  console.log('\n\n' + '='.repeat(80));
  console.log('Examples completed successfully!');
  console.log('='.repeat(80) + '\n');
}

// If running this file directly
if (require.main === module) {
  runExamples().catch(console.error);
}
