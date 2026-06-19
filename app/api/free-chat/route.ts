import { NextResponse } from "next/server"

interface ChatRequestBody {
  messages?: Array<{
    role: "system" | "user" | "assistant"
    content: string
  }>
  systemPrompt?: string
  fallbackPrompt?: string
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as ChatRequestBody | null
  const messages = body?.messages?.filter((message) => message.content?.trim()) ?? []
  const systemPrompt = body?.systemPrompt?.trim() || messages.find((message) => message.role === "system")?.content || ""
  const fallbackPrompt = body?.fallbackPrompt?.trim() || messages
    .filter((message) => message.role !== "system")
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n\n")

  if (messages.length === 0 && !fallbackPrompt) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 })
  }

  const postResponse = await fetch("https://text.pollinations.ai/openai?referrer=storychat-local", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "StoryChat Local Dev",
    },
    body: JSON.stringify({
      model: "openai",
      messages,
      temperature: 0.9,
      max_tokens: 450,
      stream: false,
    }),
  })

  if (postResponse.ok) {
    const data = await postResponse.json() as {
      choices?: Array<{
        message?: {
          content?: string
        }
      }>
    }
    const content = data.choices?.[0]?.message?.content?.trim()
    if (content) return NextResponse.json({ content })
  }

  if (postResponse.status !== 403 && postResponse.status !== 429) {
    return NextResponse.json(
      { error: `Pollinations text API failed: ${postResponse.status}` },
      { status: postResponse.status },
    )
  }

  const fallbackParams = new URLSearchParams({
    model: "mistral",
    temperature: "0.9",
    system: systemPrompt,
    referrer: "storychat-local",
  })
  const fallbackResponse = await fetch(
    `https://text.pollinations.ai/${encodeURIComponent(fallbackPrompt)}?${fallbackParams.toString()}`,
    {
      headers: {
        "User-Agent": "StoryChat Local Dev",
      },
    },
  )

  if (!fallbackResponse.ok) {
    return NextResponse.json(
      { error: `Pollinations fallback text API failed: ${fallbackResponse.status}` },
      { status: fallbackResponse.status },
    )
  }

  const content = (await fallbackResponse.text()).trim()
  if (!content) {
    return NextResponse.json({ error: "Pollinations returned empty content" }, { status: 502 })
  }

  return NextResponse.json({ content })
}
