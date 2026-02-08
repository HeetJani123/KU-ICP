import { NextResponse } from "next/server"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-pro"

interface AgentSnapshot {
  id: string
  name: string
  age?: number
  location?: string
  health?: number
  hunger?: number
  energy?: number
  last_thought?: string
  last_action?: string
  personality?: {
    traits?: string[]
  }
  rawMood?: string
  moodScore?: number
  wealthClass?: string
  bornDay?: number
}

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 })
  }

  let payload: { agent: AgentSnapshot; prompt?: string }

  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!payload?.agent) {
    return NextResponse.json({ error: "Agent context is required" }, { status: 400 })
  }

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are the neural operations director inside a settlement simulation. For the agent below, produce three actionable directives that a control team could send.
Each directive must have:
- title: a 3-5 word codename.
- summary: ≤40 word description of the action.
- risk: one of LOW, MEDIUM, HIGH with quick justification.
Format the response strictly as JSON with an array named actions.
Agent snapshot: ${JSON.stringify(payload.agent)}
User directive: ${payload.prompt?.trim() || "Use current telemetry to propose helpful actions."}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 512,
      responseMimeType: "application/json",
    },
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: "Gemini request failed", details: errorText },
        { status: response.status },
      )
    }

    const result = await response.json()
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      return NextResponse.json({ error: "Gemini returned no content" }, { status: 502 })
    }

    let parsed: { actions: Array<{ title: string; summary: string; risk: string }> }
    try {
      parsed = JSON.parse(text)
    } catch (error) {
      return NextResponse.json({ error: "Failed to parse Gemini response", raw: text }, { status: 502 })
    }

    return NextResponse.json({ suggestions: parsed.actions ?? [] })
  } catch (error) {
    console.error("Gemini agent action error", error)
    return NextResponse.json({ error: "Unexpected error generating actions" }, { status: 500 })
  }
}
