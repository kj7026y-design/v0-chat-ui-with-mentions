import type { ImageCommandContext } from "./types"
import {
  cleanCommandText,
  createCommandRandom,
  getRecentCommandScene,
} from "./shared"

const COMMAND_KEYWORD_STOP_WORDS = new Set([
  "그리고", "하지만", "그래서", "그렇게", "이렇게", "저렇게", "지금", "정말", "그냥", "다시",
  "대답", "상대", "사용자", "캐릭터", "자신", "그는", "그녀는", "나는", "있는", "없는", "했다",
])

function getCommandKeywords(characterName: string, context?: ImageCommandContext) {
  const scene = getRecentCommandScene(context)
  const source = [
    scene.latestUser,
    scene.latestCharacter,
    context?.status?.currentLocation,
    context?.status?.currentGoal,
    context?.status?.currentMission,
    context?.status?.nextEventCondition,
    context?.work?.title,
    context?.work?.genre,
    context?.world?.genre,
    context?.character?.role,
  ].filter(Boolean).join(" ")
  const keywords = source
    .match(/[가-힣A-Za-z0-9]{2,}/gu)
    ?.map((word) => word.replace(/(?:에게서|에게|에서|으로|하고|하는|했다|한다|였다|이다|은|는|이|가|을|를|의|에|로|와|과|도|만)$/u, ""))
    .filter((word) => word.length >= 2 && word !== characterName && !COMMAND_KEYWORD_STOP_WORDS.has(word)) ?? []

  return [...new Set(keywords)].slice(0, 6)
}

export function buildAudienceReactionContent(context?: ImageCommandContext): string {
  const status = context?.status
  const characterName = context?.character?.name || status?.characterName || "캐릭터"
  const random = createCommandRandom("audience", context)
  const keywords = getCommandKeywords(characterName, context)
  const keyword = keywords[0] || status?.characterEmotion || "지금 분위기"
  const viewers = ["scene_17", "과몰입중", "새벽정주행", "복선수집가", "다음화주세요"]
    .sort(() => random() - 0.5)
  return [
    `👀 LIVE CHAT · ${(1_200 + Math.floor(random() * 8_800)).toLocaleString("ko-KR")}명 시청 중`,
    "━━━━━━━━━━━━━━━━━━━━",
    `💬 ${viewers[0]}  ${keyword} 여기서 나오는 거 미쳤다`,
    `💬 ${viewers[1]}  ${characterName} 표정 지금 진심 같은데?`,
    "💬 " + viewers[2] + "  방금 대사 다시 보고 옴. 복선 맞는 듯",
    `💬 ${viewers[3]}  ${cleanCommandText(status?.nextEventCondition || "다음 장면", 28)} 빨리 보고 싶다`,
  ].join("\n")
}
