import type { ImageCommandContext } from "./types"
import {
  cleanCommandText,
  commandPick,
  createCommandRandom,
  formatPhoneStatusTime,
  getCommandBaseDate,
  getRecentCommandScene,
} from "./shared"

export function buildSummaryCommandContent(characterName: string, context?: ImageCommandContext) {
  const random = createCommandRandom("summary", context)
  const scene = getRecentCommandScene(context)
  const status = context?.status
  const location = cleanCommandText(status?.currentLocation, 24) || "현재 장면"
  const lines = scene.recentLines.length > 0
    ? scene.recentLines
    : [cleanCommandText(context?.memoryMemo, 52), cleanCommandText(status?.currentGoal, 52)].filter(Boolean)
  const selectedLines = lines.slice(-3)
  const next = cleanCommandText(status?.nextEventCondition || status?.currentMission || status?.currentGoal, 52)
    || commandPick(random, ["두 사람의 다음 선택이 장면을 바꾼다.", "방금 대화의 여파가 이어질 차례다."])

  return [
    `📝 STORY LOG · ${formatPhoneStatusTime(getCommandBaseDate(context))}`,
    `📍 ${location}  ·  ${characterName}`,
    "━━━━━━━━━━━━━━━━━━━━",
    ...selectedLines.map((line, index) => `${index === selectedLines.length - 1 ? "🔸" : "▫️"} ${line}`),
    `➡️ 다음 흐름  ${next}`,
  ].join("\n")
}
