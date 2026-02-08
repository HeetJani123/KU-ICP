/**
 * ConversationEngine - Handles multi-turn conversations between agents
 */

import { Agent, AgentManager } from '../engine/AgentManager.js';
import { getConversationResponse } from '../utils/gemini.js';
import supabase from '../utils/supabase.js';

interface ConversationTurn {
  speaker_id: string;
  speaker_name: string;
  content: string;
  inner_thought?: string;
}

export class ConversationEngine {
  private activeConversations: Map<string, ConversationTurn[]> = new Map();
  private broadcastCallback?: (event: string, data: any) => void;

  constructor(private agentManager: AgentManager) {}

  /**
   * Set broadcast callback for real-time updates
   */
  setBroadcastCallback(callback: (event: string, data: any) => void): void {
    this.broadcastCallback = callback;
  }

  /**
   * Broadcast event to frontend
   */
  private broadcast(event: string, data: any): void {
    if (this.broadcastCallback) {
      this.broadcastCallback(event, data);
    }
  }

  /**
   * Start a conversation between two agents
   */
  async startConversation(
    initiatorId: string,
    targetId: string,
    topic?: string
  ): Promise<void> {
    const initiator = this.agentManager.getAgent(initiatorId);
    const target = this.agentManager.getAgent(targetId);

    if (!initiator || !target) {
      console.log('⚠️ One or both agents not found for conversation');
      return;
    }

    // Check if target is available
    if (target.current_activity === 'sleeping' || 
        target.current_activity === 'in conversation' ||
        target.current_activity === 'eating') {
      console.log(`❌ ${target.name} is busy (${target.current_activity})`);
      return;
    }

    // Check if they're in the same location
    if (initiator.current_location !== target.current_location) {
      console.log(`❌ Agents not in same location`);
      return;
    }

    const conversationId = `${initiatorId}_${targetId}_${Date.now()}`;
    this.activeConversations.set(conversationId, []);

    // Mark both as busy
    initiator.current_activity = 'in conversation';
    target.current_activity = 'in conversation';
    this.agentManager.updateAgent(initiatorId, { current_activity: 'in conversation' });
    this.agentManager.updateAgent(targetId, { current_activity: 'in conversation' });

    console.log(`💬 Starting conversation between ${initiator.name} and ${target.name}`);
    console.log(`   Topic: ${topic || 'casual chat'}`);
    console.log(`   Location: ${initiator.current_location}`);

    // Run the conversation (3-5 turns)
    await this.runConversation(conversationId, initiator, target, topic);

    // Cleanup
    this.activeConversations.delete(conversationId);
    initiator.current_activity = `at ${initiator.current_location}`;
    target.current_activity = `at ${target.current_location}`;
    this.agentManager.updateAgent(initiatorId, { current_activity: initiator.current_activity });
    this.agentManager.updateAgent(targetId, { current_activity: target.current_activity });
  }

  /**
   * Run a multi-turn conversation
   */
  private async runConversation(
    conversationId: string,
    initiator: Agent,
    target: Agent,
    topic?: string
  ): Promise<void> {
    const turns: ConversationTurn[] = [];
    const maxTurns = Math.floor(Math.random() * 3) + 3; // 3-5 turns

    // Get recent memories for context
    const initiatorMemories = await this.getRecentMemories(initiator.id, 3);
    const targetMemories = await this.getRecentMemories(target.id, 3);

    // Get relationship if exists
    const relationship = await this.getRelationship(initiator.id, target.id);

    for (let i = 0; i < maxTurns; i++) {
      const speaker = i % 2 === 0 ? initiator : target;
      const listener = i % 2 === 0 ? target : initiator;
      const speakerMemories = i % 2 === 0 ? initiatorMemories : targetMemories;

      // Build conversation context
      const conversationHistory = this.buildConversationContext(
        speaker,
        listener,
        turns,
        topic,
        relationship,
        speakerMemories
      );

      // Build system instruction for speaker
      const systemInstruction = this.buildSystemInstruction(speaker, listener);

      // Get response from Gemini
      const result = await getConversationResponse(systemInstruction, conversationHistory);
      const response = result?.success ? result.data : null;

      if (response) {
        const turn: ConversationTurn = {
          speaker_id: speaker.id,
          speaker_name: speaker.name,
          content: response.dialogue,
          inner_thought: response.inner_thought,
        };

        turns.push(turn);

        // Log to console
        console.log(`\n   ${speaker.name}: "${response.dialogue}"`);
        if (response.inner_thought) {
          console.log(`   💭 (${response.inner_thought})`);
        }

        // Broadcast conversation to frontend
        this.broadcast('conversation', {
          speaker: speaker.name,
          listener: listener.name,
          message: response.dialogue,
          innerThought: response.inner_thought || null,
          topic: topic || 'casual',
        });

        // Update mental state
        if (response.emotional_update) {
          // Emotional update handled via mood
          this.agentManager.updateAgent(speaker.id, { mental_state: speaker.mental_state });
        }
      }

      // Small delay between turns
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Save conversation to database
    await this.saveConversation(conversationId, initiator, target, turns, topic);

    // Create memories for both
    await this.createConversationMemories(initiator, target, turns, topic);

    // Update relationship
    await this.updateRelationship(initiator, target, turns);

    console.log(`\n✅ Conversation ended\n`);
  }

  /**
   * Build system instruction for conversation
   */
  private buildSystemInstruction(speaker: Agent, listener: Agent): string {
    const personality = speaker.personality;
    
    return `You are ${speaker.name}. You are having a conversation with ${listener.name} in ${speaker.current_location}.

YOUR PERSONALITY:
Traits: ${personality?.traits?.join(', ') || 'curious, thoughtful'}
Values: ${personality?.values?.join(', ') || 'honesty, kindness'}
Flaws: ${personality?.flaws?.join(', ') || 'stubborn'}

YOUR SPEECH STYLE: ${personality?.speech_style || 'Direct and honest'}

YOUR CURRENT MOOD: ${speaker.mental_state.mood}

IMPORTANT:
- Your "dialogue" is what you say out loud to ${listener.name}
- Your "inner_thought" is what you really think (never shown to them)
- Be authentic, flawed, and human in your responses
- Set "should_continue" to false if the conversation feels naturally concluded`;
  }

  /**
   * Build context for conversation
   */
  private buildConversationContext(
    speaker: Agent,
    listener: Agent,
    turns: ConversationTurn[],
    topic: string | undefined,
    relationship: any,
    memories: string[]
  ): string {
    let context = `You are having a conversation with ${listener.name}.\n\n`;

    if (topic) {
      context += `Topic: ${topic}\n`;
    }

    context += `Location: ${speaker.current_location}\n`;
    context += `Your current mood: ${speaker.mental_state.mood}\n\n`;

    if (relationship) {
      context += `Your relationship: ${relationship.relationship_type} (strength: ${relationship.strength}/100)\n`;
      context += `Last interaction: ${relationship.last_interaction_summary}\n\n`;
    }

    if (memories.length > 0) {
      context += `Recent memories:\n${memories.join('\n')}\n\n`;
    }

    if (turns.length > 0) {
      context += `Conversation so far:\n`;
      turns.forEach(turn => {
        context += `${turn.speaker_name}: "${turn.content}"\n`;
      });
    } else {
      context += `You are starting this conversation.\n`;
    }

    return context;
  }

  /**
   * Save conversation to database
   */
  private async saveConversation(
    conversationId: string,
    initiator: Agent,
    target: Agent,
    turns: ConversationTurn[],
    topic?: string
  ): Promise<void> {
    const { data: worldState } = await supabase
      .from('world_state')
      .select('current_day')
      .eq('id', 1)
      .single();

    await supabase
      .from('conversations')
      .insert([{
        initiator_id: initiator.id,
        target_id: target.id,
        day: worldState?.current_day || 1,
        location: initiator.current_location,
        topic: topic || 'casual conversation',
        turns: JSON.stringify(turns),
        outcome: 'completed',
      }]);
  }

  /**
   * Create memories for both agents
   */
  private async createConversationMemories(
    initiator: Agent,
    target: Agent,
    turns: ConversationTurn[],
    topic?: string
  ): Promise<void> {
    const { data: worldState } = await supabase
      .from('world_state')
      .select('current_day')
      .eq('id', 1)
      .single();

    const day = worldState?.current_day || 1;

    // Summary for initiator
    const initiatorSummary = `Had a conversation with ${target.name} about ${topic || 'various things'}. ${turns[0]?.content}`;
    await supabase.from('memories').insert([{
      agent_id: initiator.id,
      day,
      content: initiatorSummary,
      importance: 6,
      emotional_impact: 'positive',
    }]);

    // Summary for target
    const targetSummary = `Talked with ${initiator.name} about ${topic || 'various things'}. ${turns[1]?.content}`;
    await supabase.from('memories').insert([{
      agent_id: target.id,
      day,
      content: targetSummary,
      importance: 6,
      emotional_impact: 'positive',
    }]);
  }

  /**
   * Update relationship after conversation
   */
  private async updateRelationship(
    agent1: Agent,
    agent2: Agent,
    turns: ConversationTurn[]
  ): Promise<void> {
    const { data: existing } = await supabase
      .from('relationships')
      .select('*')
      .or(`and(agent_id.eq.${agent1.id},target_id.eq.${agent2.id}),and(agent_id.eq.${agent2.id},target_id.eq.${agent1.id})`)
      .single();

    if (existing) {
      // Update existing relationship
      const newStrength = Math.min(100, existing.strength + 5);
      await supabase
        .from('relationships')
        .update({
          strength: newStrength,
          last_interaction_summary: turns[turns.length - 1]?.content || 'Had a conversation',
        })
        .eq('id', existing.id);
    } else {
      // Create new relationship
      await supabase
        .from('relationships')
        .insert([{
          agent_id: agent1.id,
          target_id: agent2.id,
          relationship_type: 'acquaintance',
          strength: 20,
          last_interaction_summary: 'Met and talked',
        }]);
    }
  }

  /**
   * Get relationship between two agents
   */
  private async getRelationship(agentId: string, targetId: string): Promise<any> {
    const { data } = await supabase
      .from('relationships')
      .select('*')
      .or(`and(agent_id.eq.${agentId},target_id.eq.${targetId}),and(agent_id.eq.${targetId},target_id.eq.${agentId})`)
      .single();

    return data;
  }

  /**
   * Get recent memories for an agent
   */
  private async getRecentMemories(agentId: string, limit: number): Promise<string[]> {
    const { data } = await supabase
      .from('memories')
      .select('content')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data?.map(m => `- ${m.content}`) || [];
  }
}
