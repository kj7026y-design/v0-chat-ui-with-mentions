import process from "node:process"

const baseUrl = (process.argv[2] || process.env.RP_SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/u, "")

const trigger = "[System: 사용자가 새 행동이나 대사를 입력하지 않고 침묵하고 있습니다. 직전 장면의 확정 상태를 유지한 채 캐릭터의 행동이나 다음 대사로 스토리를 자연스럽게 한 단계 이어가세요. 사용자의 새 행동, 대사, 감정, 동의나 반응을 대신 만들지 마세요.]"
const priorAssistant = [
  '"궁금한 게 있으면 빙빙 돌리지 말고 물어봐."',
  "강태현은 소파 맞은편에 앉은 채 테이블 위의 잔을 옆으로 밀어 두었다. 장난스럽던 표정은 조금 가라앉았지만 시선은 피하지 않았다.",
  '"이번에는 제대로 대답할 테니까."',
].join("\n\n")
const latestUser = "준비는 됐어. 아까 말한 것, 이제 솔직하게 알려줄 수 있어?"

const commonBody = {
  mode: "nsfw",
  modelId: "gemini-3-flash-rp",
  stream: true,
  answerLength: {
    minChars: 700,
    maxChars: 1100,
    dialogueAssistChars: 0,
    totalMaxChars: 1100,
  },
  characterName: "강태현",
  userName: "김여자",
  background: "서울의 같은 아파트에 사는 27세 강태현과 26세 김여자의 합의된 성인 로맨스. 현재 장소는 밤의 거실이다.",
  characterSetting: "강태현은 자신감 있고 직설적이지만 김여자의 새 행동이나 감정을 대신 만들지 않는다. 질문에는 먼저 구체적으로 답한다.",
  userSetting: "김여자는 강태현과 가까운 친구이며 자신의 선택과 반응은 사용자만 결정한다.",
  currentScene: "강태현과 김여자는 거실 소파 맞은편에 앉아 있다. 강태현은 질문을 피하지 않고 답하겠다고 말했다. 아직 새 신체 접촉은 시작되지 않았다.",
  latestUserIntent: "강태현이 앞서 언급한 내용을 솔직히 설명하기를 원한다.",
}

function parseEventBlock(block) {
  const data = block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s*/u, ""))
    .join("\n")
    .trim()
  if (!data) return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

async function runFlow(name, overrides) {
  const startedAt = Date.now()
  const requestId = `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...commonBody,
      roomId: `qa-${name}`,
      userMessageId: `qa-user-${requestId}`,
      characterMessageId: `qa-assistant-${requestId}`,
      ...overrides,
    }),
  })
  const bodyText = await response.text()
  const events = bodyText
    .split(/\n\n/u)
    .map(parseEventBlock)
    .filter(Boolean)
  const final = [...events].reverse().find((event) => event.is_final_event)
  const content = final?.saved_content || ""
  const contentChars = Array.from(content).length
  const dialogueCount = Array.from(content.matchAll(/^[\t ]*["“][^"”\n]+["”][\t ]*$/gmu)).length
  const passed = Boolean(
    response.ok &&
    final &&
    final.status === "completed" &&
    contentChars >= 700 &&
    contentChars <= 1100 &&
    dialogueCount >= 2 &&
    dialogueCount <= 4 &&
    (final.validation_failures?.length ?? 0) === 0,
  )

  return {
    name,
    passed,
    httpStatus: response.status,
    elapsedMs: Date.now() - startedAt,
    runId: final?.run_id,
    status: final?.status || "missing-final-event",
    contentChars,
    dialogueCount,
    validationStatus: final?.validation_status,
    validationFailures: final?.validation_failures || [],
    validationAttempts: final?.validation_attempts || [],
    repairAttempted: final?.repair_attempted,
    fallbackProvider: final?.fallback_provider,
    outputModel: final?.output_model,
    generationErrorStatus: final?.generation_error_status,
    generationErrorMessage: final?.generation_error_message || final?.error,
    content,
  }
}

const baseMessages = [
  { role: "assistant", content: priorAssistant },
  { role: "user", content: latestUser },
]

const results = []
const normal = await runFlow("normal", {
  messages: baseMessages,
  previousAssistantContent: priorAssistant,
  autoAdvance: false,
  retryAttempt: false,
})
results.push(normal)

const regenerationAvoidContent = normal.content || priorAssistant
results.push(await runFlow("regeneration", {
  messages: baseMessages,
  previousAssistantContent: priorAssistant,
  regenerationAvoidContent,
  autoAdvance: false,
  retryAttempt: false,
}))

results.push(await runFlow("free-regeneration", {
  messages: baseMessages,
  previousAssistantContent: priorAssistant,
  regenerationAvoidContent,
  autoAdvance: false,
  retryAttempt: true,
}))

const autoHistory = [
  ...baseMessages,
  { role: "assistant", content: normal.content || priorAssistant },
  { role: "user", content: trigger },
]
const autoAdvance = await runFlow("auto-advance", {
  messages: autoHistory,
  previousAssistantContent: normal.content || priorAssistant,
  autoAdvance: true,
  retryAttempt: false,
})
results.push(autoAdvance)

results.push(await runFlow("auto-regeneration", {
  messages: autoHistory,
  previousAssistantContent: normal.content || priorAssistant,
  regenerationAvoidContent: autoAdvance.content || regenerationAvoidContent,
  autoAdvance: true,
  retryAttempt: false,
}))

const summary = results.map(({ content: _content, ...result }) => result)
console.log(JSON.stringify({
  baseUrl,
  passed: results.every((result) => result.passed),
  summary,
}, null, 2))

if (results.some((result) => !result.passed)) process.exitCode = 1
