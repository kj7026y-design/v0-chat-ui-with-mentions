import { NextResponse } from "next/server"

import { generateFalImageFromPrompt } from "@/lib/hybrid-chat"

export const runtime = "nodejs"
export const maxDuration = 45

const MAX_IMAGE_PROMPT_LENGTH = 4_000

function getErrorStatus(error: unknown) {
  if (!(error instanceof Error)) return 502
  if (/FAL_KEY/u.test(error.message)) return 503
  if (/시간이 초과/u.test(error.message)) return 504
  return 502
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { prompt?: unknown } | null
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : ""

  if (!prompt) {
    return NextResponse.json({ error: "이미지 생성 프롬프트가 필요합니다." }, { status: 400 })
  }
  if (prompt.length > MAX_IMAGE_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `이미지 생성 프롬프트는 ${MAX_IMAGE_PROMPT_LENGTH}자 이하여야 합니다.` },
      { status: 400 },
    )
  }

  try {
    const generatedImage = await generateFalImageFromPrompt(prompt)
    return NextResponse.json(generatedImage)
  } catch (error) {
    console.error("[Fal image generation failed]", error)
    return NextResponse.json(
      { error: "Fal 이미지 생성에 실패했습니다." },
      { status: getErrorStatus(error) },
    )
  }
}
