import type { RoleplayModelProfile } from "@/lib/rp/model-profiles/types"

export const COMMON_ROLEPLAY_DIALOGUE_COUNTS = {
  minDialogues: 2,
  preferredDialogues: 3,
  maxDialogues: 4,
} satisfies Pick<
  RoleplayModelProfile,
  "minDialogues" | "preferredDialogues" | "maxDialogues"
>

const SHORT_DIALOGUE_MAX_CHARS = 45
const SHORT_DIALOGUE_STREAK_MIN_COUNT = 3
const RECENT_DIALOGUE_SAMPLE_SIZE = 8
const EXTENDED_DIALOGUE_MIN_CHARS = 60
const EXTENDED_DIALOGUE_MAX_CHARS = 140

export function shouldPreferExtendedDialogue(recentDialogues: string[]) {
  const recentDialogueLengths = recentDialogues
    .slice(-RECENT_DIALOGUE_SAMPLE_SIZE)
    .map((dialogue) => Array.from(dialogue.trim()).length)
    .filter((length) => length > 0)

  return recentDialogueLengths.length >= SHORT_DIALOGUE_STREAK_MIN_COUNT &&
    recentDialogueLengths.every((length) => length <= SHORT_DIALOGUE_MAX_CHARS)
}

export function buildCommonDialogueCadenceInstructions(preferExtendedDialogue: boolean) {
  return `- 대사 블록마다 길이와 문장 수에 차이를 둔다. 모든 대사를 비슷한 길이의 한 문장으로 통일하지 않는다.
- 놀람, 즉각적인 반응, 끊어 말하는 도발은 한 문장의 짧은 대사로 쓸 수 있다.
- 답변, 설명, 고백, 설득, 협상, 경고처럼 생각을 전달해야 하는 순간에는 한 대사 블록을 2~4개의 자연스럽게 이어지는 문장으로 충분히 말하게 한다.
- 긴 대사에는 현재 장면에 대한 새 정보, 구체적인 이유, 캐릭터다운 판단 중 하나를 넣고 같은 말을 늘여 쓰지 않는다.
- 하나의 이어진 발화를 대사 개수에 맞추려고 여러 개의 짧은 따옴표 블록으로 쪼개지 않는다.
${preferExtendedDialogue
    ? `- 최근 두 턴의 대사가 계속 짧았다. 이번 턴에는 캐릭터가 설명·고백·설득·경고·도발 중 장면에 맞는 기능을 수행하는 2~4문장, 약 ${EXTENDED_DIALOGUE_MIN_CHARS}~${EXTENDED_DIALOGUE_MAX_CHARS}자의 긴 대사 블록을 하나 포함한다. 나머지 대사는 짧거나 중간 길이로 두어 리듬을 만든다.`
    : "- 장면의 속도와 대사의 기능에 따라 짧은 대사, 중간 길이 대사, 여러 문장으로 이어지는 대사를 자연스럽게 섞는다."}`
}
