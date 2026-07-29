import assert from "node:assert/strict"
import test from "node:test"

import {
  extractImageTrigger,
  hasHybridChatRequestShape,
  runHybridChat,
} from "../lib/hybrid-chat"

test("hybrid request detection does not intercept the existing messages contract", () => {
  assert.equal(hasHybridChatRequestShape({ message: "hello", chatHistory: [] }), true)
  assert.equal(hasHybridChatRequestShape({ messages: [{ role: "user", content: "hello" }] }), false)
})

test("image trigger is removed from visible text and its English prompt is extracted", () => {
  const result = extractImageTrigger(
    "창가에서 기다릴게.\n[TRIGGER_IMG: two adults waiting beside a rain-streaked window]",
  )

  assert.equal(result.text, "창가에서 기다릴게.")
  assert.equal(
    result.imagePrompt,
    "two adults waiting beside a rain-streaked window",
  )
})

test("selected chat model generates text before Fal renders the image", async () => {
  const requests: Array<{ url: string; body: Record<string, unknown> }> = []
  const textRequests: Array<{ modelId?: string; messages: Array<{ role: string; content: string }> }> = []
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input)
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>
    requests.push({ url, body })

    return new Response(JSON.stringify({
      images: [{ url: "https://cdn.example.com/generated.jpg" }],
    }), { status: 200 })
  }

  const result = await runHybridChat(
    {
      message: "지금 장면을 이어줘",
      modelId: "gemini-pro",
      chatHistory: [
        { role: "user", content: "밖에는 비가 내렸다." },
        { role: "assistant", content: "그는 우산을 펼쳤다." },
      ],
    },
    {
      fetcher,
      env: {
        FAL_KEY: "fal-test-key",
      },
      textGenerator: async (request) => {
        textRequests.push(request)
        return {
          content: "비가 그치면 같이 걷자.\n[TRIGGER_IMG: two fictional adults sharing an umbrella on a rainy street]",
          modelId: "gemini-pro",
          provider: "gemini",
        }
      },
    },
  )

  assert.deepEqual(result, {
    text: "비가 그치면 같이 걷자.",
    image: "https://cdn.example.com/generated.jpg",
  })
  assert.equal(textRequests.length, 1)
  assert.equal(textRequests[0]?.modelId, "gemini-pro")
  assert.equal(textRequests[0]?.messages.at(-1)?.content, "지금 장면을 이어줘")
  assert.equal(requests.length, 1)
  assert.match(
    String(requests[0]?.body.prompt),
    /masterpiece, best quality, highly detailed, 8k, /u,
  )
  assert.match(String(requests[0]?.body.prompt), /zero visible writing/u)
  assert.equal(requests[0]?.body.image_size, "square_hd")
  assert.equal(requests[0]?.body.num_images, 1)
  assert.equal(requests[0]?.body.num_inference_steps, 40)
  assert.equal(requests[0]?.body.guidance_scale, 3.5)
  assert.equal(requests[0]?.body.noise_source, "gpu")
  assert.equal(requests[0]?.body.enable_safety_checker, true)
  assert.equal(requests[0]?.body.output_format, "jpeg")
})

test("Fal main-model failure retries fast-sdxl with fallback-specific tuning", async () => {
  const requests: Array<{ url: string; body: Record<string, unknown> }> = []
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input)
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>
    requests.push({ url, body })

    if (url.endsWith("/pony-v7")) {
      return new Response(JSON.stringify({
        error: { message: "main model unavailable" },
      }), { status: 503 })
    }

    return new Response(JSON.stringify({
      images: [{ url: "https://cdn.example.com/fallback.jpg" }],
    }), { status: 200 })
  }

  const originalConsoleWarn = console.warn
  console.warn = () => undefined
  try {
    const result = await runHybridChat(
      { message: "장면을 보여줘", chatHistory: [] },
      {
        fetcher,
        env: {
          FAL_KEY: "fal-test-key",
        },
        textGenerator: async () => ({
          content: "문을 열었다. [TRIGGER_IMG: an adult opening an old wooden door]",
          modelId: "free",
          provider: "gemini",
        }),
      },
    )

    assert.deepEqual(result, {
      text: "문을 열었다.",
      image: "https://cdn.example.com/fallback.jpg",
    })
    assert.equal(requests.length, 2)
    assert.match(requests[0]?.url || "", /\/pony-v7$/u)
    assert.equal(requests[0]?.body.num_inference_steps, 40)
    assert.equal(requests[0]?.body.guidance_scale, 3.5)
    assert.equal(requests[0]?.body.noise_source, "gpu")
    assert.match(requests[1]?.url || "", /\/fast-sdxl$/u)
    assert.equal(requests[1]?.body.num_inference_steps, 4)
    assert.equal(requests[1]?.body.guidance_scale, 1.75)
    assert.equal(requests[1]?.body.format, "jpeg")
    assert.equal(requests[1]?.body.output_format, undefined)
  } finally {
    console.warn = originalConsoleWarn
  }
})

test("Fal main-model timeout immediately retries the fast-sdxl fallback", async () => {
  const requests: string[] = []
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input)
    requests.push(url)

    if (url.endsWith("/pony-v7")) {
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"))
        }, { once: true })
      })
    }

    return new Response(JSON.stringify({
      images: [{ url: "https://cdn.example.com/timeout-fallback.jpg" }],
    }), { status: 200 })
  }

  const originalConsoleWarn = console.warn
  console.warn = () => undefined
  try {
    const result = await runHybridChat(
      { message: "이미지도 보여줘", chatHistory: [] },
      {
        fetcher,
        env: {
          FAL_KEY: "fal-test-key",
          FAL_IMAGE_TIMEOUT_MS: "5",
        },
        textGenerator: async () => ({
          content: "고개를 들었다. [TRIGGER_IMG: an adult looking up under soft daylight]",
          modelId: "free",
          provider: "gemini",
        }),
      },
    )

    assert.equal(result.image, "https://cdn.example.com/timeout-fallback.jpg")
    assert.equal(requests.length, 2)
    assert.match(requests[1] || "", /\/fast-sdxl$/u)
  } finally {
    console.warn = originalConsoleWarn
  }
})

test("Fal failure preserves the sanitized selected-model text with a null image", async () => {
  const fetcher: typeof fetch = async () => {
    return new Response(JSON.stringify({
      error: { message: "image provider unavailable" },
    }), { status: 503 })
  }

  const originalConsoleError = console.error
  const originalConsoleWarn = console.warn
  console.error = () => undefined
  console.warn = () => undefined
  try {
    const result = await runHybridChat(
      { message: "계속해", chatHistory: [] },
      {
        fetcher,
        env: {
          FAL_KEY: "fal-test-key",
        },
        textGenerator: async () => ({
          content: "텍스트는 정상적으로 남는다. [TRIGGER_IMG: a quiet moonlit room]",
          modelId: "free",
          provider: "gemini",
        }),
      },
    )

    assert.deepEqual(result, {
      text: "텍스트는 정상적으로 남는다.",
      image: null,
    })
  } finally {
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
  }
})
