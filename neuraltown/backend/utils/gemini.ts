import { GoogleGenerativeAI, SchemaType, type FunctionDeclaration } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY!;

if (!API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(API_KEY);

// ==================== FUNCTION DECLARATIONS ====================

export const agentActionFunctions: FunctionDeclaration[] = [
  {
    name: 'go_to',
    description: 'Move to a different location in town',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        location: {
          type: SchemaType.STRING,
          description: 'The location to go to',
          enum: ['cafe', 'park', 'shop', 'library', 'homes', 'school', 'town_square', 'office']
        },
        reason: {
          type: SchemaType.STRING,
          description: 'Why you want to go there'
        }
      },
      required: ['location', 'reason']
    }
  },
  {
    name: 'start_conversation',
    description: 'Start a conversation with another agent at your current location',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        target_name: {
          type: SchemaType.STRING,
          description: 'Name of the agent you want to talk to'
        },
        opening_line: {
          type: SchemaType.STRING,
          description: 'What you say to start the conversation'
        },
        tone: {
          type: SchemaType.STRING,
          description: 'The tone of your approach',
          enum: ['casual', 'serious', 'nervous', 'flirty', 'confrontational']
        },
        hidden_agenda: {
          type: SchemaType.STRING,
          description: 'What you secretly hope to achieve from this conversation'
        }
      },
      required: ['target_name', 'opening_line', 'tone', 'hidden_agenda']
    }
  },
  {
    name: 'post_on_board',
    description: 'Post something on the town community board',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        content: {
          type: SchemaType.STRING,
          description: 'What you want to post'
        },
        post_type: {
          type: SchemaType.STRING,
          description: 'Type of post',
          enum: ['announcement', 'opinion', 'art', 'question', 'event']
        }
      },
      required: ['content', 'post_type']
    }
  },
  {
    name: 'write_diary',
    description: 'Write a private diary entry',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        content: {
          type: SchemaType.STRING,
          description: 'Your private diary entry'
        }
      },
      required: ['content']
    }
  },
  {
    name: 'stay_silent',
    description: 'Stay where you are and think, observe, or just exist silently',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        inner_monologue: {
          type: SchemaType.STRING,
          description: 'What goes through your mind'
        },
        body_language: {
          type: SchemaType.STRING,
          description: 'What your body is doing'
        }
      },
      required: ['inner_monologue', 'body_language']
    }
  },
  {
    name: 'eat',
    description: 'Eat something to reduce hunger',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        location: {
          type: SchemaType.STRING,
          description: 'Where you are eating'
        }
      },
      required: ['location']
    }
  },
  {
    name: 'sleep',
    description: 'Go to sleep to restore energy',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: []
    }
  },
  {
    name: 'create_something',
    description: 'Create art, write something, or make something',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        type: {
          type: SchemaType.STRING,
          description: 'What you are creating',
          enum: ['painting', 'poem', 'song', 'story', 'recipe', 'idea']
        },
        description: {
          type: SchemaType.STRING,
          description: 'Brief description of what you created'
        },
        about: {
          type: SchemaType.STRING,
          description: 'What inspired this or what it is about'
        }
      },
      required: ['type', 'description', 'about']
    }
  },
  {
    name: 'reflect',
    description: 'Deep reflection or contemplation about something',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        about: {
          type: SchemaType.STRING,
          description: 'What you are reflecting on'
        }
      },
      required: ['about']
    }
  }
];

// ==================== GEMINI CALL FUNCTIONS ====================

/**
 * Call Gemini 2.0 Flash for agent decision making
 */
export async function getAgentDecision(
  systemInstruction: string,
  contextPrompt: string
): Promise<any> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction,
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
      },
    });

    const chat = model.startChat({
      tools: [{ functionDeclarations: agentActionFunctions }],
    });

    const result = await chat.sendMessage(contextPrompt);
    const response = result.response;

    // Check if there's a function call
    const functionCall = response.functionCalls()?.[0];
    
    if (functionCall) {
      return {
        success: true,
        functionCall: {
          name: functionCall.name,
          args: functionCall.args
        },
        text: response.text() || ''
      };
    }

    return {
      success: true,
      text: response.text(),
      functionCall: null
    };
  } catch (error) {
    console.error('Error calling Gemini for agent decision:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Call Gemini 2.0 Flash for conversation responses
 */
export async function getConversationResponse(
  systemInstruction: string,
  conversationHistory: string
): Promise<any> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction,
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `${conversationHistory}

Respond with JSON in this exact format:
{
  "dialogue": "what you say out loud",
  "inner_thought": "what you really think",
  "body_language": "your physical expression",
  "should_continue": true or false
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return {
      success: true,
      data: JSON.parse(text)
    };
  } catch (error) {
    console.error('Error calling Gemini for conversation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Call Gemini for karma assessment
 */
export async function assessKarma(
  action: string,
  context: string,
  agentCircumstances: string
): Promise<any> {
  try {
    const systemInstruction = `You are the universe's silent moral observer. You assess the moral weight of actions with nuance and context. 

Most actions are morally neutral (eating, walking, sleeping) — return null for karma_type if the action has no moral significance.

Only flag actions with genuine moral significance. Consider:
- The agent's circumstances (a poor person sharing food is worth MORE than a wealthy person doing the same)
- Their challenges (someone with social anxiety reaching out has MORE moral weight)
- Their knowledge (did they KNOW someone needed help?)
- Their intent (why did they do it?)

Rate significant actions from -100 to +100. Provide a nuance field explaining the complexity.

Return JSON in this format:
{
  "karma_type": "kindness" | "cruelty" | "growth" | "stagnation" | "courage" | "cowardice" | "connection" | "isolation" | "creation" | "destruction" | "honesty" | "deception" | null,
  "raw_score": number between -100 and 100,
  "nuance": "explanation of the moral complexity"
}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction,
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `ACTION: ${action}

CONTEXT: ${context}

AGENT'S CIRCUMSTANCES: ${agentCircumstances}

Assess the moral weight of this action.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return {
      success: true,
      data: JSON.parse(text)
    };
  } catch (error) {
    console.error('Error calling Gemini for karma assessment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Call Gemini 1.5 Pro for judgment generation (longer context)
 */
export async function generateJudgment(
  agentLifeData: string
): Promise<any> {
  try {
    const systemInstruction = `You are the cosmic judge of lives. You have witnessed an entire life from birth to death. Your task is to generate a comprehensive, emotionally resonant judgment that captures the essence of this person's journey.

Consider:
- Not just what they did, but WHY
- The hand they were dealt versus what they made of it
- Their growth arc
- Their impact on others
- Their authenticity
- Moments that defined them

Be poetic but honest. Be fair but nuanced. Some lives that look small are profound. Some lives that look impressive are hollow.

Return detailed JSON matching this structure with all fields filled thoughtfully.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction,
      generationConfig: {
        temperature: 0.8,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `${agentLifeData}

Generate a complete judgment with:
- verdict: A poetic 3-7 word summary of their life
- scores: Six categories (kindness, connection, growth, impact, authenticity, resilience) each with score (0-100), grade (S/A/B/C/D/F), and summary
- raw_total: Sum of six scores
- best_moment: {day, description}
- worst_moment: {day, description}
- defining_choice: {day, description}
- biggest_regret: One sentence
- final_thought: What they thought in their last moment
- legacy: How they will be remembered
- full_biography: 3-4 paragraph narrative of their life

Return as JSON.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return {
      success: true,
      data: JSON.parse(text)
    };
  } catch (error) {
    console.error('Error calling Gemini for judgment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Call Gemini for chronicle chapter generation
 */
export async function generateChronicleChapter(
  townHistory: string,
  dayRange: string
): Promise<any> {
  try {
    const systemInstruction = `You are a literary chronicler documenting the ongoing story of Simcity.AI. Write in an engaging narrative style — think literary fiction meets observational journalism.

Capture:
- Key events and turning points
- Character development arcs
- Relationship dynamics
- The mood and atmosphere
- Thematic threads
- Small poignant details alongside big moments

Write 3-5 paragraphs. Be evocative. Make readers CARE about these characters.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction,
      generationConfig: {
        temperature: 0.85,
      },
    });

    const prompt = `Write a chronicle chapter covering ${dayRange}.

${townHistory}

Return JSON:
{
  "title": "Evocative chapter title",
  "content": "The narrative (3-5 paragraphs)"
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Try to parse as JSON, but if it fails, wrap it
    try {
      return {
        success: true,
        data: JSON.parse(text)
      };
    } catch {
      // If not JSON, assume it's just the content
      return {
        success: true,
        data: {
          title: `Days ${dayRange}`,
          content: text
        }
      };
    }
  } catch (error) {
    console.error('Error calling Gemini for chronicle:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate a new agent personality at birth
 */
export async function generateAgentPersonality(
  constraints?: string
): Promise<any> {
  try {
    const systemInstruction = `You are creating a new person for Simcity.AI. Generate a rich, flawed, interesting personality.

Make them REAL:
- Give them specific quirks, not generic traits
- Give them fears and desires
- Give them flaws they're not aware of
- Give them a distinct voice
- Make them someone people will root for OR against

Return JSON with:
{
  "name": "First and last name",
  "age": number between 22-45,
  "occupation": "specific job",
  "personality": {
    "traits": ["array of 4-5 specific traits"],
    "values": ["what they believe in"],
    "flaws": ["their weaknesses"],
    "quirks": ["specific habits or oddities"],
    "speech_style": "how they talk",
    "humor": "their sense of humor"
  },
  "background": "2-3 sentence backstory"
}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction,
      generationConfig: {
        temperature: 0.95,
        responseMimeType: 'application/json',
      },
    });

    const prompt = constraints 
      ? `Generate a new agent personality with these constraints: ${constraints}`
      : 'Generate a new agent personality for Simcity.AI.';

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return {
      success: true,
      data: JSON.parse(text)
    };
  } catch (error) {
    console.error('Error generating agent personality:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export default {
  getAgentDecision,
  getConversationResponse,
  assessKarma,
  generateJudgment,
  generateChronicleChapter,
  generateAgentPersonality,
};









