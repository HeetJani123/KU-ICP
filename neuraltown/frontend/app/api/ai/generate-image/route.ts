import { NextResponse } from "next/server"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image"

interface ImageRequestBody {
  prompt: string
}

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 })
  }

  let payload: ImageRequestBody

  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const prompt = payload?.prompt?.trim()

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
  }

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
      temperature: 0.3,
    },
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify(requestBody),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Gemini image error", response.status, errorText)
      return NextResponse.json({ error: "Gemini image request failed", details: errorText }, { status: response.status })
    }

    const result = await response.json()
    const parts = result?.candidates?.[0]?.content?.parts || []
    const inlinePart = parts.find((part: any) => part?.inlineData?.data)
    const base64 = inlinePart?.inlineData?.data || null
    const mimeType = inlinePart?.inlineData?.mimeType || "image/png"

    if (!base64) {
      return NextResponse.json({ error: "Gemini returned no image" }, { status: 502 })
    }

    return NextResponse.json({ image: `data:${mimeType};base64,${base64}` })
  } catch (error) {
    console.error("Gemini image generation error", error)
    return NextResponse.json({ error: "Unexpected error generating image" }, { status: 500 })
  }
}
