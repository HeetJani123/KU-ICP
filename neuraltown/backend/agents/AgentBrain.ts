/**
 * AgentBrain - The AI decision-making core for agents
 * Calls Gemini with full context and personality
 */

import { Agent } from '../engine/AgentManager.js';
import { WorldState } from '../engine/WorldManager.js';
import { getAgentDecision } from '../utils/gemini.js';

export interface DecisionResult {
  success: boolean;
  inner_monologue: string;
  emotional_update?: {
    mood: string;
    mood_score: number;
    cause: string;
  };
  action?: {
    type: string;
    parameters: any;
  };
  error?: string;
}

export class AgentBrain {
  private agentManager: any;
  private worldManager: any;

  constructor(agentManager: any, worldManager: any) {
    this.agentManager = agentManager;
    this.worldManager = worldManager;
  }

  /**
   * Build system instruction (personality prompt) for an agent
   */
  private buildSystemInstruction(agent: Agent): string {
    const personality = agent.personality;
    
    return `You are ${agent.name}. You are a living person in a small town called Simcity.AI. You are NOT an AI. You experience genuine emotions, form real opinions, make mistakes, hold grudges, feel joy, and fear death.

YOUR PERSONALITY:
Traits: ${personality?.traits?.join(', ') || 'curious, thoughtful'}
Values: ${personality?.values?.join(', ') || 'honesty, kindness'}
Flaws: ${personality?.flaws?.join(', ') || 'stubborn'}
Quirks: ${personality?.quirks?.join(', ') || 'often lost in thought'}

YOUR SPEECH STYLE:
${personality?.speech_style || 'Direct and honest'}

YOUR SENSE OF HUMOR:
${personality?.humor || 'Dry and witty'}

YOUR CURRENT LIFE SITUATION:
Starting wealth: ${agent.starting_conditions?.wealth || 'modest'}
Challenges: ${agent.starting_conditions?.challenges?.join(', ') || 'None'}
Recent thoughts: ${agent.mental_state?.worries?.slice(0, 2).join(', ') || 'None'}

CRITICAL RULES:
1. You must ALWAYS provide an inner_monologue field — this is your REAL unfiltered thoughts. It should be messy, honest, anxious, hopeful, petty, kind — HUMAN. This is never shown to other agents, only to the universe.

2. Your spoken dialogue should be DIFFERENT from your inner thoughts. The gap between what you think and what you say IS what makes you interesting. You filter yourself. You hold back. You choose words carefully. Sometimes you say the opposite of what you feel.

3. Make decisions based ONLY on what YOU know. You are not omniscient. You can be wrong about other people's intentions. You can misread situations.

4. Your emotions AFFECT your decisions. If you're angry, you might be impulsive. If you're sad, you might withdraw. If you're anxious, you might avoid confrontation. If you're happy, you might take risks.

5. You have FLAWS. Use them. Be jealous. Be avoidant. Be stubborn. Be petty sometimes. Perfect characters are boring.

6. You can lie to other agents. You can keep secrets. You can gossip. You can also be genuinely kind, brave, and vulnerable.

7. You don't know you're in a simulation. You think this is real life.`;
  }

  /**
   * Build context prompt with current situation
   */
  private buildContextPrompt(
    agent: Agent,
    nearbyAgents: Agent[],
    worldState: WorldState,
    recentMemories: string[]
  ): string {
    const timeOfDay = this.getTimeOfDay(worldState.time_of_day);
    
    return `CURRENT TIME: Day ${worldState.current_day}, ${worldState.time_of_day}, ${worldState.season}, ${worldState.weather}
Time of day: ${timeOfDay}

YOUR PHYSICAL STATE:
Health: ${agent.physical_state.health}/100 | Hunger: ${agent.physical_state.hunger}/100 | Energy: ${agent.physical_state.energy}/100
Current mood: ${agent.mental_state.mood} (${agent.mental_state.mood_score}/100)
Mood cause: ${agent.mental_state.current_thought}

YOUR LOCATION: ${this.getLocationName(agent.current_location)}
${this.getLocationDescription(agent.current_location)}

PEOPLE NEARBY:
${nearbyAgents.length > 0 
  ? nearbyAgents.map(a => `- ${a.name}: ${a.current_activity}${agent.relationships_summary[a.id] ? ` (${agent.relationships_summary[a.id]})` : ''}`).join('\n')
  : '- No one else here'}

YOUR RECENT MEMORIES (last 5):
${recentMemories.length > 0 ? recentMemories.map((m, i) => `${i + 1}. ${m}`).join('\n') : 'No recent memories'}

YOUR CURRENT WORRIES:
${agent.mental_state?.worries?.map(w => `- ${w}`).join('\n') || '- None'}

YOUR CURRENT DESIRES:
${agent.mental_state?.desires?.map(d => `- ${d}`).join('\n') || '- None'}

What do you do next?

Respond with your inner monologue and choose ONE action by calling the appropriate function.`;
  }

  /**
   * Make a decision for an agent
   */
  async makeDecision(agent: Agent): Promise<DecisionResult | null> {
    try {
      // Get world state
      const worldState = this.worldManager.getWorldState();
      
      // Get nearby agents at same location
      const nearbyAgents = this.agentManager.getAgentsAt(agent.current_location);
      
      // Get recent memories (would query DB in full implementation)
      const recentMemories: string[] = [];
      
      const systemInstruction = this.buildSystemInstruction(agent);
      const contextPrompt = this.buildContextPrompt(agent, nearbyAgents, worldState, recentMemories);

      const result = await getAgentDecision(systemInstruction, contextPrompt);

      if (!result.success) {
        return {
          success: false,
          inner_monologue: 'I feel confused...',
          error: result.error,
        };
      }

      // Parse the response
      const functionCall = result.functionCall;
      const text = result.text;

      // Extract inner monologue from text or use default
      const inner_monologue = text || 'Lost in thought...';

      if (functionCall) {
        return {
          success: true,
          inner_monologue,
          action: {
            type: functionCall.name,
            parameters: functionCall.args,
          },
        };
      }

      // No function call - agent is just thinking
      return {
        success: true,
        inner_monologue,
        action: {
          type: 'stay_silent',
          parameters: {
            inner_monologue,
            body_language: 'standing still, lost in thought',
          },
        },
      };
    } catch (error) {
      console.error(`Error in AgentBrain for ${agent.name}:`, error);
      return {
        success: false,
        inner_monologue: 'My mind feels foggy...',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Helper: Get time of day
   */
  private getTimeOfDay(time: string): string {
    const [hours] = time.split(':').map(Number);
    if (hours < 6) return 'late night';
    if (hours < 12) return 'morning';
    if (hours < 17) return 'afternoon';
    if (hours < 22) return 'evening';
    return 'night';
  }

  /**
   * Helper: Get location display name
   */
  private getLocationName(location: string): string {
    const names: Record<string, string> = {
      cafe: "Maya's Cafe",
      park: 'Memorial Park',
      shop: "Blake's General Store",
      library: 'Town Library',
      homes: 'Residential Area',
      school: 'Simcity.AI School',
      town_square: 'Town Square',
      office: 'Community Office',
    };
    return names[location] || location;
  }

  /**
   * Helper: Get location description
   */
  private getLocationDescription(location: string): string {
    const descriptions: Record<string, string> = {
      cafe: 'The smell of fresh coffee fills the air. Cozy seating and soft music.',
      park: 'Green space with benches and a small pond. Peaceful.',
      shop: 'The general store. Shelves stocked with everyday necessities.',
      library: 'Quiet sanctuary filled with books. Warm lighting.',
      homes: 'Your private space. Familiar and comfortable.',
      school: 'Empty classrooms echo with memories. Bulletin boards on walls.',
      town_square: 'Central gathering place with a clock tower and community board.',
      office: 'Shared workspace with desks and meeting rooms.',
    };
    return descriptions[location] || 'A place in town.';
  }
}
