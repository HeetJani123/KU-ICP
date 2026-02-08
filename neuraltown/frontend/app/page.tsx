'use client';

import { SplineSceneBasic } from '@/components/demo/spline-scene-basic';
import { useEffect } from 'react';
import { io } from 'socket.io-client';

export default function Home() {
  useEffect(() => {
    console.log('%c🌆 SIMCITY.AI SIMULATION LOGS', 'color: #06b6d4; font-size: 16px; font-weight: bold; padding: 8px 0;');
    console.log('%cConnecting to backend at http://localhost:3001...', 'color: #94a3b8;');
    
    const socket = io('http://localhost:3001');

    socket.on('connect', () => {
      console.log('%c✅ [CONNECTED] Successfully connected to Simcity.AI backend', 'color: #10b981; font-weight: bold;');
      socket.emit('request_initial_state');
    });

    socket.on('disconnect', () => {
      console.log('%c❌ [DISCONNECTED] Lost connection to simulation', 'color: #ef4444; font-weight: bold;');
    });

    socket.on('initial_state', (payload: any) => {
      console.log('%c🚀 [INITIAL STATE]', 'color: #06b6d4; font-weight: bold;', {
        running: payload.isRunning,
        tick: payload.tickCount,
        agents: payload.agentCount,
        day: payload.worldState.current_day,
        time: payload.worldState.time_of_day,
        season: payload.worldState.season,
        weather: payload.worldState.weather,
        births: payload.worldState.total_births,
        deaths: payload.worldState.total_deaths,
      });
      console.log('%c📊 Agent List:', 'color: #8b5cf6;', payload.agents.map((a: any) => ({
        name: a.name,
        age: a.physical_state?.age,
        health: a.physical_state?.health,
        mood: a.mental_state?.mood,
        location: a.current_location,
        activity: a.current_activity,
      })));
    });

    socket.on('world_update', (payload: any) => {
      const { worldState, agents, tickCount } = payload;
      console.log(
        `%c⏱️  [TICK ${tickCount}]`, 
        'color: #f59e0b; font-weight: bold;',
        `Day ${worldState.current_day}, ${worldState.time_of_day} | ${worldState.season} | ${worldState.weather} | Agents: ${agents.length}`
      );
      
      // Log agent activities
      agents.forEach((agent: any) => {
        if (agent.current_activity && agent.current_activity !== 'idle') {
          console.log(
            `  💭 ${agent.name}:`,
            `${agent.current_activity}`,
            agent.mental_state?.current_thought ? `| Thinking: "${agent.mental_state.current_thought}"` : ''
          );
        }
      });
    });

    socket.on('agent_born', (agent: any) => {
      console.log(
        `%c👶 [BIRTH]`,
        'color: #10b981; font-weight: bold;',
        `${agent.name} was born!`,
        {
          location: agent.current_location,
          age: agent.physical_state?.age,
          traits: agent.personality?.traits || agent.personality?.personality_traits,
        }
      );
    });

    socket.on('agent_died', (deaths: Array<{ id: string; name: string; cause: string }>) => {
      deaths.forEach(({ name, cause }) => {
        console.log(
          `%c💀 [DEATH]`,
          'color: #ef4444; font-weight: bold;',
          `${name} has died.`,
          `Cause: ${cause}`
        );
      });
    });

    socket.on('random_event', (eventDescription: string) => {
      console.log(
        `%c🎲 [RANDOM EVENT]`,
        'color: #8b5cf6; font-weight: bold;',
        eventDescription
      );
    });

    socket.on('reward_event', (reward: any) => {
      console.log(
        `%c🎁 [COMMUNITY REWARD]`,
        'color: #f59e0b; font-weight: bold;',
        `${reward.agentName} earned a bonus!`,
        {
          action: reward.action,
          bonus: reward.bonus,
          beneficiaries: reward.beneficiaries,
        }
      );
    });

    // Listen for agent actions and thoughts (if backend emits them)
    socket.on('agent_action', (data: any) => {
      console.log(
        `%c🎬 [ACTION]`,
        'color: #06b6d4;',
        `${data.agentName}:`,
        data.action,
        data.details || ''
      );
    });

    socket.on('agent_thought', (data: any) => {
      console.log(
        `%c💭 [THOUGHT]`,
        'color: #a855f7;',
        `${data.agentName}:`,
        `"${data.thought}"`
      );
    });

    socket.on('conversation', (data: any) => {
      console.log(
        `%c💬 [CONVERSATION]`,
        'color: #14b8a6;',
        `${data.speaker} → ${data.listener}:`,
        `"${data.message}"`,
        data.innerThought ? `(thinking: "${data.innerThought}")` : ''
      );
    });

    socket.on('backend_log', (data: { type: string; message: any[] }) => {
      const prefix = data.type === 'error' ? '🔴 [BACKEND ERROR]' : data.type === 'warn' ? '⚠️  [BACKEND WARN]' : '📡 [BACKEND]';
      const color = data.type === 'error' ? '#ef4444' : data.type === 'warn' ? '#f59e0b' : '#94a3b8';
      console.log(`%c${prefix}`, `color: ${color}; font-weight: bold;`, ...data.message);
    });

    return () => {
      console.log('%c👋 Disconnecting from Simcity.AI...', 'color: #94a3b8;');
      socket.disconnect();
    };
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-black p-0">
      <SplineSceneBasic />
    </main>
  );
}
