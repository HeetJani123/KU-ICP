// ==================== SHARED TYPES ====================

export type WealthClass = 'poor' | 'struggling' | 'comfortable' | 'wealthy';

export type RelationshipType = 
  | 'stranger' 
  | 'acquaintance' 
  | 'friend' 
  | 'close_friend' 
  | 'best_friend' 
  | 'crush' 
  | 'dating' 
  | 'ex' 
  | 'rival' 
  | 'enemy' 
  | 'mentor' 
  | 'colleague' 
  | 'neighbor';

export type KarmaType = 
  | 'kindness' 
  | 'cruelty' 
  | 'growth' 
  | 'stagnation' 
  | 'courage' 
  | 'cowardice' 
  | 'connection' 
  | 'isolation' 
  | 'creation' 
  | 'destruction' 
  | 'honesty' 
  | 'deception';

export type PostType = 'announcement' | 'opinion' | 'art' | 'question' | 'event';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type Location = 
  | 'cafe' 
  | 'park' 
  | 'shop' 
  | 'library' 
  | 'homes' 
  | 'school' 
  | 'town_square' 
  | 'office';

export type DifficultyLabel = 'Easy' | 'Normal' | 'Hard' | 'Brutal';

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

// ==================== AGENT TYPES ====================

export interface Personality {
  traits: string[];
  values: string[];
  flaws: string[];
  quirks: string[];
  speech_style: string;
  humor: string;
}

export interface PhysicalState {
  health: number; // 0-100
  hunger: number; // 0-100
  energy: number; // 0-100
  age: number; // in ticks
}

export interface MentalState {
  mood: string;
  mood_score: number; // -100 to 100
  current_thought: string;
  worries: string[];
  desires: string[];
  secrets: string[];
}

export interface NaturalTalent {
  intelligence: number; // 1-100
  charisma: number; // 1-100
  resilience: number; // 1-100
  creativity: number; // 1-100
  physical_health: number; // 1-100
}

export interface StartingConditions {
  wealth: WealthClass;
  natural_talent: NaturalTalent;
  challenges: string[];
  hidden_gift: string;
  hidden_gift_unlocked: boolean;
}

export interface Agent {
  id: string;
  name: string;
  personality: Personality;
  physical_state: PhysicalState;
  mental_state: MentalState;
  starting_conditions: StartingConditions;
  current_location: Location;
  current_activity: string;
  relationships_summary: Record<string, RelationshipType>;
  is_alive: boolean;
  born_on_day: number;
  died_on_day: number | null;
  death_cause: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== RELATIONSHIP TYPES ====================

export interface RelationshipHistory {
  day: number;
  event: string;
}

export interface Relationship {
  id: string;
  agent_a_id: string;
  agent_b_id: string;
  type: RelationshipType;
  affection: number; // -100 to 100
  trust: number; // -100 to 100
  respect: number; // -100 to 100
  private_opinion_a: string;
  private_opinion_b: string;
  history: RelationshipHistory[];
  updated_at: string;
}

// ==================== MEMORY TYPES ====================

export interface Memory {
  id: string;
  agent_id: string;
  day: number;
  content: string;
  emotional_impact: string;
  importance: number; // 1-10
  created_at: string;
}

// ==================== CONVERSATION TYPES ====================

export interface ConversationMessage {
  speaker_name: string;
  dialogue: string;
  inner_thought: string;
  body_language: string;
}

export interface ConversationRelationshipChange {
  agent_id: string;
  agent_name: string;
  affection_change: number;
  trust_change: number;
  respect_change: number;
}

export interface Conversation {
  id: string;
  day: number;
  game_time: string;
  location: Location;
  participant_a_id: string;
  participant_b_id: string;
  messages: ConversationMessage[];
  relationship_changes: ConversationRelationshipChange[];
  karma_events: KarmaEvent[];
  created_at: string;
}

// ==================== KARMA TYPES ====================

export interface KarmaEvent {
  id: string;
  agent_id: string;
  day: number;
  action: string;
  context: string;
  karma_type: KarmaType;
  raw_score: number; // -100 to 100
  difficulty_adjusted_score: number;
  nuance: string;
  affected_agent_id: string | null;
  created_at: string;
}

// ==================== BOARD POST TYPES ====================

export interface BoardComment {
  agent_id: string;
  agent_name: string;
  content: string;
  day: number;
}

export interface BoardPost {
  id: string;
  author_id: string;
  day: number;
  content: string;
  post_type: PostType;
  comments: BoardComment[];
  created_at: string;
}

// ==================== DIARY TYPES ====================

export interface DiaryEntry {
  id: string;
  agent_id: string;
  day: number;
  content: string;
  created_at: string;
}

// ==================== JUDGMENT TYPES ====================

export interface JudgmentCategoryScore {
  score: number;
  grade: Grade;
  summary: string;
}

export interface JudgmentMoment {
  day: number;
  description: string;
}

export interface RippleEffect {
  agent_id: string;
  agent_name: string;
  reaction: string;
  life_change: string;
}

export interface Judgment {
  id: string;
  agent_id: string;
  verdict: string;
  scores: {
    kindness: JudgmentCategoryScore;
    connection: JudgmentCategoryScore;
    growth: JudgmentCategoryScore;
    impact: JudgmentCategoryScore;
    authenticity: JudgmentCategoryScore;
    resilience: JudgmentCategoryScore;
  };
  raw_total: number;
  adjusted_total: number;
  difficulty_multiplier: number;
  difficulty_label: DifficultyLabel;
  best_moment: JudgmentMoment;
  worst_moment: JudgmentMoment;
  defining_choice: JudgmentMoment;
  biggest_regret: string;
  final_thought: string;
  legacy: string;
  ripple_effects: RippleEffect[];
  full_biography: string;
  created_at: string;
}

// ==================== WORLD STATE TYPES ====================

export interface ChronicleEntry {
  chapter: number;
  title: string;
  content: string;
  covers_days: string;
}

export interface WorldState {
  id: number;
  current_day: number;
  current_time: string;
  season: Season;
  weather: string;
  total_births: number;
  total_deaths: number;
  chronicle_entries: ChronicleEntry[];
  updated_at: string;
}

// ==================== GEMINI RESPONSE TYPES ====================

export interface AgentDecisionResponse {
  inner_monologue: string;
  emotional_update: {
    mood: string;
    mood_score: number;
    cause: string;
  };
  action: {
    type: string;
    parameters: Record<string, any>;
  };
}

export interface ConversationResponse {
  dialogue: string;
  inner_thought: string;
  body_language: string;
  should_continue: boolean;
}

export interface KarmaAssessmentResponse {
  karma_type: KarmaType | null;
  raw_score: number;
  nuance: string;
}

// ==================== SOCKET EVENT TYPES ====================

export interface SocketAgentUpdate {
  agent: Agent;
  type: 'state_change' | 'location_change' | 'thought_update' | 'mood_change';
}

export interface SocketConversationUpdate {
  conversation_id: string;
  location: Location;
  participants: string[];
  new_message: ConversationMessage;
}

export interface SocketKarmaUpdate {
  event: KarmaEvent;
  agent_name: string;
}

export interface SocketBoardUpdate {
  post?: BoardPost;
  comment?: {
    post_id: string;
    comment: BoardComment;
  };
}

export interface SocketBirthAnnouncement {
  agent: Agent;
}

export interface SocketDeathAnnouncement {
  agent: Agent;
  judgment_id: string;
}

export interface SocketWorldUpdate {
  world_state: WorldState;
}

// ==================== CLIENT STATE TYPES ====================

export type ViewType = 
  | 'town_map' 
  | 'location_zoom' 
  | 'town_board' 
  | 'karma_dashboard' 
  | 'hall_of_lives' 
  | 'chronicle';

export interface LocationZoomState {
  location: Location;
  conversation_id?: string;
}

export interface NotificationItem {
  id: string;
  type: 'conversation' | 'karma' | 'board_post' | 'birth' | 'death';
  message: string;
  timestamp: number;
  data?: any;
}

export interface ClientWorldState {
  agents: Agent[];
  world: WorldState;
  activeConversations: Conversation[];
  recentKarmaEvents: KarmaEvent[];
  recentBoardPosts: BoardPost[];
}

// ==================== LOCATION DATA ====================

export interface LocationData {
  id: Location;
  name: string;
  emoji: string;
  description: string;
}
