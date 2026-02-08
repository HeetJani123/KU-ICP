import { NextResponse } from "next/server"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-pro"

interface ScenarioPreset {
  id: string
  label: string
  description: string
  systemPrompt: string
}

interface ScenarioRequestBody {
  preset: ScenarioPreset
  note?: string
  world: Record<string, unknown>
  agent?: Record<string, unknown> | null
}

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 })
  }

  let payload: ScenarioRequestBody

  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!payload?.preset || !payload?.world) {
    return NextResponse.json({ error: "Preset and world context are required" }, { status: 400 })
  }

  const instructions = `You orchestrate Simcity.AI, a synthetic society simulation.
You will be given:
- preset: a short description of the catalyst event.
- world: current stats for the whole settlement.
- agent: optionally the agent that triggered the request.
- note: optional extra constraints from the directors.

Respond ONLY as JSON with the following shape:
{
  "title": string,
  "headline": string,
  "impactScore": number (0-100 severity),
  "phases": Array<{ "name": string, "detail": string, "confidence": number between 0 and 1 }>,
  "actions": Array<{ "label": string, "effect": string, "priority": "Critical" | "High" | "Moderate" | "Low" }>,
  "signals": string[]
}
Make phases chronological and keep confidence values between 0 and 1.`

  const content = `Preset context: ${JSON.stringify(payload.preset)}
World snapshot: ${JSON.stringify(payload.world)}
Agent focus: ${JSON.stringify(payload.agent ?? null)}
Director note: ${payload.note ?? "None"}`

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          { text: instructions },
          { text: content },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 768,
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
      return NextResponse.json({ error: "Gemini request failed", details: errorText }, { status: response.status })
    }

    const result = await response.json()
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      return NextResponse.json({ error: "Gemini returned no content" }, { status: 502 })
    }

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch (error) {
      return NextResponse.json({ error: "Failed to parse Gemini response", raw: text }, { status: 502 })
    }

    return NextResponse.json({ projection: parsed })
  } catch (error) {
    console.error("Gemini scenario forecast error", error)
    return NextResponse.json({ error: "Unexpected error generating scenario" }, { status: 500 })
  }
}
