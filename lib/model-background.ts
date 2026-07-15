export type StoryBackground = {
  displayText: string
  location?: string
  genre?: string
  time?: string
  relationshipPremise?: string
  currentConflict?: string
  tone?: string
  consentRule?: string
  progressionRule?: string
}

const LOCATION_MARKER_PATTERN = /라운지|카페|회사|학교|서점|방|집|거리|골목|테라스|호텔|바|클럽|사무실|아파트|건물|빌딩|오피스텔|복도|농장|과수원|서울|부산|인천|대구|대전|광주|울산|제주|\d+\s*층/u
const TIME_OF_DAY_PATTERN = /(?:늦은\s*밤|깊은\s*밤|한밤중|이른\s*새벽|새벽|이른\s*아침|아침|오전|정오|오후|해질녘|저녁|밤|낮)(?![가-힣])/u
const DATE_OR_ERA_PATTERN = /(?:\d{4}년(?:\s*\d{1,2}월(?:\s*\d{1,2}일)?)?|봄|여름|가을|겨울|시대)(?![가-힣])/u
const FLOOR_PATTERN = /(?:지하\s*)?\d+\s*층/u
const BUILDING_PATTERN = /아파트|건물|빌딩|오피스텔|호텔|회사|학교|병원|상가/u

function extractStoryTime(parts: string[]) {
  const timePart = parts.find((part) => TIME_OF_DAY_PATTERN.test(part) || DATE_OR_ERA_PATTERN.test(part))
  if (!timePart) return undefined
  if (!LOCATION_MARKER_PATTERN.test(timePart)) return timePart

  const dateOrEra = timePart.match(DATE_OR_ERA_PATTERN)?.[0]
  const timeOfDay = timePart.match(TIME_OF_DAY_PATTERN)?.[0]
  return [dateOrEra, timeOfDay].filter(Boolean).join(" ") || undefined
}

function extractStoryLocation(parts: string[], source: string) {
  const locationPart = parts.find((part) => LOCATION_MARKER_PATTERN.test(part))
  if (!locationPart) return undefined

  const location = locationPart
    .replace(new RegExp(TIME_OF_DAY_PATTERN.source, "gu"), " ")
    .replace(new RegExp(DATE_OR_ERA_PATTERN.source, "gu"), " ")
    .replace(/^현대\s+/u, "")
    .replace(/\s+/gu, " ")
    .replace(/\s*의\s*$/u, "")
    .trim()
  if (!location) return undefined

  const floor = location.match(FLOOR_PATTERN)?.[0].replace(/\s+/gu, "")
  if (!floor || BUILDING_PATTERN.test(location)) return location

  const baseLocation = location
    .replace(FLOOR_PATTERN, " ")
    .replace(/\s+/gu, " ")
    .replace(/\s*의\s*$/u, "")
    .trim()
  const unknownBuilding = /아파트/u.test(source) ? "어느 아파트" : "어느 건물"
  return baseLocation ? `${baseLocation}의 ${unknownBuilding} ${floor}` : `${unknownBuilding} ${floor}`
}

export function parseStoryBackground(background = "", characterName = "캐릭터", userName = "사용자"): StoryBackground {
  const displayText = background.trim()
  const parts = displayText
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
  const source = parts.join(" / ")
  const location = extractStoryLocation(parts, source)
  const genre = parts.find((part) => /로맨스|판타지|현대|성인|스릴러|드라마|일상|느와르|미스터리/u.test(part))
  const time = extractStoryTime(parts)
  const relationshipPremise =
    parts.find((part) => /관계|파트너|친구|연인|동료|계약|얽힌|인연|상대/u.test(part)) ||
    `${characterName}과 ${userName}의 관계는 작품 설정을 따른다.`
  const hasContract = /계약/u.test(source)
  const currentConflict = hasContract
    ? `${userName}는 계약을 끝내기 위해 움직였을 수 있지만, 지금 장면에서 계약 종료, 유예, 갱신 모두 가능하다.`
    : parts.find((part) => /갈등|목표|비밀|흔들|위기|찾아/u.test(part)) || "현재 갈등은 이번 턴 입력과 현재 장면 상태를 기준으로 해석한다."
  const toneParts = parts.filter((part) => /로맨스|선정|노골|플러팅|긴장|밀당|따뜻|위험|느린|성인|분위기/u.test(part))
  const tone = toneParts.length > 0
    ? toneParts.join(" / ")
    : "작품 톤은 설정을 따르되, 이번 턴 입력의 허용 범위를 우선한다."

  return {
    displayText,
    location,
    genre,
    time,
    relationshipPremise,
    currentConflict,
    tone,
    consentRule: "상호 동의 기반. 사용자가 명시하지 않은 신체 접촉이나 관계 진전을 자동으로 만들지 않는다.",
    progressionRule: "신체 접촉과 관계 진전은 이번 턴 입력, 현재 장면 상태, contactLevel이 허용할 때만 한 단계 진행한다.",
  }
}

export function sanitizeBackgroundReferenceForModel(value: string) {
  return value
    .replace(/오늘\s*밤\s*두\s*사람은\s*계약을\s*끝내려\s*하지만/gu, "계약의 방향은 지금 주고받는 말과 행동에 따라 달라질 수 있으며")
    .replace(/말과\s*시선과\s*침묵이\s*계속\s*다른\s*결론으로\s*미끄러진다\.?/gu, "대화와 반응에 따라 관계의 방향이 달라진다.")
    .replace(/아주\s*짙고\s*선정적인\s*/gu, "성인 로맨스 톤의 ")
    .replace(/노골적인\s*플러팅/gu, "직접적인 플러팅")
}

export function buildModelBackground({
  background,
  characterName,
  userName,
  latestUserIntent,
  currentScene,
}: {
  background?: string
  characterName: string
  userName: string
  latestUserIntent?: string
  currentScene?: string
}) {
  const story = parseStoryBackground(background, characterName, userName)
  const relationshipPremise = story.relationshipPremise
    ? sanitizeBackgroundReferenceForModel(story.relationshipPremise)
    : `${characterName}과 ${userName}의 관계는 작품 설정을 따른다.`
  const tone = story.tone
    ? sanitizeBackgroundReferenceForModel(story.tone)
    : "작품 톤은 설정을 따르되, 이번 턴 입력의 허용 범위를 우선한다."

  return `[세계관]
- 장소: ${story.location || "현재 장면 상태를 따른다."}
- 시간: ${story.time || "현재 장면 상태를 따른다."}
- 장르: ${story.genre || "작품 설정을 따른다."}
- 관계: ${relationshipPremise}
- 현재 갈등: ${story.currentConflict}
- 톤: ${tone}
- 동의/진행: ${story.consentRule}
- 진행 규칙: ${story.progressionRule}
- 해석 규칙: 이번 턴 입력과 의도가 세계관 설명보다 우선한다.
- 계약 규칙: 계약 종료, 계약 갱신, 계약 유예는 지금 주고받는 말과 행동에 따라 달라질 수 있다.
${latestUserIntent ? `- 이번 턴 의도: ${latestUserIntent}` : "- 이번 턴 의도: 정규화 결과를 따른다."}
${currentScene ? `- 현재 장면 요약: ${currentScene}` : ""}

[세계관 사용 규칙]
- 세계관은 분위기와 관계의 참고 정보다.
- 세계관 문장을 현재 턴의 확정 행동으로 오해하지 않는다.
- 이번 턴 입력과 의도가 세계관보다 우선한다.
- 계약 종료, 계약 갱신, 계약 유예는 지금 주고받는 말과 행동에 따라 달라질 수 있다.
- 배경 설명을 답변에 그대로 반복하지 않는다.

[톤 해석 규칙]
- 성인 로맨스와 노골적인 플러팅은 허용한다.
- 성인 로맨스와 노골적인 플러팅은 허용하되, 기본 표현은 짧고 직접적인 대사, 조건 제시, 거리감, 심리전으로 처리한다.
- 사용자가 명시적으로 접촉/근접/스킨십을 입력하지 않은 경우, 캐릭터가 갑자기 신체 접촉을 만들지 않는다.
- 신체 접촉은 이번 턴 입력, 직전 장면 상태, contactLevel이 허용할 때만 사용한다.
- 작품 분위기를 살리되, 매 턴 물리적 접촉이나 과한 밀착으로 자동 진행하지 않는다.

[반복 방지]
- 시선, 침묵, 눈빛, 낮은 목소리, 거리감만으로 분량을 채우지 않는다.
- 같은 의미를 다른 문장으로 반복하지 않는다.
- 한 번 드러낸 감정이나 사실은 다시 설명하지 않고, 다음 행동이나 대사로 넘어간다.
- 장면은 한 턴에 한 단계만 진행한다.`
}
