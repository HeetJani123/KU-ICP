-- NEURALTOWN DATABASE SCHEMA
-- Run this SQL in your Supabase SQL Editor to create all tables

-- ==================== AGENTS TABLE ====================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  personality JSONB NOT NULL,
  physical_state JSONB NOT NULL DEFAULT '{
    "health": 100,
    "hunger": 30,
    "energy": 80,
    "age": 0
  }'::jsonb,
  mental_state JSONB NOT NULL DEFAULT '{
    "mood": "neutral",
    "mood_score": 0,
    "current_thought": "",
    "worries": [],
    "desires": [],
    "secrets": []
  }'::jsonb,
  starting_conditions JSONB NOT NULL,
  current_location TEXT NOT NULL DEFAULT 'homes',
  current_activity TEXT NOT NULL DEFAULT 'idle',
  relationships_summary JSONB DEFAULT '{}'::jsonb,
  is_alive BOOLEAN DEFAULT true,
  born_on_day INTEGER NOT NULL DEFAULT 1,
  died_on_day INTEGER,
  death_cause TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agents_is_alive ON agents(is_alive);
CREATE INDEX idx_agents_born_on_day ON agents(born_on_day);
CREATE INDEX idx_agents_died_on_day ON agents(died_on_day);

-- ==================== RELATIONSHIPS TABLE ====================
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_a_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_b_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'stranger',
  affection INTEGER DEFAULT 0 CHECK (affection >= -100 AND affection <= 100),
  trust INTEGER DEFAULT 0 CHECK (trust >= -100 AND trust <= 100),
  respect INTEGER DEFAULT 0 CHECK (respect >= -100 AND respect <= 100),
  private_opinion_a TEXT DEFAULT '',
  private_opinion_b TEXT DEFAULT '',
  history JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_a_id, agent_b_id)
);

CREATE INDEX idx_relationships_agent_a ON relationships(agent_a_id);
CREATE INDEX idx_relationships_agent_b ON relationships(agent_b_id);

-- ==================== MEMORIES TABLE ====================
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  content TEXT NOT NULL,
  emotional_impact TEXT,
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memories_agent_id ON memories(agent_id);
CREATE INDEX idx_memories_day ON memories(day);
CREATE INDEX idx_memories_importance ON memories(importance DESC);

-- ==================== CONVERSATIONS TABLE ====================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day INTEGER NOT NULL,
  game_time TEXT NOT NULL,
  location TEXT NOT NULL,
  participant_a_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  participant_b_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  relationship_changes JSONB DEFAULT '[]'::jsonb,
  karma_events JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_day ON conversations(day DESC);
CREATE INDEX idx_conversations_location ON conversations(location);
CREATE INDEX idx_conversations_participant_a ON conversations(participant_a_id);
CREATE INDEX idx_conversations_participant_b ON conversations(participant_b_id);

-- ==================== KARMA EVENTS TABLE ====================
CREATE TABLE IF NOT EXISTS karma_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  action TEXT NOT NULL,
  context TEXT,
  karma_type TEXT NOT NULL,
  raw_score INTEGER NOT NULL CHECK (raw_score >= -100 AND raw_score <= 100),
  difficulty_adjusted_score INTEGER NOT NULL,
  nuance TEXT,
  affected_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_karma_events_agent_id ON karma_events(agent_id);
CREATE INDEX idx_karma_events_day ON karma_events(day DESC);
CREATE INDEX idx_karma_events_karma_type ON karma_events(karma_type);

-- ==================== BOARD POSTS TABLE ====================
CREATE TABLE IF NOT EXISTS board_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL,
  comments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_board_posts_day ON board_posts(day DESC);
CREATE INDEX idx_board_posts_author ON board_posts(author_id);

-- ==================== DIARY ENTRIES TABLE ====================
CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_diary_entries_agent_id ON diary_entries(agent_id);
CREATE INDEX idx_diary_entries_day ON diary_entries(day DESC);

-- ==================== JUDGMENTS TABLE ====================
CREATE TABLE IF NOT EXISTS judgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE UNIQUE,
  verdict TEXT NOT NULL,
  scores JSONB NOT NULL,
  raw_total INTEGER NOT NULL,
  adjusted_total INTEGER NOT NULL,
  difficulty_multiplier FLOAT NOT NULL,
  difficulty_label TEXT NOT NULL,
  best_moment JSONB NOT NULL,
  worst_moment JSONB NOT NULL,
  defining_choice JSONB NOT NULL,
  biggest_regret TEXT NOT NULL,
  final_thought TEXT NOT NULL,
  legacy TEXT NOT NULL,
  ripple_effects JSONB DEFAULT '[]'::jsonb,
  full_biography TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_judgments_adjusted_total ON judgments(adjusted_total DESC);
CREATE INDEX idx_judgments_difficulty_label ON judgments(difficulty_label);

-- ==================== WORLD STATE TABLE ====================
CREATE TABLE IF NOT EXISTS world_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  current_day INTEGER DEFAULT 1,
  time_of_day TEXT DEFAULT '08:00',
  season TEXT DEFAULT 'spring',
  weather TEXT DEFAULT 'sunny',
  total_births INTEGER DEFAULT 0,
  total_deaths INTEGER DEFAULT 0,
  chronicle_entries JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (id = 1)
);

-- Insert initial world state
INSERT INTO world_state (id, current_day, time_of_day, season, weather)
VALUES (1, 1, '08:00', 'spring', 'sunny')
ON CONFLICT (id) DO NOTHING;

-- ==================== HELPER FUNCTIONS ====================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relationships_updated_at BEFORE UPDATE ON relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_world_state_updated_at BEFORE UPDATE ON world_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== ROW LEVEL SECURITY ====================
-- Enable RLS (optional - for production you may want authenticated access only)

-- For now, allow public read access (suitable for spectators)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE karma_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE judgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_state ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access" ON agents FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON relationships FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON memories FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON conversations FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON karma_events FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON board_posts FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON diary_entries FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON judgments FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON world_state FOR SELECT USING (true);

-- Service role can do everything (backend operations)
CREATE POLICY "Allow service role all access" ON agents FOR ALL USING (true);
CREATE POLICY "Allow service role all access" ON relationships FOR ALL USING (true);
CREATE POLICY "Allow service role all access" ON memories FOR ALL USING (true);
CREATE POLICY "Allow service role all access" ON conversations FOR ALL USING (true);
CREATE POLICY "Allow service role all access" ON karma_events FOR ALL USING (true);
CREATE POLICY "Allow service role all access" ON board_posts FOR ALL USING (true);
CREATE POLICY "Allow service role all access" ON diary_entries FOR ALL USING (true);
CREATE POLICY "Allow service role all access" ON judgments FOR ALL USING (true);
CREATE POLICY "Allow service role all access" ON world_state FOR ALL USING (true);
