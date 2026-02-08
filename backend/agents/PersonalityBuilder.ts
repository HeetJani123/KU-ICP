/**
 * PersonalityBuilder - Generate unique personalities for new agents
 */

import { generateAgentPersonality } from '../utils/gemini.js';

interface NewAgentPersonality {
  name: string;
  age: number;
  personality_traits: string[];
  core_desire: string;
  deepest_fear: string;
  secret: string;
  hidden_gift: string;
  personal_challenge: string;
  talents: {
    social: number;
    creative: number;
    analytical: number;
    physical: number;
    emotional_intelligence: number;
  };
  wealth_class: 'struggling' | 'working_class' | 'middle_class' | 'comfortable' | 'wealthy';
  initial_location: string;
  appearance: string;
  backstory: string;
}

export class PersonalityBuilder {
  private usedNames: Set<string> = new Set();

  /**
   * Generate a complete personality for a new agent
   */
  async generatePersonality(
    existingAgents: string[],
    worldContext: { day: number; season: string; population: number }
  ): Promise<NewAgentPersonality | null> {
    try {
      // Build context for AI
      const context = this.buildGenerationContext(existingAgents, worldContext);

      // Call Gemini to generate personality
      const generated = await generateAgentPersonality(context);

      if (!generated) {
        console.error('Failed to generate personality');
        return null;
      }

      // Validate and ensure name is unique
      let finalName = generated.name;
      let attempts = 0;
      while (this.usedNames.has(finalName) && attempts < 5) {
        finalName = this.generateUniqueName();
        attempts++;
      }
      this.usedNames.add(finalName);

      // Build complete personality
      const personality: NewAgentPersonality = {
        name: finalName,
        age: this.generateAge(),
        personality_traits: generated.personality_traits || this.generateTraits(),
        core_desire: generated.core_desire || 'To find purpose',
        deepest_fear: generated.deepest_fear || 'Being forgotten',
        secret: generated.secret || 'A mystery from their past',
        hidden_gift: generated.hidden_gift || 'An untapped talent',
        personal_challenge: generated.personal_challenge || 'Finding their place',
        talents: generated.talents || this.generateTalents(),
        wealth_class: generated.wealth_class || this.randomWealthClass(),
        initial_location: this.chooseInitialLocation(),
        appearance: generated.appearance || 'An unremarkable appearance',
        backstory: generated.backstory || 'They arrived in town seeking a fresh start.',
      };

      console.log(`✨ Generated new agent: ${personality.name}`);
      console.log(`   Traits: ${personality.personality_traits.join(', ')}`);
      console.log(`   Core desire: ${personality.core_desire}`);

      return personality;
    } catch (error) {
      console.error('Error generating personality:', error);
      return this.generateFallbackPersonality();
    }
  }

  /**
   * Build context for personality generation
   */
  private buildGenerationContext(
    existingAgents: string[],
    worldContext: { day: number; season: string; population: number }
  ): string {
    let context = `Generate a unique personality for a new agent in Simcity.AI.\n\n`;

    context += `World Context:\n`;
    context += `- Day: ${worldContext.day}\n`;
    context += `- Season: ${worldContext.season}\n`;
    context += `- Current population: ${worldContext.population}\n\n`;

    if (existingAgents.length > 0) {
      context += `Existing agents (ensure this new agent is distinct):\n`;
      existingAgents.forEach(name => {
        context += `- ${name}\n`;
      });
      context += `\n`;
    }

    context += `Requirements:\n`;
    context += `- Create a complex, flawed, REAL person\n`;
    context += `- Give them internal contradictions\n`;
    context += `- Make their personality distinct from existing agents\n`;
    context += `- Include hidden depths and secrets\n`;
    context += `- They should feel like someone you might actually meet\n`;
    context += `- Avoid generic or stereotypical personalities\n`;

    return context;
  }

  /**
   * Generate random age (18-70)
   */
  private generateAge(): number {
    // Weighted towards 25-45 range
    const rand = Math.random();
    if (rand < 0.6) {
      return 25 + Math.floor(Math.random() * 20); // 25-44
    } else if (rand < 0.85) {
      return 18 + Math.floor(Math.random() * 7); // 18-24
    } else {
      return 45 + Math.floor(Math.random() * 25); // 45-69
    }
  }

  /**
   * Generate random personality traits
   */
  private generateTraits(): string[] {
    const allTraits = [
      'anxious', 'confident', 'cynical', 'optimistic', 'introverted', 'extroverted',
      'creative', 'analytical', 'impulsive', 'cautious', 'ambitious', 'content',
      'rebellious', 'conformist', 'empathetic', 'detached', 'passionate', 'reserved',
      'curious', 'indifferent', 'perfectionist', 'laid-back', 'stubborn', 'flexible'
    ];

    // Pick 5-7 traits
    const count = 5 + Math.floor(Math.random() * 3);
    const shuffled = allTraits.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Generate talent scores (1-100)
   */
  private generateTalents(): NewAgentPersonality['talents'] {
    return {
      social: this.randomTalentScore(),
      creative: this.randomTalentScore(),
      analytical: this.randomTalentScore(),
      physical: this.randomTalentScore(),
      emotional_intelligence: this.randomTalentScore(),
    };
  }

  private randomTalentScore(): number {
    // Bell curve distribution (30-70 most common)
    const rand1 = Math.random();
    const rand2 = Math.random();
    const gaussian = (rand1 + rand2) / 2;
    return Math.floor(gaussian * 100);
  }

  /**
   * Random wealth class (weighted towards middle)
   */
  private randomWealthClass(): NewAgentPersonality['wealth_class'] {
    const rand = Math.random();
    if (rand < 0.15) return 'struggling';
    if (rand < 0.35) return 'working_class';
    if (rand < 0.70) return 'middle_class';
    if (rand < 0.90) return 'comfortable';
    return 'wealthy';
  }

  /**
   * Choose initial spawn location
   */
  private chooseInitialLocation(): string {
    const locations = [
      'Town Square',
      'Cozy Cafe',
      'Public Library',
      'Community Park',
      'Corner Store',
      'Art Gallery',
      'Town Hall',
      'Riverside Path',
    ];

    return locations[Math.floor(Math.random() * locations.length)];
  }

  /**
   * Generate a unique name
   */
  private generateUniqueName(): string {
    const firstNames = [
      'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
      'Sage', 'Dakota', 'Rowan', 'Phoenix', 'River', 'Sky', 'Blair', 'Drew',
      'Eden', 'Harper', 'Reese', 'Blake', 'Charlie', 'Finley', 'Hayden', 'Kai'
    ];

    const lastNames = [
      'Chen', 'Patel', 'Silva', 'Kim', 'Okafor', 'Rivera', 'Nakamura', 'Martinez',
      'Cohen', 'Ali', 'Dubois', 'Sato', 'Kowalski', 'Hansen', 'Rossi', 'Santos',
      'Nguyen', 'Walsh', 'Berg', 'Yamamoto', 'Fernandez', 'Shah', 'Larsen', 'Wu'
    ];

    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];

    return `${first} ${last}`;
  }

  /**
   * Fallback personality if AI generation fails
   */
  private generateFallbackPersonality(): NewAgentPersonality {
    return {
      name: this.generateUniqueName(),
      age: this.generateAge(),
      personality_traits: this.generateTraits(),
      core_desire: 'To find meaning in life',
      deepest_fear: 'Being alone forever',
      secret: 'A past they prefer not to discuss',
      hidden_gift: 'An ability they haven\'t discovered yet',
      personal_challenge: 'Learning to trust others',
      talents: this.generateTalents(),
      wealth_class: this.randomWealthClass(),
      initial_location: this.chooseInitialLocation(),
      appearance: 'A face that blends into any crowd',
      backstory: 'They arrived in Simcity.AI seeking a fresh start, leaving behind a life they no longer recognize as their own.',
    };
  }

  /**
   * Track used names to avoid duplicates
   */
  addExistingName(name: string): void {
    this.usedNames.add(name);
  }

  /**
   * Clear name cache (useful for testing)
   */
  clearNameCache(): void {
    this.usedNames.clear();
  }
}
