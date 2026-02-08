/**
 * AgentActions - Execute the actions that agents decide to take
 */

import { Agent, AgentManager } from '../engine/AgentManager.js';
import { EventManager } from '../engine/EventManager.js';
import supabase from '../utils/supabase.js';

export class AgentActions {
  constructor(
    private agentManager: AgentManager,
    private eventManager?: EventManager
  ) {}

  /**
   * Execute an action based on agent decision
   */
  async executeAction(agent: Agent, action: { type: string; parameters: any }): Promise<void> {
    console.log(`🎭 ${agent.name} → ${action.type}`, action.parameters);

    switch (action.type) {
      case 'go_to':
        await this.goTo(agent, action.parameters.location, action.parameters.reason);
        break;

      case 'start_conversation':
        // This will be handled by ConversationEngine
        console.log(`💬 ${agent.name} wants to talk to ${action.parameters.target_name}`);
        // Trigger reward check for positive conversations
        if (this.eventManager) {
          const target = this.agentManager.getAgents().find(a => a.name === action.parameters.target_name);
          if (target) {
            this.eventManager.evaluateActionForReward(agent, 'talk', target);
          }
        }
        break;

      case 'post_on_board':
        await this.postOnBoard(agent, action.parameters.content, action.parameters.post_type);
        break;

      case 'write_diary':
        await this.writeDiary(agent, action.parameters.content);
        if (this.eventManager) {
          this.eventManager.evaluateActionForReward(agent, 'write');
        }
        break;

      case 'stay_silent':
        await this.staySilent(agent, action.parameters.inner_monologue, action.parameters.body_language);
        break;

      case 'eat':
        await this.eat(agent, action.parameters.location);
        break;

      case 'sleep':
        await this.sleep(agent);
        break;

      case 'create_something':
        await this.createSomething(agent, action.parameters);
        if (this.eventManager) {
          this.eventManager.evaluateActionForReward(agent, 'create_something');
        }
        break;

      case 'reflect':
        await this.reflect(agent, action.parameters.about);
        break;

      case 'work':
        await this.work(agent, action.parameters?.location || agent.current_location);
        if (this.eventManager) {
          this.eventManager.evaluateActionForReward(agent, 'work');
        }
        break;

      default:
        console.log(`⚠️ Unknown action type: ${action.type}`);
    }
  }

  /**
   * Move to a different location
   */
  private async goTo(agent: Agent, location: string, reason: string): Promise<void> {
    const oldLocation = agent.current_location;
    agent.current_location = location;
    agent.current_activity = `moving to ${location}`;
    
    this.agentManager.updateAgent(agent.id, {
      current_location: location,
      current_activity: `at ${location}`,
    });

    // Create memory
    await this.createMemory(agent.id, `Went to ${location}. ${reason}`);
    
    console.log(`🚶 ${agent.name}: ${oldLocation} → ${location}`);
  }

  /**
   * Post on community board
   */
  private async postOnBoard(agent: Agent, content: string, postType: string): Promise<void> {
    // Get world state for current day
    const { data: worldState } = await supabase
      .from('world_state')
      .select('current_day')
      .eq('id', 1)
      .single();

    const { error } = await supabase
      .from('board_posts')
      .insert([{
        author_id: agent.id,
        day: worldState?.current_day || 1,
        content,
        post_type: postType,
        comments: [],
      }]);

    if (error) {
      console.error(`Error posting to board for ${agent.name}:`, error);
    } else {
      console.log(`📋 ${agent.name} posted: "${content.substring(0, 50)}..."`);
      await this.createMemory(agent.id, `Posted on the community board: ${content}`);
    }
  }

  /**
   * Write private diary entry
   */
  private async writeDiary(agent: Agent, content: string): Promise<void> {
    const { data: worldState } = await supabase
      .from('world_state')
      .select('current_day')
      .eq('id', 1)
      .single();

    const { error } = await supabase
      .from('diary_entries')
      .insert([{
        agent_id: agent.id,
        day: worldState?.current_day || 1,
        content,
      }]);

    if (error) {
      console.error(`Error writing diary for ${agent.name}:`, error);
    } else {
      console.log(`📔 ${agent.name} wrote in their diary`);
    }
  }

  /**
   * Stay silent and observe
   */
  private async staySilent(agent: Agent, innerMonologue: string, bodyLanguage: string): Promise<void> {
    agent.mental_state.current_thought = innerMonologue;
    agent.current_activity = bodyLanguage;
    
    this.agentManager.updateAgent(agent.id, {
      mental_state: agent.mental_state,
      current_activity: bodyLanguage,
    });

    console.log(`🤫 ${agent.name}: ${innerMonologue.substring(0, 60)}...`);
  }

  /**
   * Eat to reduce hunger
   */
  private async eat(agent: Agent, location: string): Promise<void> {
    agent.physical_state.hunger = Math.max(0, agent.physical_state.hunger - 35); // was 20
    agent.physical_state.health = Math.min(100, agent.physical_state.health + 8); // was implicit, now adds health
    agent.physical_state.energy = Math.max(0, agent.physical_state.energy - 3); // eating takes minimal energy
    agent.mental_state.mood_score = Math.min(100, agent.mental_state.mood_score + 5);
    agent.current_activity = 'eating';
    
    this.agentManager.updateAgent(agent.id, {
      physical_state: agent.physical_state,
      mental_state: agent.mental_state,
      current_activity: 'eating',
    });

    await this.createMemory(agent.id, `Had a meal at ${location}`);
    console.log(`🍽️ ${agent.name} is eating (hunger: ${agent.physical_state.hunger}, health: ${agent.physical_state.health})`);
  }

  /**
   * Sleep to restore energy
   */
  private async sleep(agent: Agent): Promise<void> {
    agent.current_activity = 'sleeping';
    
    this.agentManager.updateAgent(agent.id, {
      current_activity: 'sleeping',
    });

    console.log(`😴 ${agent.name} is sleeping`);
  }

  /**
   * Create something (art, writing, etc)
   */
  private async createSomething(agent: Agent, params: any): Promise<void> {
    const { type, description, about } = params;
    
    agent.current_activity = `creating a ${type}`;
    this.agentManager.updateAgent(agent.id, {
      current_activity: agent.current_activity,
    });

    const memoryText = `Created a ${type}: ${description}. About: ${about}`;
    await this.createMemory(agent.id, memoryText, 7); // Higher importance

    console.log(`🎨 ${agent.name} created a ${type}: ${description}`);
  }

  /**
   * Reflect deeply on something
   */
  private async reflect(agent: Agent, about: string): Promise<void> {
    agent.current_activity = 'deep in thought';
    this.agentManager.updateAgent(agent.id, {
      current_activity: 'reflecting',
    });

    await this.createMemory(agent.id, `Reflected on: ${about}`, 6);
    console.log(`💭 ${agent.name} is reflecting on: ${about}`);
  }

  /**
   * Work at profession
   */
  private async work(agent: Agent, location: string): Promise<void> {
    const profession = agent.profession || 'worker';
    const activities = {
      healer: 'treating patients',
      farmer: 'tending crops',
      scholar: 'studying texts',
      merchant: 'trading goods',
      artist: 'crafting art',
      craftsman: 'building things',
      leader: 'organizing community',
      worker: 'performing tasks'
    };

    const activity = activities[profession as keyof typeof activities] || 'working';
    agent.current_activity = activity;
    
    agent.physical_state.hunger = Math.min(100, agent.physical_state.hunger + 2);
    agent.physical_state.energy = Math.max(0, agent.physical_state.energy - 5);
    
    this.agentManager.updateAgent(agent.id, {
      current_activity: activity,
      physical_state: agent.physical_state
    });

    await this.createMemory(agent.id, `Worked as ${profession} at ${location}`, 5);
    console.log(`💼 ${agent.name} is ${activity} at ${location}`);
  }

  /**
   * Helper: Create a memory
   */
  private async createMemory(agentId: string, content: string, importance: number = 5): Promise<void> {
    const { data: worldState } = await supabase
      .from('world_state')
      .select('current_day')
      .eq('id', 1)
      .single();

    await supabase
      .from('memories')
      .insert([{
        agent_id: agentId,
        day: worldState?.current_day || 1,
        content,
        importance,
        emotional_impact: 'neutral',
      }]);
  }
}
