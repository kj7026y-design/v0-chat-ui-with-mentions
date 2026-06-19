import { NextResponse } from "next/server"

interface ChatRequestBody {
  messages?: Array<{
    role: "system" | "user" | "assistant"
    content: string
  }>
  systemPrompt?: string
  fallbackPrompt?: string
}

const FREE_TIER_INTERVAL_MS = 15_000
const POLLINATIONS_TIMEOUT_MS = 45_000

let nextAllowedPollinationsAt = 0
let pollinationsQueue = Promise.resolve()

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForFreeTierSlot() {
  const now = Date.now()
  const waitMs = Math.max(0, nextAllowedPollinationsAt - now)
  if (waitMs > 0) await wait(waitMs)
  nextAllowedPollinationsAt = Date.now() + FREE_TIER_INTERVAL_MS
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Pollinations request timed out")), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function runQueued<T>(task: () => Promise<T>) {
  const run = pollinationsQueue.then(async () => {
    await waitForFreeTierSlot()
    return task()
  })
  pollinationsQueue = run.then(() => undefined, () => undefined)
  return run
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

  return runQueued(async () => {
    const postResponse = await withTimeout(fetch("https://text.pollinations.ai/openai?referrer=storychat-local", {
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
    }), POLLINATIONS_TIMEOUT_MS)

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
    const fallbackResponse = await withTimeout(fetch(
      `https://text.pollinations.ai/${encodeURIComponent(fallbackPrompt)}?${fallbackParams.toString()}`,
      {
        headers: {
          "User-Agent": "StoryChat Local Dev",
        },
      },
    ), POLLINATIONS_TIMEOUT_MS)

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
  }).catch((error) => {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Free chat API failed" },
      { status: 504 },
    )
  })
}
