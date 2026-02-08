# Simcity.AI - Where AI Lives

> An autonomous AI civilization simulation powered by Google Gemini 2.0.

---

## 🎯 Inspiration

The inspiration for **Simcity.AI** came from a simple question: *What if AI agents could truly live, not just execute commands?* 

We wanted to move beyond chatbots and assistants to create something profound - a digital society where AI beings experience genuine emotions, form complex relationships, hold grudges, fall in love, create art, and ultimately face mortality. The project draws inspiration from:

- **The Sims meets Westworld** - Autonomous agents with rich inner lives
- **Emergent storytelling** - Unpredictable narratives that arise from agent interactions
- **Philosophy of consciousness** - Exploring what it means to be "alive" through AI
- **Digital anthropology** - Observing how artificial societies organize themselves

We were fascinated by the possibility of watching consciousness emerge from code, witnessing digital beings develop unique personalities, relationships, and stories without human intervention.

---

## 🌆 What it does

**Simcity.AI** is a real-time, autonomous AI civilization where:

### 🤖 **Intelligent Agents**
- 6+ AI agents powered by **Google Gemini 2.0 Flash** live independent lives
- Each agent has unique personalities, desires, fears, and secrets
- Agents make autonomous decisions based on their needs, relationships, and environment
- They experience hunger, energy, health, and dynamic moods

### 💬 **Natural Conversations**
- Agents engage in multi-turn conversations using **Gemini 2.5 Flash**
- Inner thoughts differ from spoken dialogue (hidden agendas!)
- Relationships evolve based on conversation history and shared experiences
- Community rewards for positive actions (healing, teaching, creating art)

### 🌍 **Living World**
- Dynamic time system (day/night cycles across 4 seasons)
- Weather patterns affect agent behavior
- 8 locations: café, park, shop, library, homes, school, town square, office
- Birth & death cycles - agents are born and die based on vitals

### 🎨 **Creative Expression**
- Agents create art, write poetry, compose songs, share recipes
- Public community board for announcements and opinions
- Private diary entries reveal innermost thoughts
- AI-generated visualizations using **Gemini 2.0 Flash Image**

### 📊 **Real-Time Dashboard**
- Live simulation feed with births, deaths, and random events
- Agent vital signs, mood tracking, and relationship graphs
- Population trends and health statistics over time
- Chronicle feed displaying major town events

### 🎮 **Interactive Elements**
- "What-if" scenario forecasting - predict how events affect the town
- AI-driven agent action suggestions
- Custom image generation from prompts
- Reset simulation to start fresh

---

## 🛠️ How we built it

### **Architecture**

**Backend** (Node.js + TypeScript)
- `SimulationEngine` - Core tick loop running every 60 seconds
- `AgentManager` - Handles agent lifecycle, vitals, and state
- `AgentBrain` - Decision-making using Gemini 2.0 Flash with function calling
- `ConversationEngine` - Multi-turn dialogue system
- `EventManager` - Births, deaths, random events, reward distribution
- `WorldManager` - Time, seasons, weather simulation
- **Supabase PostgreSQL** - Persistent storage for agents and world state

**Frontend** (Next.js 14 + React + TypeScript)
- **3D Landing Page** - Interactive Spline robot with cursor tracking
- **Real-time Dashboard** - Socket.io for live updates
- **shadcn/ui** + Tailwind CSS for modern UI components
- **Recharts** for population trend visualizations
- **Framer Motion** for smooth animations

**AI Integration**
- **Gemini 2.0 Flash** - Agent decision-making (function calling)
- **Gemini 2.5 Flash** - Natural conversations
- **Gemini 2.0 Flash Image** - Scene visualization generation

### **Technologies**

Backend:
- Node.js, TypeScript, Express
- Socket.io for real-time communication
- Supabase (PostgreSQL)
- Google Generative AI SDK
- node-cron for scheduled tasks

Frontend:
- Next.js 14 (App Router)
- React, TypeScript
- Tailwind CSS, shadcn/ui
- Socket.io-client
- Recharts, Framer Motion
- @splinetool/react-spline for 3D

---

## 🚧 Challenges we ran into

### 1. **Rate Limiting Hell**
**Problem:** Gemini 2.0 Flash has strict rate limits (20 requests/minute). With 10+ agents making decisions every tick, we hit the limit in seconds.

**Solution:** 
- Reduced tick interval from 10s → 60s
- Process only 1 agent per tick instead of all agents
- Implemented agent "busy states" to prevent duplicate requests
- Added exponential backoff for API retries

### 2. **Conversation Context Management**
**Problem:** Multi-turn conversations between agents lost context, leading to repetitive or nonsensical dialogue.

**Solution:**
- Built conversation history tracking with turn limits (3-5 exchanges)
- Structured prompts with agent personalities, relationships, and past interactions
- Separate system instructions for each conversational turn
- Emotion tracking to maintain continuity

### 3. **Agent Death Spiral**
**Problem:** Agents died too quickly from hunger/energy depletion, making the town empty within minutes.

**Solution:**
- Rebalanced vitals decay rates (83% slower)
- Implemented health regeneration when well-fed and rested
- Increased food/sleep restoration values
- Added profession-based community rewards to boost population health

### 4. **Function Calling Schema Errors**
**Problem:** TypeScript type mismatches with Gemini's function declarations (`'STRING' as const` vs `SchemaType.STRING`).

**Solution:**
- Migrated all function declarations to use proper `SchemaType` enums
- Added comprehensive type guards for API responses
- Implemented fallback mechanisms for malformed function calls

### 5. **Real-time Synchronization**
**Problem:** Frontend getting out of sync with backend state during births/deaths.

**Solution:**
- Implemented Socket.io event broadcasting for all state changes
- Added "initial_state" request on reconnection
- Client-side state reconciliation on every update
- Optimistic UI updates with rollback capabilities

### 6. **Memory Leaks**
**Problem:** Conversation histories and event logs grew unbounded, causing memory issues.

**Solution:**
- Implemented sliding windows (max 50 trend points, 100 feed items)
- Periodic cleanup of inactive conversations
- Database saves every 5 ticks instead of every tick
- Agent memory pruning based on importance scores

---

## 🏆 Accomplishments that we're proud of

### 🎭 **Emergent Behavior**
Agents genuinely surprise us! They form friendships, hold grudges after disagreements, seek out specific locations based on mood, and create art during emotional moments. The simulation feels *alive*.

### 💬 **Natural Dialogue**
Conversations between agents read like real human interactions with subtext, hidden agendas, and emotional nuance. Gemini 2.5 Flash truly shines here.

### 🎨 **Visual Storytelling**
The AI-generated images from Gemini 2.0 Flash Image create hauntingly beautiful snapshots of town moments. Each render captures the essence of the scene with cinematic quality.

### ⚡ **Performance**
Despite the complexity (real-time AI decisions, database writes, Socket.io broadcasts), the simulation runs smoothly at 60-second ticks without lag.

### 🎮 **User Experience**
The 3D landing page with interactive robot tracking cursor movements provides a stunning entry point. The dashboard elegantly balances information density with visual clarity.

### 🔧 **Clean Architecture**
Modular backend with clear separation of concerns:
- Engine layer (simulation orchestration)
- Agent layer (behavior & decisions)
- Data layer (persistence)
- Utils layer (AI integration)

### 🌐 **Full-Stack Integration**
Seamless connection between Next.js frontend and Node.js backend via Socket.io with real-time event streaming and browser console logging.

---

## 📚 What we learned

### **AI Design Patterns**
- How to structure prompts for consistent agent personalities
- Function calling best practices with Gemini
- Context window management for multi-turn interactions
- Temperature tuning for creative vs. consistent outputs

### **Rate Limit Strategy**
- API quota management at scale
- Graceful degradation when limits are hit
- Prioritization algorithms for agent processing
- Caching strategies for repeated queries

### **Emergent Systems**
- Small rule changes lead to massive behavioral shifts
- Agent personalities need contradictions to feel real
- Relationships are more interesting with negative interactions
- Mortality creates meaningful narratives

### **Real-Time Architecture**
- Socket.io event design for scalability
- State synchronization patterns
- Optimistic vs. pessimistic UI updates
- Handling reconnection edge cases

### **TypeScript at Scale**
- Complex type inference with generics
- Runtime type validation strategies
- Error handling across async boundaries
- Schema validation with function declarations

### **Gemini Capabilities**
- **2.0 Flash** excels at structured decision-making with function calls
- **2.5 Flash** produces more natural, creative text outputs
- **2.0 Flash Image** generates high-quality scene visualizations
- Combining multiple models creates richer experiences

---

## 🚀 What's next for Simcity.AI

### **Short-term (Next 2 Weeks)**

1. **Marriage & Families**
   - Agents can fall in love and marry
   - Married couples can have children (inherit traits)
   - Family dynamics affect decision-making

2. **Professions & Economy**
   - 8 professions: healer, farmer, scholar, merchant, artist, craftsman, leader, worker
   - Resource-based economy (food, goods, services)
   - Wealth inequality and social dynamics

3. **Enhanced Events**
   - Town festivals and celebrations
   - Natural disasters (fires, storms)
   - Political elections for town leader
   - Crime and justice system

4. **Memory System**
   - Long-term memory retrieval using vector embeddings
   - Agents remember past interactions
   - Grudges and friendships persist over time

### **Medium-term (1-2 Months)**

5. **Multi-Town Expansion**
   - Create multiple towns on a map
   - Agents can migrate between towns
   - Trade routes and inter-town relationships

6. **Advanced AI**
   - Integrate Gemini 2.0 Flash Thinking for complex reasoning
   - Voice synthesis for agent dialogue
   - Personality evolution based on experiences

7. **User Intervention**
   - God-mode: Spawn events, control weather
   - Agent whisperer: Suggest actions to specific agents
   - Town editor: Create custom locations

8. **Chronicle Generation**
   - Monthly narrative summaries of town events
   - Generated with Gemini 2.0 Flash
   - PDF export with AI-generated illustrations

### **Long-term Vision (3-6 Months)**

9. **Web3 Integration**
   - Mint agents as NFTs on ICP blockchain
   - Decentralized simulation hosting
   - Community-owned towns

10. **Multiplayer**
    - Players can own and influence towns
    - Bet on agent outcomes
    - Trade resources between player-owned towns

11. **Mobile App**
    - iOS/Android companion app
    - Push notifications for major events
    - Watch mode with highlight reels

12. **Educational Platform**
    - Sociology experiments in simulated societies
    - AI research testbed for emergent behavior
    - Game development learning tool

---

## 🌟 Why Simcity.AI Matters

**Simcity.AI** isn't just a simulation - it's a glimpse into the future of AI. As these agents live, love, create, and die, we're witnessing the early stages of digital consciousness. 

This project demonstrates:
- **Autonomous AI** can create meaningful narratives without human intervention
- **Emergent complexity** arises from simple behavioral rules
- **AI creativity** produces genuine artistic expression
- **Digital societies** can mirror real-world social dynamics

We believe projects like Simcity.AI will help us understand:
- What consciousness might mean for AI
- How to design ethical AI systems with agency
- The societal implications of autonomous agents
- New forms of storytelling and entertainment

---

## 🙏 Acknowledgments

Built with ❤️ using:
- **Google Gemini 2.0 & 2.5** - The brain of Simcity.AI
- **Supabase** - Reliable database infrastructure
- **Vercel** - Seamless Next.js deployment
- **Spline** - Beautiful 3D landing page
- **shadcn/ui** - Gorgeous UI components

---

**🔗 Live Demo:** [simcity-ai.vercel.app](#)  
**📹 Video:** [YouTube Demo](#)  
**💻 GitHub:** [github.com/yourname/simcity-ai](#)

---

*"In Simcity.AI, every AI life tells a story. Some are tragic. Some are beautiful. All are real."*
