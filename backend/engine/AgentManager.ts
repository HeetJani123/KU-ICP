/**
 * AgentManager - Manages all living agents and their lifecycle
 */

import supabase from '../utils/supabase.js';
import { starterAgents } from '../data/starterAgents.js';

export interface Agent {
  id: string;
  name: string;
  personality: any;
  physical_state: {
    health: number;
    hunger: number;
    energy: number;
    age: number;
  };
  mental_state: {
    mood: string;
    mood_score: number;
    current_thought: string;
    worries: string[];
    desires: string[];
    secrets: string[];
  };
  starting_conditions: any;
  current_location: string;
  current_activity: string;
  relationships_summary: Record<string, string>;
  is_alive: boolean;
  born_on_day: number;
  died_on_day: number | null;
  death_cause: string | null;
  profession?: string | null;
  spouse?: string | null;
  children?: string[];
  parents?: string[];
  relationships?: Record<string, { affinity: number; interactions: number }>;
}

export class AgentManager {
  private agents: Map<string, Agent> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize agents - load from database or create starters
   */
  async initialize(): Promise<void> {
    console.log('🧠 Initializing AgentManager...');

    // Try to load existing agents from database
    const { data: existingAgents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('is_alive', true);

    if (error) {
      console.error('Error loading agents:', error);
    }

    if (existingAgents && existingAgents.length > 0) {
      // Load existing agents
      existingAgents.forEach(agent => {
        this.agents.set(agent.id, agent as Agent);
      });
      console.log(`✅ Loaded ${existingAgents.length} existing agents`);
    } else {
      // Create starter agents
      console.log('🌱 Creating starter agents...');
      await this.createStarterAgents();
    }

    this.initialized = true;
  }

  /**
   * Create the 6 starter agents
   */
  private async createStarterAgents(): Promise<void> {
    for (const starterData of starterAgents) {
      const agent = {
        name: starterData.name,
        personality: starterData.personality,
        physical_state: {
          health: starterData.talents.physical_health,
          hunger: 30,
          energy: 80,
          age: 0,
        },
        mental_state: {
          mood: 'curious',
          mood_score: 20,
          current_thought: 'A new day begins...',
          worries: starterData.worries,
          desires: starterData.desires,
          secrets: starterData.secrets,
        },
        starting_conditions: {
          wealth: starterData.wealth,
          natural_talent: starterData.talents,
          challenges: starterData.challenges,
          hidden_gift: starterData.hidden_gift,
          hidden_gift_unlocked: false,
        },
        current_location: 'homes',
        current_activity: 'waking up',
        relationships_summary: {},
        is_alive: true,
        born_on_day: 1,
      };

      const { data, error } = await supabase
        .from('agents')
        .insert([agent])
        .select()
        .single();

      if (error) {
        console.error(`Error creating agent ${starterData.name}:`, error);
      } else {
        this.agents.set(data.id, data as Agent);
        console.log(`✅ Created agent: ${starterData.name}`);
      }
    }
  }

  /**
   * Get all living agents
   */
  getLivingAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(a => a.is_alive);
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  /**
   * Update agent
   */
  updateAgent(id: string, updates: Partial<Agent>): void {
    const agent = this.agents.get(id);
    if (agent) {
      Object.assign(agent, updates);
      this.agents.set(id, agent);
    }
  }

  /**
   * Remove agent from simulation (when dead)
   */
  removeAgent(id: string): void {
    this.agents.delete(id);
  }

  /**
   * Get agents at a specific location
   */
  getAgentsAt(location: string): Agent[] {
    return this.getLivingAgents().filter(a => a.current_location === location);
  }

  /**
   * Update physical needs for all agents
   */
  updatePhysicalNeeds(isNighttime: boolean): void {
    for (const agent of this.getLivingAgents()) {
      // Slower hunger increase (was 3, now 0.5)
      agent.physical_state.hunger = Math.min(100, agent.physical_state.hunger + 0.5);

      // Decrease energy (faster at night if not sleeping)
      if (isNighttime && agent.current_activity !== 'sleeping') {
        agent.physical_state.energy = Math.max(0, agent.physical_state.energy - 1.5); // was 5
      } else if (agent.current_activity === 'sleeping') {
        agent.physical_state.energy = Math.min(100, agent.physical_state.energy + 45); // was 10, much better rest
      } else {
        agent.physical_state.energy = Math.max(0, agent.physical_state.energy - 0.8); // was 2
      }

      // Health regeneration when well-fed and rested
      if (agent.physical_state.hunger < 30 && agent.physical_state.energy > 60) {
        agent.physical_state.health = Math.min(100, agent.physical_state.health + 0.5);
      }

      // Health decline only if critically hungry (was 80, now 90)
      if (agent.physical_state.hunger > 90) {
        agent.physical_state.health = Math.max(0, agent.physical_state.health - 1.5);
      }

      // Slower health decline from low energy
      if (agent.physical_state.energy < 10) {
        agent.physical_state.health = Math.max(0, agent.physical_state.health - 0.3); // was implicit 1
      }

      // Mood recovery when needs are met
      if (agent.physical_state.hunger < 40 && agent.physical_state.energy > 50 && agent.physical_state.health > 60) {
        agent.mental_state.mood_score = Math.min(100, agent.mental_state.mood_score + 1);
      }

      // Age increment
      agent.physical_state.age += 1;

      this.agents.set(agent.id, agent);
    }
  }

  /**
   * Determine which agents need AI decisions this tick
   */
  getAgentsNeedingDecisions(): Agent[] {
    return this.getLivingAgents().filter(agent => {
      // Skip if sleeping
      if (agent.current_activity === 'sleeping') return false;
      
      // Skip if eating
      if (agent.current_activity === 'eating') return false;
      
      // Skip if in active conversation
      if (agent.current_activity === 'in_conversation') return false;

      // Skip if energy is too low (will auto-sleep)
      if (agent.physical_state.energy < 10) {
        agent.current_activity = 'sleeping';
        this.agents.set(agent.id, agent);
        return false;
      }

      return true;
    });
  }

  /**
   * Save all agents to database
   */
  async saveToDatabase(): Promise<void> {
    const agentArray = Array.from(this.agents.values());
    
    for (const agent of agentArray) {
      const { error } = await supabase
        .from('agents')
        .update({
          physical_state: agent.physical_state,
          mental_state: agent.mental_state,
          current_location: agent.current_location,
          current_activity: agent.current_activity,
          relationships_summary: agent.relationships_summary,
          updated_at: new Date().toISOString(),
        })
        .eq('id', agent.id);

      if (error) {
        console.error(`Error saving agent ${agent.name}:`, error);
      }
    }
  }

  /**
   * Get all agents as array (for serialization)
   */
  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Create a new agent (for births)
   */
  async createAgent(personality: any): Promise<Agent | null> {
    try {
      const { data: worldState } = await supabase
        .from('world_state')
        .select('current_day')
        .eq('id', 1)
        .single();

      const newAgent: Agent = {
        id: crypto.randomUUID(),
        name: personality.name,
        personality: {
          traits: personality.personality_traits,
          core_desire: personality.core_desire,
          deepest_fear: personality.deepest_fear,
          secret: personality.secret,
          hidden_gift: personality.hidden_gift,
          personal_challenge: personality.personal_challenge,
          appearance: personality.appearance,
          backstory: personality.backstory,
        },
        physical_state: {
          health: 100,
          hunger: 20,
          energy: 100,
          age: personality.age,
        },
        mental_state: {
          mood: 'curious',
          mood_score: 60,
          current_thought: 'A new beginning...',
          worries: [personality.deepest_fear],
          desires: [personality.core_desire],
          secrets: [personality.secret],
        },
        starting_conditions: {
          wealth_class: personality.wealth_class,
          talents: personality.talents,
        },
        current_location: personality.initial_location,
        current_activity: 'arriving in town',
        relationships_summary: {},
        is_alive: true,
        born_on_day: worldState?.current_day || 1,
        died_on_day: null,
        death_cause: null,
      };

      // Insert into database
      const { error } = await supabase
        .from('agents')
        .insert([{
          id: newAgent.id,
          name: newAgent.name,
          personality: newAgent.personality,
          physical_state: newAgent.physical_state,
          mental_state: newAgent.mental_state,
          starting_conditions: newAgent.starting_conditions,
          current_location: newAgent.current_location,
          current_activity: newAgent.current_activity,
          relationships_summary: newAgent.relationships_summary,
          is_alive: true,
          born_on_day: newAgent.born_on_day,
        }]);

      if (error) {
        console.error('Error creating agent:', error);
        return null;
      }

      // Add to memory
      this.agents.set(newAgent.id, newAgent);
      return newAgent;

    } catch (error) {
      console.error('Error in createAgent:', error);
      return null;
    }
  }

  /**
   * Mark agent as in conversation
   */
  markInConversation(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.current_activity = 'in_conversation';
      this.agents.set(agentId, agent);
    }
  }

  /**
   * Mark agent conversation ended
   */
  endConversation(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.current_activity = 'idle';
      this.agents.set(agentId, agent);
    }
  }
}
