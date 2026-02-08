/**
 * SimulationEngine - The heart of Simcity.AI
 * Orchestrates all simulation systems and runs the main tick loop
 */

import cron from 'node-cron';
import supabase from '../utils/supabase.js';
import { WorldManager } from './WorldManager.js';
import { AgentManager } from './AgentManager.js';
import { EventManager } from './EventManager.js';
import { AgentBrain } from '../agents/AgentBrain.js';
import { AgentActions } from '../agents/AgentActions.js';
import { ConversationEngine } from '../agents/ConversationEngine.js';
import { PersonalityBuilder } from '../agents/PersonalityBuilder.js';

export class SimulationEngine {
  private worldManager: WorldManager;
  private agentManager: AgentManager;
  private eventManager: EventManager;
  private agentBrain: AgentBrain;
  private agentActions: AgentActions;
  private conversationEngine: ConversationEngine;
  private personalityBuilder: PersonalityBuilder;

  private isRunning: boolean = false;
  private tickCount: number = 0;
  private cronJob: cron.ScheduledTask | null = null;

  // Broadcast callback for sending updates to frontend
  private broadcastCallback?: (event: string, data: any) => void;

  constructor() {
    this.worldManager = new WorldManager();
    this.agentManager = new AgentManager();
    this.eventManager = new EventManager(this.agentManager);
    this.agentBrain = new AgentBrain(this.agentManager, this.worldManager);
    this.agentActions = new AgentActions(this.agentManager, this.eventManager);
    this.conversationEngine = new ConversationEngine(this.agentManager);
    this.personalityBuilder = new PersonalityBuilder();

    // Set reward callback to broadcast to frontend
    this.eventManager.setRewardCallback((reward) => {
      console.log(`🎁 REWARD: ${reward.agentName} ${reward.action} → ${reward.bonus}`);;
      this.broadcast('reward_event', reward);
    });

    // Set conversation broadcast callback
    this.conversationEngine.setBroadcastCallback((event, data) => {
      this.broadcast(event, data);
    });
  }

  /**
   * Initialize and start the simulation
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Simulation already running');
      return;
    }

    console.log('🌍 ═══════════════════════════════════════════');
    console.log('   SIMCITY.AI SIMULATION ENGINE');
    console.log('   Starting autonomous AI town...');
    console.log('═══════════════════════════════════════════\n');

    try {
      // Initialize world state
      await this.worldManager.initialize();
      console.log(`✅ World initialized - Day ${this.worldManager.getWorldState().current_day}`);

      // Initialize agents
      await this.agentManager.initialize();
      console.log(`✅ ${this.agentManager.getAgents().length} agents loaded\n`);

      // Track existing names for personality builder
      this.agentManager.getAgents().forEach(agent => {
        this.personalityBuilder.addExistingName(agent.name);
      });

      this.isRunning = true;

      // Start the tick loop (every 60 seconds to respect rate limits)
      this.cronJob = cron.schedule('*/60 * * * * *', async () => {
        await this.tick();
      });

      console.log('⏰ Tick loop started (every 60 seconds - rate limit friendly)\n');
      console.log('═══════════════════════════════════════════\n');

      // Run first tick immediately
      await this.tick();
    } catch (error) {
      console.error('❌ Failed to start simulation:', error);
      this.isRunning = false;
    }
  }

  /**
   * Stop the simulation
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Simulation not running');
      return;
    }

    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }

    this.isRunning = false;
    console.log('\n🛑 Simulation stopped\n');
  }

  /**
   * Main simulation tick (runs every 10 seconds)
   */
  private async tick(): Promise<void> {
    this.tickCount++;
    const worldState = this.worldManager.getWorldState();

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🕐 TICK #${this.tickCount} - Day ${worldState.current_day}, ${worldState.time_of_day}`);
    console.log(`   ${worldState.season} | ${worldState.weather} | ${this.worldManager.isNighttime() ? '🌙 Night' : '☀️ Day'}`);
    console.log(`   Population: ${this.agentManager.getAgents().length}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    try {
      // 1. Advance world time
      await this.worldManager.advanceTime();

      // 2. Update physical needs for all agents
      this.agentManager.updatePhysicalNeeds(this.worldManager.isNighttime());

      // 3. Check for deaths
      const deaths = await this.eventManager.checkDeathConditions();
      if (deaths.length > 0) {
        for (const death of deaths) {
          console.log(`💀 ${death.name} has died: ${death.cause}`);
          await this.worldManager.incrementDeaths();
          this.agentManager.removeAgent(death.id);
        }
        await this.broadcast('agent_died', deaths);
      }

      // 4. Check if we should spawn new agent
      if (this.eventManager.shouldSpawnNewAgent()) {
        await this.spawnNewAgent();
      }

      // 5. Random events
      const randomEvent = await this.eventManager.generateRandomEvent();
      if (randomEvent) {
        console.log(`🎲 Random event: ${randomEvent}`);
        await this.broadcast('random_event', randomEvent);
      }

      // 6. Handle sleeping agents (restore energy)
      this.handleSleepingAgents();

      // 7. Agent decisions and actions
      await this.processAgentDecisions();

      // 8. Check if it's time for chronicle
      if (this.eventManager.shouldGenerateChronicle(this.tickCount)) {
        console.log(`\n📜 Time to generate a chronicle chapter!`);
        // This will be handled by ChronicleWriter in Step 3
      }

      // 9. Save agent states to database (every 5 ticks)
      if (this.tickCount % 5 === 0) {
        await this.agentManager.saveToDatabase();
        console.log(`💾 Agent states saved to database`);
      }

      // 10. Broadcast world state to frontend
      await this.broadcast('world_update', {
        worldState: this.worldManager.getWorldState(),
        agents: this.agentManager.getAgents(),
        tickCount: this.tickCount,
      });

    } catch (error) {
      console.error('❌ Error during tick:', error);
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }

  /**
   * Process decisions for all eligible agents
   */
  private async processAgentDecisions(): Promise<void> {
    const eligibleAgents = this.agentManager.getAgentsNeedingDecisions();

    if (eligibleAgents.length === 0) {
      console.log(`😴 All agents are busy or sleeping`);
      return;
    }

    // RATE LIMIT FIX: Only process 1 agent per tick to stay under daily limit (20/day)
    const agentsToProcess = eligibleAgents.slice(0, 1);
    console.log(`\n🤔 Processing ${agentsToProcess.length} agent (${eligibleAgents.length} total eligible)...\n`);

    // Process agents sequentially (to avoid overwhelming Gemini API)
    for (const agent of agentsToProcess) {
      try {
        // Get decision from AI
        const decision = await this.agentBrain.makeDecision(agent);

        if (!decision) {
          console.log(`⚠️ ${agent.name} couldn't make a decision`);
          continue;
        }

        // Log inner monologue
        console.log(`\n💭 ${agent.name}'s thoughts:`);
        console.log(`   "${decision.inner_monologue}"`);
        
        // Broadcast thought to frontend
        await this.broadcast('agent_thought', {
          agentName: agent.name,
          thought: decision.inner_monologue,
        });

        // Check if decision has action
        if (!decision.action || !decision.action.type) {
          console.log(`⚠️ ${agent.name} made a decision without action`);
          continue;
        }

        // Check if it's a conversation request
        if (decision.action.type === 'start_conversation') {
          const targetName = decision.action.parameters.target_name;
          const targetAgent = this.agentManager.getAgents().find(a => a.name === targetName);
          
          if (targetAgent) {
            await this.conversationEngine.startConversation(
              agent.id,
              targetAgent.id,
              decision.action.parameters.topic
            );
          } else {
            console.log(`⚠️ Target agent "${targetName}" not found`);
          }
        } else {
          // Execute other actions
          await this.agentActions.executeAction(agent, decision.action);
          
          // Broadcast action to frontend
          await this.broadcast('agent_action', {
            agentName: agent.name,
            action: decision.action.type,
            details: decision.action.parameters,
          });
        }

      } catch (error) {
        console.error(`Error processing ${agent.name}:`, error);
      }

      // Small delay between agents to be polite to API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Handle sleeping agents (restore energy)
   */
  private handleSleepingAgents(): void {
    const agents = this.agentManager.getAgents();
    
    for (const agent of agents) {
      if (agent.current_activity === 'sleeping') {
        agent.physical_state.energy = Math.min(100, agent.physical_state.energy + 15);
        
        // Wake up if fully rested
        if (agent.physical_state.energy >= 80) {
          agent.current_activity = `at ${agent.current_location}`;
          this.agentManager.updateAgent(agent.id, {
            physical_state: agent.physical_state,
            current_activity: agent.current_activity,
          });
          console.log(`😊 ${agent.name} woke up refreshed`);
        }
      }
    }
  }

  /**
   * Spawn a new agent into the world
   */
  private async spawnNewAgent(): Promise<void> {
    console.log(`\n👶 Spawning new agent...`);

    const worldState = this.worldManager.getWorldState();
    const existingNames = this.agentManager.getAgents().map(a => a.name);

    const personality = await this.personalityBuilder.generatePersonality(
      existingNames,
      {
        day: worldState.current_day,
        season: worldState.season,
        population: this.agentManager.getAgents().length,
      }
    );

    if (!personality) {
      console.log(`❌ Failed to generate personality for new agent`);
      return;
    }

    // Create the new agent
    const newAgent = await this.agentManager.createAgent(personality);
    
    if (newAgent) {
      await this.worldManager.incrementBirths();
      console.log(`✨ ${newAgent.name} (age ${newAgent.physical_state.age}) has arrived in Simcity.AI!`);
      console.log(`   Location: ${newAgent.current_location}`);
      console.log(`   Personality: ${newAgent.personality?.traits?.join(', ') || 'unique'}`);
      
      await this.broadcast('agent_born', newAgent);
    }
  }

  /**
   * Broadcast event to frontend
   */
  private async broadcast(event: string, data: any): Promise<void> {
    if (this.broadcastCallback) {
      this.broadcastCallback(event, data);
    }
  }

  /**
   * Set broadcast callback for Socket.io
   */
  setBroadcastCallback(callback: (event: string, data: any) => void): void {
    this.broadcastCallback = callback;
  }

  /**
   * Get current simulation stats
   */
  getStats(): any {
    return {
      isRunning: this.isRunning,
      tickCount: this.tickCount,
      worldState: this.worldManager.getWorldState(),
      agentCount: this.agentManager.getAgents().length,
      agents: this.agentManager.getAgents(),
    };
  }

  /**
   * Reset simulation - wipe all agents and restart
   */
  async reset(): Promise<void> {
    console.log('\n🔄 ══════════════════════════════════════');
    console.log('   RESETTING SIMULATION');
    console.log('══════════════════════════════════════\n');

    // Stop current simulation
    if (this.isRunning && this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.isRunning = false;
    }

    // Reset tick counter
    this.tickCount = 0;

    // Clear all agents from database
    const { error } = await supabase
      .from('agents')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
      console.error('Error clearing agents:', error);
    } else {
      console.log('✅ All agents cleared from database');
    }

    // Reset world state
    await this.worldManager.reset();

    // Reinitialize agents (will create fresh 25)
    await this.agentManager.initialize();
    console.log(`✅ ${this.agentManager.getAgents().length} new agents created\n`);

    // Restart simulation
    await this.start();

    console.log('✅ Reset complete!\n');
    console.log('══════════════════════════════════════\n');
  }
}

