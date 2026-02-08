/**
 * EventManager - Handles life events, death checks, and birth triggers
 */

import { Agent, AgentManager } from './AgentManager.js';

export interface RewardEvent {
  type: 'health_boost' | 'mood_boost' | 'energy_boost' | 'community_bonus';
  agentName: string;
  action: string;
  bonus: string;
  beneficiaries: 'all' | 'agent' | 'nearby';
}

export class EventManager {
  private deathQueue: Set<string> = new Set();
  private birthScheduled: boolean = false;
  private ticksSinceLastBirth: number = 0;
  private agentManager: AgentManager;
  private rewardCallback?: (reward: RewardEvent) => void;

  constructor(agentManager: AgentManager) {
    this.agentManager = agentManager;
  }

  setRewardCallback(callback: (reward: RewardEvent) => void): void {
    this.rewardCallback = callback;
  }

  /**
   * Check for death conditions on all agents
   */
  async checkDeathConditions(): Promise<Array<{id: string, name: string, cause: string}>> {
    const agents = this.agentManager.getAgents();
    const deaths: Array<{id: string, name: string, cause: string}> = [];

    for (const agent of agents) {
      // Health-based death
      if (agent.physical_state.health <= 0) {
        deaths.push({ id: agent.id, name: agent.name, cause: 'health failure' });
        console.log(`💀 ${agent.name} is dying (health reached 0)`);
        continue;
      }

      // Age-based death (after 300 ticks, increasing chance)
      if (agent.physical_state.age > 300) {
        const deathChance = (agent.physical_state.age - 300) * 0.002;
        if (Math.random() < deathChance) {
          deaths.push({ id: agent.id, name: agent.name, cause: 'old age' });
          console.log(`💀 ${agent.name} is dying (old age)`);
          continue;
        }
      }

      // Neglect-based death (deeply negative mood for 20+ ticks with no interaction)
      // TODO: Implement this check when we have mood tracking history
    }

    return deaths;
  }

  /**
   * Check if we should spawn a new agent
   */
  shouldSpawnNewAgent(): boolean {
    const agents = this.agentManager.getAgents();
    
    // Don't spawn if we already have 10+ agents
    if (agents.length >= 10) return false;

    // Simple 5% chance each tick if population is below 8
    if (agents.length < 8 && Math.random() < 0.05) {
      return true;
    }

    return false;
  }

  /**
   * Reset birth flag
   */
  resetBirthFlag(): void {
    this.birthScheduled = false;
  }

  /**
   * Check for hidden gift unlock conditions
   */
  checkHiddenGiftUnlocks(agent: Agent, context: any): boolean {
    if (agent.starting_conditions.hidden_gift_unlocked) {
      return false;
    }

    // TODO: Implement specific unlock conditions based on gift type
    // For now, just return false
    return false;
  }

  /**
   * Generate random life event
   */
  generateRandomEvent(): string | null {
    // 5% chance of a random event per tick
    if (Math.random() > 0.05) return null;

    const events = [
      'found a forgotten memory',
      'had a sudden realization',
      'noticed something beautiful',
      'felt a wave of nostalgia',
      'wondered about their purpose',
      'remembered a dream from last night',
      'felt grateful for something small',
      'questioned a long-held belief',
    ];

    return events[Math.floor(Math.random() * events.length)];
  }

  /**
   * Determine death cause based on agent state
   */
  determineDeathCause(agent: Agent): string {
    if (agent.physical_state.health <= 0) {
      if (agent.physical_state.hunger > 80) {
        return 'starvation';
      }
      return 'illness';
    }

    if (agent.physical_state.age > 300) {
      return 'old age';
    }

    if (agent.mental_state.mood_score < -80) {
      return 'gave up on life';
    }

    return 'unknown causes';
  }

  /**
   * Check if it's time to generate a chronicle chapter
   */
  shouldGenerateChronicle(currentDay: number): boolean {
    // Generate every 20 days
    return currentDay > 0 && currentDay % 20 === 0;
  }

  /**
   * Check if agent should write a diary entry tonight
   */
  shouldWriteDiary(agent: Agent, isNighttime: boolean): boolean {
    // Some agents journal more than others based on personality
    if (!isNighttime) return false;
    
    // 30% chance per night for now
    return Math.random() < 0.3;
  }

  /**
   * Evaluate action and potentially trigger rewards
   */
  evaluateActionForReward(agent: Agent, action: string, target?: Agent): void {
    const agents = this.agentManager.getAgents();
    let rewardTriggered = false;

    // Helper actions that help others
    if (action === 'help' || action === 'heal' || action === 'teach') {
      const healthBoost = 5;
      agents.forEach(a => {
        a.physical_state.health = Math.min(100, a.physical_state.health + healthBoost);
        this.agentManager.updateAgent(a.id, { physical_state: a.physical_state });
      });

      if (this.rewardCallback) {
        this.rewardCallback({
          type: 'health_boost',
          agentName: agent.name,
          action: action === 'heal' ? 'healed someone' : action === 'teach' ? 'taught valuable knowledge' : 'helped a neighbor',
          bonus: '+5 health to everyone',
          beneficiaries: 'all'
        });
      }
      rewardTriggered = true;
    }

    // Creative work that inspires (only 20% chance to avoid spam)
    if ((action === 'create_something' || action === 'write') && Math.random() < 0.2) {
      const moodBoost = 8;
      agents.forEach(a => {
        a.mental_state.mood_score = Math.min(100, a.mental_state.mood_score + moodBoost);
        this.agentManager.updateAgent(a.id, { mental_state: a.mental_state });
      });

      if (this.rewardCallback) {
        this.rewardCallback({
          type: 'mood_boost',
          agentName: agent.name,
          action: 'created inspiring art',
          bonus: '+8 mood to everyone',
          beneficiaries: 'all'
        });
      }
      rewardTriggered = true;
    }

    // Generous actions (sharing, donating)
    if (action === 'share' || action === 'donate' || action === 'give') {
      const energyBoost = 6;
      agents.forEach(a => {
        a.physical_state.energy = Math.min(100, a.physical_state.energy + energyBoost);
        this.agentManager.updateAgent(a.id, { physical_state: a.physical_state });
      });

      if (this.rewardCallback) {
        this.rewardCallback({
          type: 'energy_boost',
          agentName: agent.name,
          action: 'shared resources with the community',
          bonus: '+6 energy to everyone',
          beneficiaries: 'all'
        });
      }
      rewardTriggered = true;
    }

    // Positive conversations that build community (30% chance)
    if (action === 'talk' && target && Math.random() < 0.3) {
      // Check if conversation was positive (based on mood)
      if (agent.mental_state.mood_score > 50 && target.mental_state.mood_score > 50) {
        const bonus = 4;
        agents.forEach(a => {
          a.mental_state.mood_score = Math.min(100, a.mental_state.mood_score + bonus);
          this.agentManager.updateAgent(a.id, { mental_state: a.mental_state });
        });

        if (this.rewardCallback) {
          this.rewardCallback({
            type: 'community_bonus',
            agentName: `${agent.name} & ${target.name}`,
            action: 'had a heartwarming conversation',
            bonus: '+4 mood to everyone',
            beneficiaries: 'all'
          });
        }
        rewardTriggered = true;
      }
    }

    // Working (profession-based community benefits)
    if (action === 'work' && agent.profession) {
      let applied = false;

      if (agent.profession === 'healer' && Math.random() < 0.15) {
        agents.forEach(a => {
          a.physical_state.health = Math.min(100, a.physical_state.health + 3);
          this.agentManager.updateAgent(a.id, { physical_state: a.physical_state });
        });
        if (this.rewardCallback) {
          this.rewardCallback({
            type: 'health_boost',
            agentName: agent.name,
            action: 'provided excellent healthcare',
            bonus: '+3 health to everyone',
            beneficiaries: 'all'
          });
        }
        applied = true;
      }

      if (agent.profession === 'farmer' && Math.random() < 0.15) {
        agents.forEach(a => {
          a.physical_state.hunger = Math.max(0, a.physical_state.hunger - 5);
          this.agentManager.updateAgent(a.id, { physical_state: a.physical_state });
        });
        if (this.rewardCallback) {
          this.rewardCallback({
            type: 'community_bonus',
            agentName: agent.name,
            action: 'harvested bountiful crops',
            bonus: '-5 hunger to everyone',
            beneficiaries: 'all'
          });
        }
        applied = true;
      }

      if (agent.profession === 'scholar' && Math.random() < 0.12) {
        agents.forEach(a => {
          a.mental_state.mood_score = Math.min(100, a.mental_state.mood_score + 5);
          this.agentManager.updateAgent(a.id, { mental_state: a.mental_state });
        });
        if (this.rewardCallback) {
          this.rewardCallback({
            type: 'mood_boost',
            agentName: agent.name,
            action: 'shared enlightening knowledge',
            bonus: '+5 mood to everyone',
            beneficiaries: 'all'
          });
        }
        applied = true;
      }

      rewardTriggered = applied;
    }
  }
}
