'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import TownLayout from '@/components/TownLayout';
import AgentCard from '@/components/AgentCard';
import { formatGameTime, getMoodEmoji, getSeasonEmoji } from '@/lib/helpers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Image as ImageIcon, LineChart as LineChartIcon, Loader2, Sparkles, Wand2 } from 'lucide-react';

interface BackendAgent {
  id: string;
  name: string;
  personality?: {
    traits?: string[];
    personality_traits?: string[];
  };
  physical_state?: {
    health?: number;
    hunger?: number;
    energy?: number;
    age?: number;
  };
  mental_state?: {
    mood?: string;
    mood_score?: number;
    current_thought?: string;
  };
  starting_conditions?: {
    wealth_class?: string;
  };
  current_location?: string;
  current_activity?: string;
  is_alive?: boolean;
  born_on_day?: number;
}

interface BackendWorldState {
  current_day: number;
  time_of_day: string;
  season: string;
  weather: string;
  total_births: number;
  total_deaths: number;
}

interface WorldUpdatePayload {
  worldState: BackendWorldState;
  agents: BackendAgent[];
  tickCount: number;
}

interface InitialStatePayload {
  isRunning: boolean;
  tickCount: number;
  worldState: BackendWorldState;
  agentCount: number;
  agents: BackendAgent[];
}

type EventType = 'birth' | 'death' | 'random' | 'system' | 'reward';

interface FeedItem {
  id: string;
  type: EventType;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

interface AgentCardData {
  id: string;
  name: string;
  age: number;
  location: string;
  health: number;
  hunger: number;
  energy: number;
  last_thought?: string;
  last_action?: string;
  personality?: {
    traits?: string[];
  };
  rawMood?: string;
  moodScore?: number;
  wealthClass?: string;
  bornDay?: number;
}

interface ActionSuggestion {
  title: string;
  summary: string;
  risk: string;
}

interface ScenarioPhase {
  name: string;
  detail: string;
  confidence: number;
}

interface ScenarioAction {
  label: string;
  effect: string;
  priority: 'Critical' | 'High' | 'Moderate' | 'Low';
}

interface ScenarioProjection {
  title: string;
  headline: string;
  impactScore: number;
  phases: ScenarioPhase[];
  actions: ScenarioAction[];
  signals: string[];
}

interface WorldTrendPoint {
  tick: number;
  population: number;
  births: number;
  deaths: number;
  avgHealth: number;
  avgHunger: number;
  avgEnergy: number;
  avgMood: number;
  day: number | null;
  time: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
const MAX_FEED_ITEMS = 40;
const RISK_BADGE_STYLES: Record<string, string> = {
  LOW: 'border border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
  MEDIUM: 'border border-amber-400/40 bg-amber-400/10 text-amber-200',
  HIGH: 'border border-rose-400/40 bg-rose-400/10 text-rose-200',
};
const MAX_TREND_POINTS = 60;
const SCENARIO_PRESETS: Array<{ id: string; label: string; description: string; systemPrompt: string }> = [
  {
    id: 'supply_shift',
    label: 'Supply Shift',
    description: 'Logistics disruption ripples through settlements.',
    systemPrompt: 'A major supply route is delayed causing shortages in food and medicine.',
  },
  {
    id: 'festival_swell',
    label: 'Festival Swell',
    description: 'Cultural celebration draws crowds and emotion.',
    systemPrompt: 'Town announces a spontaneous celebration attracting visitors and boosting morale.',
  },
  {
    id: 'weather_front',
    label: 'Weather Front',
    description: 'Severe atmospheric event challenges infrastructure.',
    systemPrompt: 'A volatile storm front rolls in with risk of flooding and power disruption.',
  },
  {
    id: 'moral_crisis',
    label: 'Moral Crisis',
    description: 'Ethical dilemma divides residents into factions.',
    systemPrompt: 'A controversial council decision splits the population into opposing groups.',
  },
];

const normalizeValue = (value?: number, max = 100): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  return Math.min(Math.max(Math.round(value), 0), max);
};

const formatLocation = (location?: string): string => {
  if (!location) return 'Unknown';
  return location
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const mapAgentToCard = (agent: BackendAgent): AgentCardData => {
  const traits = agent.personality?.traits || agent.personality?.personality_traits || [];

  return {
    id: agent.id,
    name: agent.name,
    age: normalizeValue(agent.physical_state?.age, 9999),
    location: formatLocation(agent.current_location),
    health: normalizeValue(agent.physical_state?.health),
    hunger: normalizeValue(agent.physical_state?.hunger),
    energy: normalizeValue(agent.physical_state?.energy),
    last_thought: agent.mental_state?.current_thought,
    last_action: agent.current_activity,
    personality: { traits },
    rawMood: agent.mental_state?.mood,
    moodScore: agent.mental_state?.mood_score,
    wealthClass: agent.starting_conditions?.wealth_class,
    bornDay: agent.born_on_day,
  };
};

const createFeedItem = (type: EventType, title: string, description: string): FeedItem => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  type,
  title,
  description,
  timestamp: new Date().toISOString(),
  icon:
    type === 'birth'
      ? '✨'
      : type === 'death'
        ? '🕯️'
        : type === 'reward'
          ? '🎁'
          : type === 'random'
            ? '🎲'
            : '📡',
});

const computeAgentAverages = (agents: AgentCardData[]) => {
  if (agents.length === 0) {
    return {
      avgHealth: 0,
      avgHunger: 0,
      avgEnergy: 0,
      avgMood: 0,
    };
  }

  const totals = agents.reduce(
    (acc, agent) => {
      acc.health += agent.health;
      acc.hunger += agent.hunger;
      acc.energy += agent.energy;
      acc.mood += agent.moodScore ?? 0;
      return acc;
    },
    { health: 0, hunger: 0, energy: 0, mood: 0 },
  );

  const count = agents.length;

  return {
    avgHealth: Math.round(totals.health / count),
    avgHunger: Math.round(totals.hunger / count),
    avgEnergy: Math.round(totals.energy / count),
    avgMood: Math.round(totals.mood / Math.max(count, 1)),
  };
};

const formatTimestamp = (timestamp: string): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(timestamp));
  } catch (error) {
    return 'Just now';
  }
};

const FEED_STYLES: Record<EventType, { dot: string; badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  birth: {
    dot: 'bg-emerald-500',
    badgeVariant: 'secondary',
  },
  death: {
    dot: 'bg-rose-500',
    badgeVariant: 'secondary',
  },
  random: {
    dot: 'bg-indigo-500',
    badgeVariant: 'secondary',
  },
  system: {
    dot: 'bg-sky-500',
    badgeVariant: 'secondary',
  },
  reward: {
    dot: 'bg-amber-500',
    badgeVariant: 'default',
  },
};

const FEED_TYPE_LABELS: Record<EventType, string> = {
  birth: 'Welcome protocol',
  death: 'Memorial log',
  random: 'Anomaly ping',
  system: 'System status',
  reward: 'Community reward',
};

export default function TownPage() {
  const [agents, setAgents] = useState<AgentCardData[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [world, setWorld] = useState<{
    day: number | null;
    time: string;
    season: string;
    weather: string;
    births: number;
    deaths: number;
    tick: number;
    population: number;
    connected: boolean;
  }>({
    day: null,
    time: '--:--',
    season: 'spring',
    weather: 'clear',
    births: 0,
    deaths: 0,
    tick: 0,
    population: 0,
    connected: false,
  });
  const [worldTrend, setWorldTrend] = useState<WorldTrendPoint[]>([]);
  const [consolePrompt, setConsolePrompt] = useState('');
  const [actionSuggestions, setActionSuggestions] = useState<ActionSuggestion[]>([]);
  const [isGeneratingActions, setIsGeneratingActions] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [scenarioPreset, setScenarioPreset] = useState(SCENARIO_PRESETS[0].id);
  const [scenarioNote, setScenarioNote] = useState('');
  const [scenarioProjection, setScenarioProjection] = useState<ScenarioProjection | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<'agent' | 'scenario' | 'custom'>('agent');
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) || null,
    [agents, selectedAgentId],
  );

  const liveFeedSummary = useMemo(() => {
    if (feed.length === 0) {
      return '';
    }

    return feed
      .slice(0, 3)
      .map((item) => {
        const timestamp = formatTimestamp(item.timestamp);
        return `${timestamp} - ${item.title}: ${item.description}`;
      })
      .join(' ');
  }, [feed]);

  const agentVisualContext = useMemo(() => {
    if (!selectedAgent) {
      return '';
    }

    const descriptors: string[] = [];

    if (selectedAgent.hunger >= 85) {
      descriptors.push('severely hungry');
    } else if (selectedAgent.hunger >= 65) {
      descriptors.push('noticeably hungry');
    }

    if (selectedAgent.energy <= 20) {
      descriptors.push('exhausted');
    } else if (selectedAgent.energy <= 40) {
      descriptors.push('low energy');
    }

    if (selectedAgent.health <= 35) {
      descriptors.push('physically fragile');
    }

    const descriptorText = descriptors.length > 0 ? descriptors.join(', ') : 'composed';
    const moodLabel = selectedAgent.rawMood || 'neutral';
    const moodScore = typeof selectedAgent.moodScore === 'number' ? selectedAgent.moodScore : '—';
    const timeParts = world.time?.split(':') ?? [];
    const [rawHours, rawMinutes] = timeParts.map((part) => Number(part));
    const hasValidTime = timeParts.length === 2 && Number.isFinite(rawHours) && Number.isFinite(rawMinutes);
    const localTime = hasValidTime ? formatGameTime(world.time) : '--:--';
    const environment = `Environment snapshot: Day ${world.day ?? '—'} during ${world.season} with ${world.weather} skies at ${localTime}. Population ${world.population}.`;
    const signals = liveFeedSummary ? `Latest chronicle: ${liveFeedSummary}.` : 'Chronicle feed is currently quiet.';

    return `Document the present Simcity.AI moment focusing on agent ${selectedAgent.name} located at ${selectedAgent.location}. They are ${descriptorText} and currently ${selectedAgent.last_action || 'at rest'}. Mood ${moodLabel} (${moodScore}). Vital signs register health ${selectedAgent.health}%, hunger ${selectedAgent.hunger}%, energy ${selectedAgent.energy}%. ${environment} ${signals} Render with cyan-blue holographic lighting and volumetric fog.`;
  }, [selectedAgent, world.day, world.season, world.weather, world.time, world.population, liveFeedSummary]);

  const worldVisualContext = useMemo(() => {
    const timeParts = world.time?.split(':') ?? [];
    const [rawHours, rawMinutes] = timeParts.map((part) => Number(part));
    const hasValidTime = timeParts.length === 2 && Number.isFinite(rawHours) && Number.isFinite(rawMinutes);
    const localTime = hasValidTime ? formatGameTime(world.time) : '--:--';
    const environment = `Wide tableau of Simcity.AI on Day ${world.day ?? '—'} during ${world.season} season with ${world.weather} skies at ${localTime}. Population ${world.population}. Life ledger notes ${world.births} births and ${world.deaths} memorials.`;
    const signals = liveFeedSummary ? `Active signals: ${liveFeedSummary}.` : 'Chronicle feed reports no new alerts.';
    const scenarioOverlay = scenarioProjection ? `Forecast overlay whispering "${scenarioProjection.headline}".` : '';

    return `${environment} ${signals} ${scenarioOverlay}`.trim();
  }, [world.day, world.season, world.weather, world.time, world.population, world.births, world.deaths, liveFeedSummary, scenarioProjection]);

  useEffect(() => {
    let socket: Socket | null = null;

    try {
      socket = io(BACKEND_URL, {
        transports: ['websocket'],
      });
    } catch (error) {
      console.error('Failed to connect to backend:', error);
      setFeed((prev) => [
        createFeedItem('system', 'Connection failed', 'Could not connect to simulation server.'),
        ...prev,
      ].slice(0, MAX_FEED_ITEMS));
      return () => undefined;
    }

    socket.on('connect', () => {
      console.log('🔗 [CONNECT] Successfully connected to Simcity.AI backend');
      setWorld((prev) => ({ ...prev, connected: true }));
      setFeed((prev) => [
        createFeedItem('system', 'Connected', 'Live link established with Simcity.AI.'),
        ...prev,
      ].slice(0, MAX_FEED_ITEMS));
      socket?.emit('request_initial_state');
    });

    socket.on('disconnect', () => {
      console.log('❌ [DISCONNECT] Lost connection to Simcity.AI backend');
      setWorld((prev) => ({ ...prev, connected: false }));
      setFeed((prev) => [
        createFeedItem('system', 'Disconnected', 'Lost connection to the simulation. Attempting to reconnect...'),
        ...prev,
      ].slice(0, MAX_FEED_ITEMS));
    });

    socket.on('initial_state', (payload: InitialStatePayload) => {
      console.log('🚀 [INITIAL STATE] Received:', {
        isRunning: payload.isRunning,
        tick: payload.tickCount,
        agents: payload.agentCount,
        day: payload.worldState.current_day,
        time: payload.worldState.time_of_day,
        season: payload.worldState.season,
        weather: payload.worldState.weather
      });
      const mappedAgents = payload.agents.map(mapAgentToCard);
      const averages = computeAgentAverages(mappedAgents);
      setAgents(mappedAgents);
      setWorld((prev) => ({
        ...prev,
        connected: true,
        population: payload.agentCount,
        day: payload.worldState.current_day,
        time: payload.worldState.time_of_day,
        season: payload.worldState.season,
        weather: payload.worldState.weather,
        births: payload.worldState.total_births,
        deaths: payload.worldState.total_deaths,
        tick: payload.tickCount,
      }));
      setWorldTrend([
        {
          tick: payload.tickCount,
          population: payload.agentCount,
          births: payload.worldState.total_births,
          deaths: payload.worldState.total_deaths,
          avgHealth: averages.avgHealth,
          avgHunger: averages.avgHunger,
          avgEnergy: averages.avgEnergy,
          avgMood: averages.avgMood,
          day: payload.worldState.current_day,
          time: payload.worldState.time_of_day,
        },
      ]);
      if (mappedAgents.length > 0) {
        setSelectedAgentId(mappedAgents[0].id);
      }
    });

    socket.on('world_update', ({ worldState, agents: updatedAgents, tickCount }: WorldUpdatePayload) => {
      console.log(`⏱️  [TICK ${tickCount}] Day ${worldState.current_day}, ${worldState.time_of_day} | ${worldState.season} | ${worldState.weather} | Agents: ${updatedAgents.length}`);
      const mappedAgents = updatedAgents.map(mapAgentToCard);
      const averages = computeAgentAverages(mappedAgents);
      setAgents(mappedAgents);
      setWorld((prev) => ({
        ...prev,
        population: updatedAgents.length,
        day: worldState.current_day,
        time: worldState.time_of_day,
        season: worldState.season,
        weather: worldState.weather,
        births: worldState.total_births,
        deaths: worldState.total_deaths,
        tick: tickCount,
      }));
      setWorldTrend((prev) => {
        const next = [
          ...prev,
          {
            tick: tickCount,
            population: updatedAgents.length,
            births: worldState.total_births,
            deaths: worldState.total_deaths,
            avgHealth: averages.avgHealth,
            avgHunger: averages.avgHunger,
            avgEnergy: averages.avgEnergy,
            avgMood: averages.avgMood,
            day: worldState.current_day,
            time: worldState.time_of_day,
          },
        ];
        return next.slice(-MAX_TREND_POINTS);
      });
    });

    socket.on('agent_born', (agent: BackendAgent) => {
      console.log(`👶 [BIRTH] ${agent.name} was born at ${formatLocation(agent.current_location)}`);
      setFeed((prev) => [
        createFeedItem('birth', `${agent.name} has arrived`, `${agent.name} steps into SynthCity at ${formatLocation(agent.current_location)}.`),
        ...prev,
      ].slice(0, MAX_FEED_ITEMS));
    });

    socket.on('agent_died', (deaths: Array<{ id: string; name: string; cause: string }>) => {
      deaths.forEach(({ name, cause }) => {
        console.log(`💀 [DEATH] ${name} has died. Cause: ${cause}`);
      });
      setFeed((prev) => {
        const items = deaths.map(({ name, cause }) =>
          createFeedItem('death', `${name} has passed`, `${name} left the town (${cause}).`)
        );
        return [...items, ...prev].slice(0, MAX_FEED_ITEMS);
      });
      setAgents((prev) => prev.filter((agent) => !deaths.some((death) => death.id === agent.id)));
      setSelectedAgentId((prevSelected) => (prevSelected && deaths.some((death) => death.id === prevSelected) ? null : prevSelected));
    });

    socket.on('random_event', (eventDescription: string) => {
      if (!eventDescription) return;
      console.log(`🎲 [RANDOM EVENT] ${eventDescription}`);
      setFeed((prev) => [
        createFeedItem('random', 'A ripple in town', eventDescription),
        ...prev,
      ].slice(0, MAX_FEED_ITEMS));
    });

    socket.on('reward_event', (reward: { type: string; agentName: string; action: string; bonus: string; beneficiaries: string }) => {
      console.log(`🎁 [REWARD] ${reward.agentName} ${reward.action}. Everyone receives: ${reward.bonus}`);
      setFeed((prev) => [
        createFeedItem('reward', `${reward.agentName} earned a community bonus!`, `${reward.agentName} ${reward.action}. Everyone receives: ${reward.bonus}`),
        ...prev,
      ].slice(0, MAX_FEED_ITEMS));
    });

    socket.on('backend_log', (data: { type: string; message: any[] }) => {
      const prefix = data.type === 'error' ? '🔴 [BACKEND ERROR]' : data.type === 'warn' ? '⚠️  [BACKEND WARN]' : '📡 [BACKEND]';
      const color = data.type === 'error' ? '#ef4444' : data.type === 'warn' ? '#f59e0b' : '#94a3b8';
      console.log(`%c${prefix}`, `color: ${color}; font-weight: bold;`, ...data.message);
    });

    return () => {
      socket?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (agents.length === 0) {
      if (selectedAgentId !== null) {
        setSelectedAgentId(null);
      }
      return;
    }

    const hasSelectedAgent = selectedAgentId && agents.some((agent) => agent.id === selectedAgentId);

    if (!hasSelectedAgent) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  useEffect(() => {
    setConsolePrompt('');
    setActionSuggestions([]);
    setActionError(null);
    setScenarioNote('');
    setScenarioProjection(null);
    setScenarioError(null);
    setImagePrompt('');
    setImageDataUrl(null);
    setImageError(null);
    setImageMode('agent');
  }, [selectedAgentId]);

  const populationLabel = world.population ? `Population: ${world.population}` : 'Population: --';
  const timeLabel = world.day !== null ? `Day ${world.day}, ${formatGameTime(world.time)}` : 'Day --, --:--';
  const seasonEmoji = getSeasonEmoji(world.season);

  const handleGenerateActions = async () => {
    if (!selectedAgent || isGeneratingActions) {
      return;
    }

    setIsGeneratingActions(true);
    setActionError(null);

    try {
      const response = await fetch('/api/ai/agent-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent: selectedAgent,
          prompt: consolePrompt,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = data?.error || 'Failed to generate directives';
        const details = data?.details;
        throw new Error(details ? `${message}: ${details}` : message);
      }

      if (!data || !Array.isArray(data?.suggestions)) {
        throw new Error('Unexpected response from Gemini');
      }
      setActionSuggestions(data.suggestions);
    } catch (error) {
      console.error('Action suggestion error', error);
      setActionError(error instanceof Error ? error.message : 'Unable to generate directives right now.');
    } finally {
      setIsGeneratingActions(false);
    }
  };

  const handleScenarioForecast = async () => {
    if (scenarioLoading) {
      return;
    }

    setScenarioLoading(true);
    setScenarioError(null);

    try {
      const preset = SCENARIO_PRESETS.find((item) => item.id === scenarioPreset) ?? SCENARIO_PRESETS[0];
      const response = await fetch('/api/ai/scenario-forecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preset,
          note: scenarioNote,
          world,
          agent: selectedAgent,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = data?.error || 'Failed to simulate scenario';
        const details = data?.details;
        throw new Error(details ? `${message}: ${details}` : message);
      }

      if (!data?.projection) {
        throw new Error('Unexpected response from Gemini');
      }
      setScenarioProjection(data.projection as ScenarioProjection);
    } catch (error) {
      console.error('Scenario simulation error', error);
      setScenarioError(error instanceof Error ? error.message : 'Unable to simulate scenario.');
    } finally {
      setScenarioLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (imageLoading) {
      return;
    }

    if (imageMode === 'agent' && !selectedAgent) {
      setImageError('Select an agent or switch modes to describe a scene.');
      return;
    }

    const liveContext =
      imageMode === 'agent'
        ? agentVisualContext
        : imageMode === 'scenario'
          ? worldVisualContext
          : '';

    let prompt = imagePrompt.trim();

    if (liveContext) {
      prompt = prompt ? `${prompt}. ${liveContext}` : liveContext;
    }

    if (!prompt) {
      setImageError('Provide a visual brief or select a live context to render.');
      return;
    }

    setImageLoading(true);
    setImageError(null);

    try {
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `${prompt} Futuristic simulation aesthetic with cyan-blue ambient glow, detailed, volumetric lighting, cinematic.`,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = data?.error || 'Image generation failed';
        const details = data?.details;
        throw new Error(details ? `${message}: ${details}` : message);
      }

      if (!data?.image) {
        throw new Error('Gemini returned no image');
      }
      setImageDataUrl(data.image as string);
    } catch (error) {
      console.error('Image generation error', error);
      setImageError(error instanceof Error ? error.message : 'Unable to generate imagery.');
    } finally {
      setImageLoading(false);
    }
  };

  const handleDownloadImage = () => {
    if (!imageDataUrl) {
      return;
    }

    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = `simcity-ai-visual-${Date.now()}.png`;
    link.click();
  };

  const handleResetSimulation = async () => {
    if (!confirm('Are you sure you want to reset the simulation? This will create 25 new agents and restart from Day 1.')) {
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/reset`, {
        method: 'POST',
      });

      if (response.ok) {
        // Clear local state
        setAgents([]);
        setFeed([]);
        setWorld({
          day: null,
          time: '--:--',
          season: 'spring',
          weather: 'clear',
          births: 0,
          deaths: 0,
          tick: 0,
          population: 0,
          connected: true,
        });
        setWorldTrend([]);
        setSelectedAgentId(null);

        // Reload page to get fresh data
        window.location.reload();
      } else {
        alert('Failed to reset simulation');
      }
    } catch (error) {
      console.error('Reset error:', error);
      alert('Error resetting simulation');
    }
  };

  const renderWorldStats = () => {
    const totalLifeEvents = Math.max(world.births + world.deaths, 1);
    const birthRatio = Math.round((world.births / totalLifeEvents) * 100);

    const statCards: Array<{
      key: string;
      title: string;
      value: string;
      detail: string;
      extra?: ReactNode;
    }> = [
      {
        key: 'link',
        title: 'Link Status',
        value: world.connected ? 'Online' : 'Offline',
        detail: world.connected ? 'Receiving live pulses from the simulation.' : 'Awaiting server connection.',
        extra: (
          <Badge variant="outline" className="mt-2 w-fit border-border/60 bg-muted/30 text-foreground/80">Population {world.population || '—'}</Badge>
        ),
      },
      {
        key: 'tick',
        title: 'Simulation Tick',
        value: `#${world.tick}`,
        detail: `Clock sync ${formatGameTime(world.time)}`,
        extra: (
          <Badge variant="outline" className="mt-2 w-fit border-border/60 bg-muted/30 text-foreground/80">Day {world.day ?? '—'}</Badge>
        ),
      },
      {
        key: 'season',
        title: 'Season & Weather',
        value: `${seasonEmoji} ${world.season}`,
        detail: `Skies: ${world.weather}`,
        extra: (
          <Badge variant="outline" className="mt-2 w-fit border-border/60 bg-muted/30 text-foreground/80">Local time {formatGameTime(world.time)}</Badge>
        ),
      },
      {
        key: 'ledger',
        title: 'Life Ledger',
        value: `${world.births} births`,
        detail: `${world.deaths} memorials`,
        extra: (
          <div className="mt-3 space-y-2">
            <Progress value={birthRatio} aria-label="Birth ratio" />
            <p className="text-xs text-muted-foreground/80">Birth energy {birthRatio}%</p>
          </div>
        ),
      },
    ];

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ key, title, value, detail, extra }) => (
          <Card key={key} className="border border-border/70 bg-card/90 backdrop-blur">
            <CardHeader className="space-y-2">
              <CardDescription className="uppercase tracking-[0.2em] text-xs text-muted-foreground/80">{title}</CardDescription>
              <CardTitle className="text-2xl text-card-foreground">{value}</CardTitle>
              <p className="text-sm text-muted-foreground/90">{detail}</p>
            </CardHeader>
            {extra && <CardContent>{extra}</CardContent>}
          </Card>
        ))}
      </div>
    );
  };

  const renderAgentDetails = () => {
    if (!selectedAgent) {
      return (
        <Card className="flex h-full items-center justify-center text-center border border-border/70 bg-card/90 backdrop-blur">
          <CardContent className="space-y-2 pt-6 text-muted-foreground">
            <CardTitle className="text-lg font-semibold text-card-foreground">Select an agent</CardTitle>
            <p className="text-sm text-muted-foreground/80">Choose a resident from the directory to open their dossier.</p>
          </CardContent>
        </Card>
      );
    }

    const mood = selectedAgent.rawMood || 'neutral';
    const moodEmoji = getMoodEmoji(mood);
    const truncatedThought = selectedAgent.last_thought
      ? `${selectedAgent.last_thought.slice(0, 220)}${selectedAgent.last_thought.length > 220 ? '…' : ''}`
      : null;

    const vitals = [
      { label: 'Health', value: selectedAgent.health },
      { label: 'Hunger', value: selectedAgent.hunger },
      { label: 'Energy', value: selectedAgent.energy },
    ];

    return (
      <div className="flex h-full flex-col gap-4">
        <Card className="border border-border/70 bg-card/90 backdrop-blur">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <Badge variant="outline" className="w-fit border-border/60 bg-muted/30 capitalize text-foreground/80">{mood}</Badge>
              <CardTitle className="text-3xl font-serif text-card-foreground">{selectedAgent.name}</CardTitle>
              <CardDescription className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span>Currently {selectedAgent.last_action || 'reflecting'}</span>
                <span>·</span>
                <span>{selectedAgent.location}</span>
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1 text-right">
              <span className="text-4xl">{moodEmoji}</span>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">Mood score</span>
              <span className="text-sm font-semibold text-foreground/90">{selectedAgent.moodScore ?? 0}</span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-xs text-muted-foreground/90">
            <Badge variant="secondary" className="bg-secondary/30 text-secondary-foreground">Age {selectedAgent.age}</Badge>
            {selectedAgent.wealthClass && <Badge variant="secondary" className="bg-secondary/30 text-secondary-foreground">{selectedAgent.wealthClass}</Badge>}
            {typeof selectedAgent.bornDay === 'number' && (
              <Badge variant="secondary" className="bg-secondary/30 text-secondary-foreground">Born day {selectedAgent.bornDay}</Badge>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="story" className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="story">Story</TabsTrigger>
            <TabsTrigger value="vitals">Vitals</TabsTrigger>
            <TabsTrigger value="traits">Traits</TabsTrigger>
          </TabsList>

          <TabsContent value="story" className="mt-4 h-full">
            <Card className="h-full border border-border/70 bg-card/90 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base">Inner monologue</CardTitle>
                <CardDescription>Latest captured thought from the simulation.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {truncatedThought ? (
                  <p className="rounded-md bg-muted/40 p-4 text-sm italic text-muted-foreground">“{truncatedThought}”</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent inner monologue recorded.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vitals" className="mt-4 h-full">
            <Card className="h-full border border-border/70 bg-card/90 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base">Current vitals</CardTitle>
                <CardDescription>Live metrics broadcast from the settlement.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {vitals.map(({ label, value }) => (
                  <div key={`${selectedAgent.id}-${label}`} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{label}</span>
                      <span className="font-semibold text-foreground/90">{value}%</span>
                    </div>
                    <Progress value={Math.max(0, Math.min(100, value))} aria-label={`${label} ${value}%`} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="traits" className="mt-4 h-full">
            <Card className="h-full border border-border/70 bg-card/90 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base">Personality traits</CardTitle>
                <CardDescription>Top descriptors supplied by the simulation.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-2">
                  {(selectedAgent.personality?.traits || []).length > 0 ? (
                    (selectedAgent.personality?.traits || []).map((trait, index) => (
                      <Badge key={`${selectedAgent.id}-trait-${index}`} variant="outline" className="border-border/60 bg-muted/30 capitalize text-foreground/80">
                        {trait}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No traits recorded yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  const renderCommandConsole = () => (
    <Card className="border border-border/70 bg-card/90 backdrop-blur">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Agent command console</span>
        </CardTitle>
        <CardDescription>Direct Gemini to propose tactical directives for the selected resident.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={consolePrompt}
          onChange={(event) => setConsolePrompt(event.target.value)}
          placeholder={selectedAgent ? `Ask for maneuvers to help ${selectedAgent.name}...` : 'Select an agent to begin issuing directives.'}
          disabled={!selectedAgent || isGeneratingActions}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            onClick={handleGenerateActions}
            disabled={!selectedAgent || isGeneratingActions}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
          >
            {isGeneratingActions ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Suggest actions'
            )}
          </Button>
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
            Gemini live
          </Badge>
        </div>
        {actionError && <p className="text-xs text-destructive">{actionError}</p>}
        <div className="space-y-3 pt-2">
          {isGeneratingActions && actionSuggestions.length === 0 && (
            <p className="text-sm text-muted-foreground/80">Drafting directives...</p>
          )}
          {actionSuggestions.map((suggestion, index) => {
            const riskKey = suggestion.risk?.toUpperCase() ?? '';
            const badgeClass = RISK_BADGE_STYLES[riskKey] ?? 'border border-border/60 bg-muted/20 text-muted-foreground';
            return (
              <div key={`${suggestion.title}-${index}`} className="rounded-lg border border-border/60 bg-muted/20 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground/90">{suggestion.title}</p>
                    <p className="text-sm text-muted-foreground">{suggestion.summary}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClass}`}>
                    {riskKey || 'UNKNOWN'}
                  </span>
                </div>
              </div>
            );
          })}
          {!isGeneratingActions && actionSuggestions.length === 0 && (
            <p className="text-sm text-muted-foreground/80">No directives yet. Provide mission context and request a plan.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderAnalyticsPanel = () => {
    const latest = worldTrend[worldTrend.length - 1];

    return (
      <Card className="border border-border/70 bg-card/90 backdrop-blur">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <LineChartIcon className="h-4 w-4 text-primary" />
            <span>Telemetry analytics</span>
          </CardTitle>
          <CardDescription>Rolling signals from the last {Math.min(worldTrend.length, MAX_TREND_POINTS)} ticks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {latest && (
            <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground/80">
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-[0.18em]">Avg health</p>
                <p className="text-xl font-semibold text-foreground/90">{latest.avgHealth}%</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-[0.18em]">Avg energy</p>
                <p className="text-xl font-semibold text-foreground/90">{latest.avgEnergy}%</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-[0.18em]">Avg hunger</p>
                <p className="text-xl font-semibold text-foreground/90">{latest.avgHunger}%</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-[0.18em]">Mood index</p>
                <p className="text-xl font-semibold text-foreground/90">{latest.avgMood}</p>
              </div>
            </div>
          )}
          {worldTrend.length < 2 ? (
            <p className="text-sm text-muted-foreground/80">Telemetry is calibrating. Once a few ticks stream in we will render trendlines.</p>
          ) : (
            <div className="space-y-4">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={worldTrend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="tick"
                      stroke="rgba(148, 163, 184, 0.6)"
                      fontSize={12}
                      tickFormatter={(value) => `#${value}`}
                    />
                    <YAxis
                      stroke="rgba(148, 163, 184, 0.6)"
                      fontSize={12}
                      width={32}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(13, 18, 40, 0.92)',
                        border: '1px solid rgba(79, 114, 168, 0.4)',
                        borderRadius: 12,
                        color: '#E2E8F0',
                        fontSize: 12,
                      }}
                      labelFormatter={(tick) => `Tick ${tick}`}
                    />
                    <Line type="monotone" dataKey="population" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="births" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="deaths" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={worldTrend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="tick"
                      stroke="rgba(148, 163, 184, 0.6)"
                      fontSize={12}
                      tickFormatter={(value) => `#${value}`}
                    />
                    <YAxis
                      stroke="rgba(148, 163, 184, 0.6)"
                      fontSize={12}
                      width={32}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(13, 18, 40, 0.92)',
                        border: '1px solid rgba(79, 114, 168, 0.4)',
                        borderRadius: 12,
                        color: '#E2E8F0',
                        fontSize: 12,
                      }}
                      labelFormatter={(tick) => `Tick ${tick}`}
                    />
                    <Area type="monotone" dataKey="avgHealth" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1) / 0.2)" strokeWidth={2} />
                    <Area type="monotone" dataKey="avgEnergy" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2) / 0.2)" strokeWidth={2} />
                    <Area type="monotone" dataKey="avgHunger" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3) / 0.15)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderScenarioSimulator = () => (
    <Card className="border border-border/70 bg-card/90 backdrop-blur">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wand2 className="h-4 w-4 text-secondary" />
          <span>Scenario simulator</span>
        </CardTitle>
        <CardDescription>Run a what-if forecast and see how Simcity.AI might react.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {SCENARIO_PRESETS.map((preset) => {
            const isSelected = scenarioPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setScenarioPreset(preset.id)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? 'border-secondary/50 bg-secondary/20 text-secondary-foreground shadow'
                    : 'border-border/60 bg-muted/20 text-muted-foreground hover:border-secondary/40 hover:bg-secondary/10'
                }`}
              >
                <p className="font-medium text-foreground/90">{preset.label}</p>
                <p className="text-xs text-muted-foreground/80">{preset.description}</p>
              </button>
            );
          })}
        </div>
        <Textarea
          value={scenarioNote}
          onChange={(event) => setScenarioNote(event.target.value)}
          placeholder="Add constraints, assets, or desired outcomes."
          className="min-h-[80px]"
          disabled={scenarioLoading}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            onClick={handleScenarioForecast}
            disabled={scenarioLoading}
            className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-70"
          >
            {scenarioLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Simulating...
              </>
            ) : (
              'Simulate outcome'
            )}
          </Button>
          <Badge variant="outline" className="border-secondary/40 bg-secondary/10 text-secondary">
            Gemini pro insight
          </Badge>
        </div>
        {scenarioError && <p className="text-xs text-destructive">{scenarioError}</p>}
        {scenarioProjection ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground/90">{scenarioProjection.title}</p>
                  <p className="text-sm text-muted-foreground">{scenarioProjection.headline}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/80">Impact index</p>
                  <p className="text-2xl font-semibold text-foreground/90">{scenarioProjection.impactScore}</p>
                </div>
              </div>
              <div className="pt-3">
                <Progress value={Math.max(0, Math.min(100, scenarioProjection.impactScore))} aria-label="Scenario impact" />
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground/90">Timeline phases</h4>
              {(scenarioProjection.phases ?? []).map((phase, index) => {
                const confidence = Math.round(Math.max(0, Math.min(1, phase.confidence)) * 100);
                return (
                  <div key={`${phase.name}-${index}`} className="rounded-lg border border-border/50 bg-card/70 p-3">
                    <div className="flex items-center justify-between text-sm text-foreground/90">
                      <span>{phase.name}</span>
                      <span className="text-xs text-muted-foreground/80">{confidence}% confidence</span>
                    </div>
                    <p className="pt-2 text-sm text-muted-foreground">{phase.detail}</p>
                    <Progress value={confidence} className="mt-2 h-1.5" aria-label={`${phase.name} confidence`} />
                  </div>
                );
              })}
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground/90">Recommended actions</h4>
              {(scenarioProjection.actions ?? []).map((action, index) => (
                <div key={`${action.label}-${index}`} className="rounded-lg border border-border/50 bg-card/70 p-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-foreground/90">
                    <span>{action.label}</span>
                    <Badge variant="outline" className="border-secondary/40 bg-secondary/10 text-secondary">
                      {action.priority}
                    </Badge>
                  </div>
                  <p className="pt-2 text-sm text-muted-foreground">{action.effect}</p>
                </div>
              ))}
            </div>
            {scenarioProjection.signals?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground/90">Signals to monitor</h4>
                <div className="flex flex-wrap gap-2">
                  {scenarioProjection.signals.map((signal, index) => (
                    <Badge
                      key={`${signal}-${index}`}
                      variant="outline"
                      className="border-border/60 bg-muted/30 text-foreground/80"
                    >
                      {signal}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          !scenarioLoading && (
            <p className="text-sm text-muted-foreground/80">Select a scenario and simulate to preview the projected cascade.</p>
          )
        )}
      </CardContent>
    </Card>
  );

  const renderImageGenerator = () => {
    const placeholder =
      imageMode === 'agent'
        ? selectedAgent
          ? `Optional: add cinematic direction for ${selectedAgent.name}.`
          : 'Select an agent or switch modes to describe a scene.'
        : imageMode === 'scenario'
          ? 'Optional: add framing notes for the live tableau.'
          : 'Describe the render you want to see.';

    return (
      <Card className="border border-border/70 bg-card/90 backdrop-blur">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4 text-accent" />
            <span>Live image lab</span>
          </CardTitle>
          <CardDescription>Generate mood boards that match the agents or live telemetry.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-sm">
            {[
              { id: 'agent', label: 'Agent portrait' },
              { id: 'scenario', label: 'Live tableau' },
              { id: 'custom', label: 'Custom brief' },
            ].map((option) => {
              const id = option.id as 'agent' | 'scenario' | 'custom';
              const isActive = imageMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setImageMode(id)}
                  className={`rounded-lg border px-3 py-2 transition ${
                    isActive
                      ? 'border-accent/50 bg-accent/20 text-foreground shadow'
                      : 'border-border/60 bg-muted/20 text-muted-foreground hover:border-accent/40 hover:bg-accent/10'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <Textarea
            value={imagePrompt}
            onChange={(event) => setImagePrompt(event.target.value)}
            placeholder={placeholder}
            className="min-h-[72px]"
            disabled={imageLoading}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button
                onClick={handleGenerateImage}
                disabled={imageLoading}
                className="inline-flex items-center gap-2 bg-accent text-accent-foreground hover:bg-accent/80 disabled:opacity-70"
              >
                {imageLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Rendering...
                  </>
                ) : (
                  'Generate visual'
                )}
              </Button>
              <Button
                onClick={handleDownloadImage}
                disabled={!imageDataUrl}
                variant="outline"
                className="border-accent/40 text-accent hover:bg-accent/10"
              >
                Download
              </Button>
            </div>
            <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent">
              Gemini image alpha
            </Badge>
          </div>
          {imageError && <p className="text-xs text-destructive">{imageError}</p>}
          <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/20">
            {imageDataUrl ? (
              <img src={imageDataUrl} alt="Simcity.AI render" className="h-auto w-full object-cover" />
            ) : (
              <div className="flex h-56 items-center justify-center text-sm text-muted-foreground/80">
                {imageLoading ? 'Synthesizing visual...' : 'Output will appear here once generated.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCenterContent = () => (
    <div className="flex h-full flex-col gap-6">
      {renderWorldStats()}
      <div className="grid flex-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          {renderAgentDetails()}
          {renderAnalyticsPanel()}
        </div>
        <div className="flex flex-col gap-6">
          {renderCommandConsole()}
          {renderScenarioSimulator()}
          {renderImageGenerator()}
        </div>
      </div>
    </div>
  );

  const renderLeftPanel = () => (
    <div className="space-y-4">
      {agents.length === 0 && (
        <div className="text-sm text-muted-foreground/70">Waiting for simulation data...</div>
      )}
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          isSelected={agent.id === selectedAgentId}
          onSelect={() => setSelectedAgentId(agent.id)}
        />
      ))}
    </div>
  );

  const renderRightPanel = () => (
    <div className="space-y-4">
      {feed.length === 0 ? (
        <Card className="border border-border/70 bg-card/90 backdrop-blur">
          <CardContent className="text-sm text-muted-foreground">
            Live updates will appear as the simulation streams events.
          </CardContent>
        </Card>
      ) : (
        feed.map((item) => {
          const style = FEED_STYLES[item.type];
          const label = FEED_TYPE_LABELS[item.type];

          return (
            <Card key={item.id} className="border border-border/70 bg-card/90 backdrop-blur">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} aria-hidden />
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
                    <span>{item.icon}</span>
                    <span>{item.title}</span>
                  </CardTitle>
                </div>
                <CardDescription className="text-xs uppercase tracking-[0.18em] text-muted-foreground/80">
                  {formatTimestamp(item.timestamp)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2 text-sm text-muted-foreground">
                <p>{item.description}</p>
                <Badge variant={style.badgeVariant} className="bg-muted/40 text-foreground/80">
                  {label}
                </Badge>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );

  return (
    <TownLayout
      left={renderLeftPanel()}
      center={renderCenterContent()}
      right={renderRightPanel()}
      populationLabel={populationLabel}
      timeLabel={timeLabel}
      onReset={handleResetSimulation}
    />
  );
}
