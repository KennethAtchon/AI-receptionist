/**
 * Example: Runtime Pillar Updates
 *
 * This example demonstrates how to update all six pillars of an AI agent at runtime.
 * All updates automatically propagate to all communication channels.
 */

import { AIReceptionist } from '../src';

async function main() {
  // Create an AI receptionist
  const sarah = new AIReceptionist({
    agent: {
      identity: {
        name: 'Sarah',
        role: 'Sales Representative',
        title: 'Junior Sales Rep'
      },
      personality: {
        traits: ['professional', 'friendly'],
        communicationStyle: { primary: 'consultative', formalityLevel: 6 }
      },
      knowledge: {
        domain: 'SaaS Sales',
        expertise: ['product demos', 'pricing'],
        languages: ['English']
      },
      goals: {
        primary: 'Qualify leads and book demos'
      }
    },
    model: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4'
    }
  });

  await sarah.initialize();

  console.log('=== Initial Agent State ===');
  const initialState = sarah.getAgent().getState();
  console.log('Role:', initialState.identity.role);
  console.log('Title:', initialState.identity.title);
  console.log('\n');

  // ============================================================================
  // 1. PERSONALITY PILLAR UPDATES
  // ============================================================================

  console.log('=== Updating Personality ===');

  // Add a new trait
  await sarah.pillars.addPersonalityTrait('enthusiastic');
  console.log('✓ Added trait: enthusiastic');

  // Update formality (make more casual after building rapport)
  await sarah.pillars.setFormalityLevel(4);
  console.log('✓ Reduced formality to level 4');

  // Update communication style
  await sarah.pillars.updateCommunicationStyle({
    primary: 'empathetic',
    tone: 'friendly'
  });
  console.log('✓ Updated to empathetic, friendly style');
  console.log('\n');

  // ============================================================================
  // 2. IDENTITY PILLAR UPDATES
  // ============================================================================

  console.log('=== Updating Identity ===');

  // Promote Sarah!
  await sarah.pillars.updateTitle('Senior Sales Representative');
  console.log('✓ Promoted to Senior Sales Representative');

  // Update authority level
  await sarah.pillars.setAuthorityLevel('high');
  console.log('✓ Authority level increased to high');

  // Add a specialization
  await sarah.pillars.addSpecialization('Enterprise Sales');
  console.log('✓ Added specialization: Enterprise Sales');
  console.log('\n');

  // ============================================================================
  // 3. KNOWLEDGE PILLAR UPDATES
  // ============================================================================

  console.log('=== Updating Knowledge ===');

  // Add new areas of expertise
  await sarah.pillars.addExpertise('contract negotiation');
  console.log('✓ Added expertise: contract negotiation');

  await sarah.pillars.addExpertise('ROI analysis');
  console.log('✓ Added expertise: ROI analysis');

  // Add a new language
  await sarah.pillars.addLanguage('Spanish', 'conversational');
  console.log('✓ Added language: Spanish (conversational)');

  // Add industry knowledge
  await sarah.pillars.addIndustry('Healthcare');
  console.log('✓ Added industry: Healthcare');
  console.log('\n');

  // ============================================================================
  // 4. GOALS PILLAR UPDATES
  // ============================================================================

  console.log('=== Updating Goals ===');

  // Add a new goal
  await sarah.pillars.addGoal({
    name: 'Upsell Existing Customers',
    description: 'Identify expansion opportunities in current accounts',
    type: 'secondary',
    priority: 2,
    constraints: ['Only suggest features the customer needs']
  });
  console.log('✓ Added goal: Upsell Existing Customers');
  console.log('\n');

  // ============================================================================
  // 5. MEMORY PILLAR UPDATES
  // ============================================================================

  console.log('=== Managing Memory ===');

  // Clear short-term memory (e.g., between different customer conversations)
  await sarah.pillars.clearShortTermMemory();
  console.log('✓ Cleared short-term memory');
  console.log('\n');

  // ============================================================================
  // 6. BATCH UPDATES
  // ============================================================================

  console.log('=== Batch Personality Update ===');

  // Update multiple personality settings at once
  await sarah.pillars.updatePersonality({
    traits: [
      'confident',
      'results-driven',
      { name: 'consultative', description: 'Asks thoughtful questions', weight: 0.9 }
    ],
    communicationStyle: {
      primary: 'consultative',
      formalityLevel: 7
    }
  });
  console.log('✓ Updated personality with multiple changes');
  console.log('\n');

  // ============================================================================
  // VERIFY CHANGES
  // ============================================================================

  console.log('=== Final Agent State ===');
  const finalState = sarah.getAgent().getState();
  console.log('Title:', finalState.identity.title);
  console.log('Authority:', finalState.identity.authorityLevel);
  console.log('Goals:', finalState.currentGoals.map(g => g.name).join(', '));
  console.log('\n');

  // ============================================================================
  // TEST ACROSS CHANNELS
  // ============================================================================

  console.log('=== Testing Across Channels ===');

  // The updates automatically propagate to all channels!
  const textResponse = await sarah.text.generate({
    prompt: 'Tell me about yourself and what you can help me with.'
  });

  console.log('Response via text channel:');
  console.log(textResponse.text);
  console.log('\n');

  // If you had calls or email configured, the same updated personality
  // would apply there too:
  // await sarah.calls.make({ to: '+1234567890' }); // Uses updated personality
  // await sarah.sms.send({ to: '+1234567890', body: 'Hi!' }); // Uses updated personality

  console.log('✓ All pillar updates successfully propagated to all channels!');

  await sarah.dispose();
}

// Run the example
main().catch(console.error);
