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
    const body = init?.body
      ? JSON.parse(String(init.body)) as Record<string, unknown>
      : {}
    requests.push({ url, body })

    if (init?.method === "POST") {
      return new Response(JSON.stringify({
        request_id: "main-request",
        status_url: "https://queue.fal.run/fal-ai/flux-lora/requests/main-request/status",
        response_url: "https://queue.fal.run/fal-ai/flux-lora/requests/main-request/response",
        cancel_url: "https://queue.fal.run/fal-ai/flux-lora/requests/main-request/cancel",
      }), { status: 200 })
    }
    if (url.endsWith("/status?logs=1")) {
      return new Response(JSON.stringify({ status: "COMPLETED" }), { status: 200 })
    }
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
  assert.equal(requests.length, 3)
  assert.match(requests[0]?.url || "", /^https:\/\/queue\.fal\.run\//u)
  assert.match(
    String(requests[0]?.body.prompt),
    /^\[ART DIRECTION\]/u,
  )
  assert.match(
    String(requests[0]?.body.prompt),
    /ornate, high-gloss Korean romantic-fantasy illustration/u,
  )
  assert.match(
    String(requests[0]?.body.prompt),
    /\[CURRENT SCENE\]\s+two fictional adults sharing an umbrella on a rainy street/u,
  )
  assert.doesNotMatch(
    String(requests[0]?.body.prompt),
    /Korean romance web novel cover style|beautiful and delicate 2\.5D CG|ultra high res/u,
  )
  assert.equal(requests[0]?.body.image_size, "portrait_4_3")
  assert.equal(requests[0]?.body.num_images, 1)
  assert.equal(requests[0]?.body.num_inference_steps, 28)
  assert.equal(requests[0]?.body.guidance_scale, 4.5)
  assert.equal(requests[0]?.body.acceleration, undefined)
  assert.equal(requests[0]?.body.noise_source, undefined)
  assert.equal(requests[0]?.body.enable_safety_checker, false)
  assert.equal(requests[0]?.body.output_format, "jpeg")
})

test("Fal main-model failure retries fast-sdxl with fallback-specific tuning", async () => {
  const requests: Array<{ url: string; body: Record<string, unknown> }> = []
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input)
    const body = init?.body
      ? JSON.parse(String(init.body)) as Record<string, unknown>
      : {}
    requests.push({ url, body })

    if (init?.method === "POST" && url.endsWith("/flux-lora")) {
      return new Response(JSON.stringify({
        error: { message: "main model unavailable" },
      }), { status: 503 })
    }
    if (init?.method === "POST" && url.endsWith("/fast-sdxl")) {
      return new Response(JSON.stringify({
        request_id: "fallback-request",
        status_url: "https://queue.fal.run/fal-ai/fast-sdxl/requests/fallback-request/status",
        response_url: "https://queue.fal.run/fal-ai/fast-sdxl/requests/fallback-request/response",
        cancel_url: "https://queue.fal.run/fal-ai/fast-sdxl/requests/fallback-request/cancel",
      }), { status: 200 })
    }
    if (url.endsWith("/status?logs=1")) {
      return new Response(JSON.stringify({ status: "COMPLETED" }), { status: 200 })
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
    assert.equal(requests.length, 4)
    assert.match(requests[0]?.url || "", /\/flux-lora$/u)
    assert.equal(requests[0]?.body.num_inference_steps, 28)
    assert.equal(requests[0]?.body.guidance_scale, 4.5)
    assert.equal(requests[0]?.body.acceleration, undefined)
    assert.equal(requests[0]?.body.enable_safety_checker, false)
    assert.match(requests[1]?.url || "", /\/fast-sdxl$/u)
    assert.equal(requests[1]?.body.num_inference_steps, 4)
    assert.equal(requests[1]?.body.guidance_scale, 1.75)
    assert.equal(requests[1]?.body.enable_safety_checker, false)
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

    if (init?.method === "POST" && url.endsWith("/flux-lora")) {
      return new Response(JSON.stringify({
        request_id: "slow-main-request",
        status_url: "https://queue.fal.run/fal-ai/flux-lora/requests/slow-main-request/status",
        response_url: "https://queue.fal.run/fal-ai/flux-lora/requests/slow-main-request/response",
        cancel_url: "https://queue.fal.run/fal-ai/flux-lora/requests/slow-main-request/cancel",
      }), { status: 200 })
    }
    if (url.endsWith("/slow-main-request/status?logs=1")) {
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"))
        }, { once: true })
      })
    }
    if (url.endsWith("/slow-main-request/cancel")) {
      return new Response(JSON.stringify({ status: "CANCELLATION_REQUESTED" }), {
        status: 202,
      })
    }
    if (init?.method === "POST" && url.endsWith("/fast-sdxl")) {
      return new Response(JSON.stringify({
        request_id: "timeout-fallback-request",
        status_url: "https://queue.fal.run/fal-ai/fast-sdxl/requests/timeout-fallback-request/status",
        response_url: "https://queue.fal.run/fal-ai/fast-sdxl/requests/timeout-fallback-request/response",
        cancel_url: "https://queue.fal.run/fal-ai/fast-sdxl/requests/timeout-fallback-request/cancel",
      }), { status: 200 })
    }
    if (url.endsWith("/timeout-fallback-request/status?logs=1")) {
      return new Response(JSON.stringify({ status: "COMPLETED" }), { status: 200 })
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
    assert.equal(requests.length, 6)
    assert.match(requests[2] || "", /\/slow-main-request\/cancel$/u)
    assert.match(requests[3] || "", /\/fast-sdxl$/u)
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

test("LoRA entries from env are included in flux-lora request body", async () => {
  const requests: Array<{ url: string; body: Record<string, unknown> }> = []
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input)
    const body = init?.body
      ? JSON.parse(String(init.body)) as Record<string, unknown>
      : {}
    requests.push({ url, body })

    if (init?.method === "POST") {
      return new Response(JSON.stringify({
        request_id: "lora-request",
        status_url: "https://queue.fal.run/fal-ai/flux-lora/requests/lora-request/status",
        response_url: "https://queue.fal.run/fal-ai/flux-lora/requests/lora-request/response",
        cancel_url: "https://queue.fal.run/fal-ai/flux-lora/requests/lora-request/cancel",
      }), { status: 200 })
    }
    if (url.endsWith("/status?logs=1")) {
      return new Response(JSON.stringify({ status: "COMPLETED" }), { status: 200 })
    }
    return new Response(JSON.stringify({
      images: [{ url: "https://cdn.example.com/lora-generated.jpg" }],
    }), { status: 200 })
  }

  const result = await runHybridChat(
    { message: "장면을 그려줘", chatHistory: [] },
    {
      fetcher,
      env: {
        FAL_KEY: "fal-test-key",
        FAL_LORA_PATH: "https://example.com/my-style.safetensors",
        FAL_LORA_SCALE: "0.8",
      },
      textGenerator: async () => ({
        content: "달빛 아래 서 있었다. [TRIGGER_IMG: an adult standing under moonlight]",
        modelId: "free",
        provider: "gemini",
      }),
    },
  )

  assert.equal(result.image, "https://cdn.example.com/lora-generated.jpg")
  const submitBody = requests[0]?.body
  assert.ok(Array.isArray(submitBody?.loras))
  const loras = submitBody.loras as Array<{ path: string; scale: number }>
  assert.equal(loras.length, 1)
  assert.equal(loras[0]?.path, "https://example.com/my-style.safetensors")
  assert.equal(loras[0]?.scale, 0.8)
})
