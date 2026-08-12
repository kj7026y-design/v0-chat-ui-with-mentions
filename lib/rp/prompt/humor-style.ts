const HUMOR_GENRES = new Set(["유머"])

const ACADEMIC_RIFF_PATTERNS = [
  /유의미한\s*상관관계/u,
  /학계(?:에서|의)?[^.?!\n]{0,30}(?:정설|인정|검증)/u,
  /교차\s*검증/u,
  /(?:연구|논문)[^.?!\n]{0,30}(?:제목|상관관계)/u,
  /(?:제\s*\d+\s*법칙|[가-힣A-Za-z0-9_]+의\s*제\d+법칙)/u,
]

const EXPLANATORY_RIFF_PATTERNS = [
  /(?:유사한|비슷한)\s*상황이라고\s*볼\s*수\s*있/u,
  /(?:일종의|마치)[^.?!\n]{0,100}(?:개념|이론|패턴)(?:입니다|이라고|으로)/u,
  /(?:마치|흡사)[^.?!\n]{0,100}(?:유사한|비슷한|같은)\s*상황/u,
]

const ABSTRACT_EXPOSITION_PATTERNS = [
  /(?:유니코드|코드\s*포인트|테이블)의?\s*(?:값|표현|구조|체계)?/u,
  /(?:주인[- ]?대리인|정보의?\s*비대칭|기회비용|효율적인?\s*커뮤니케이션)/u,
  /(?:엔트로피|무질서도|물리\s*법칙|자연\s*법칙)/u,
  /(?:학계|정설|교차\s*검증|가설|논문|연구\s*결과|상관관계)/u,
  /(?:개념|이론|원리|법칙)(?:입니다|이다|이라고|의\s*일부)/u,
]

const EXPLANATORY_CHAIN_PATTERNS = [
  /(?:^|[.!?]\s*|\n)따라서/u,
  /(?:^|[.!?]\s*|\n)(?:이는|이것은)/u,
  /(?:^|[.!?]\s*|\n)(?:그러므로|즉)/u,
  /(?:때문입니다|때문이다|때문이며)/u,
  /(?:근본적인?\s*원인|원인을\s*파악)/u,
  /(?:신호|증거)(?:이며|이고|입니다)/u,
]

const TERM_DEFINITION_RIFF_PATTERN = /(?:이라는|라는)\s*(?:단어|용어)[\s\S]{0,180}(?:개념|뜻|의미)(?:입니다|이다)/u
const DEFINITION_REQUEST_PATTERN = /(?:무슨\s*뜻|무엇을?\s*뜻|뭐야|설명해|설명해\s*줘|의미가|개념이|알려\s*줘)/u
const UNREQUESTED_EMOJI_DEFINITION_PATTERN = /(?:이모티콘|이모지)[^.?!\n]{0,100}(?:유니코드|U\+[0-9A-F]{4,6}|코드\s*포인트|Loudly\s+Crying\s+Face)/iu
const PERSONAL_EXPERIENCE_PATTERN = /(?:사과|미안|감정|슬픔|눈물|울음|마음|위로|관계|성장|기분|호감|사랑|신뢰|긴장|부끄러움|이모티콘|이모지)/u
const SOFTWARE_JARGON_PATTERN = /(?:API|콜백|함수|프레임워크|예외\s*처리|예외|시스템|솔루션|프로토콜|알고리즘|데이터|변수|객체|인터페이스|런타임|스택|캐시|유니코드|코드\s*포인트)/iu
const ABSTRACT_MONOLOGUE_PATTERNS = [
  /(?:잠시\s*)?(?:고찰|숙고|사유)(?:해|했|하였|한|해\s*보)/u,
  /(?:효율적|효율적으로)[^.?!\n]{0,80}(?:압축|결과물|표현)/u,
  /(?:더\s*높은\s*)?우선순위[^.?!\n]{0,60}(?:갖|높|판단)/u,
  /(?:경험적|개념적|본질적|철학적)[^.?!\n]{0,60}(?:성장|과정|관점|의미|같|동일)/u,
  /(?:의미|관점|과정|결과물)[^.?!\n]{0,60}(?:판단|생각|볼\s*수|말할\s*수)/u,
]
const CONCEPT_NAMING_RIFF_PATTERN = /(?:이것|이를|그것)(?:을|를|은|는)?\s*(?:우리(?:는|가)?\s*)?[^.?!\n]{0,60}(?:라고|이라)\s*부릅/u
const ESSENCE_RIFF_PATTERN = /(?:본질(?:적으)?로?|본질이)[^.?!\n]{0,60}(?:같|동일)/u
const MORAL_LESSON_RIFF_PATTERN = /(?:성장|학습|경험)[^.?!\n]{0,80}(?:반드시\s*)?(?:치러야\s*하는|필요한)?\s*(?:비용|대가|교훈)/u
const ANALYTICAL_CONCLUSION_PATTERNS = [
  /(?:라고|이라고)\s*할\s*수\s*있겠습니다/u,
  /(?:라고|이라고)\s*판단했습니다/u,
  /(?:라는|이라는)\s*점에서/u,
]

function countPersonalSoftwareMetaphors(text: string) {
  return text
    .split(/(?<=[.!?])|[\r\n]+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter((sentence) => PERSONAL_EXPERIENCE_PATTERN.test(sentence) && SOFTWARE_JARGON_PATTERN.test(sentence))
    .length
}

export function isHumorCategoryContext({
  workGenre,
  worldGenre,
  characterGenre,
  characterTags = [],
}: {
  workGenre?: string
  worldGenre?: string
  characterGenre?: string
  characterTags?: string[]
}) {
  if (workGenre?.trim()) return HUMOR_GENRES.has(workGenre.trim())
  if (worldGenre?.trim()) return HUMOR_GENRES.has(worldGenre.trim())
  return HUMOR_GENRES.has(characterGenre?.trim() || "") ||
    characterTags.some((tag) => ["유머", "드립", "개그", "코미디"].includes(tag.trim()))
}

export function hasOverexplainedHumor(
  text: string,
  comedicPacing: boolean,
  latestUserInput = "",
) {
  if (!comedicPacing) return false
  if (ACADEMIC_RIFF_PATTERNS.some((pattern) => pattern.test(text))) return true
  if (EXPLANATORY_RIFF_PATTERNS.some((pattern) => pattern.test(text))) return true
  if (!DEFINITION_REQUEST_PATTERN.test(latestUserInput) && TERM_DEFINITION_RIFF_PATTERN.test(text)) return true
  if (!DEFINITION_REQUEST_PATTERN.test(latestUserInput) && UNREQUESTED_EMOJI_DEFINITION_PATTERN.test(text)) return true
  if (countPersonalSoftwareMetaphors(text) >= 2) return true
  if (!DEFINITION_REQUEST_PATTERN.test(latestUserInput) && CONCEPT_NAMING_RIFF_PATTERN.test(text)) return true
  if (ESSENCE_RIFF_PATTERN.test(text) || MORAL_LESSON_RIFF_PATTERN.test(text)) return true

  const abstractExpositionCount = ABSTRACT_EXPOSITION_PATTERNS.filter((pattern) => pattern.test(text)).length
  const explanatoryChainCount = EXPLANATORY_CHAIN_PATTERNS.filter((pattern) => pattern.test(text)).length
  const abstractMonologueCount = ABSTRACT_MONOLOGUE_PATTERNS.filter((pattern) => pattern.test(text)).length
  const analyticalConclusionCount = ANALYTICAL_CONCLUSION_PATTERNS.filter((pattern) => pattern.test(text)).length
  return (abstractExpositionCount >= 2 && explanatoryChainCount >= 2) ||
    abstractMonologueCount >= 3 ||
    (abstractMonologueCount >= 2 && analyticalConclusionCount >= 1)
}

export function buildHumorWritingRules() {
  return `[유머 실행 계약]
- 우선순위는 직접 반응, 구체적인 장면 진행, 캐릭터 말투, 유머 순서다. 웃길 소재가 없으면 유머는 0회여도 된다.
- 코믹한 해석은 원칙적으로 한 문장, 꼭 필요할 때만 두 문장으로 끝낸다. 다음 문장이나 문단은 반드시 행동, 문제 해결 또는 상대 말에 대한 직접 답으로 이동한다.
- 발상만 이상하게 만들고 말투는 평범하게 유지한다. 농담의 이유, 타당성, 의미, 본질, 교훈 또는 성립 과정을 설명하지 않는다.
- 하나의 구체적 사건에서 새로운 추상 개념을 연쇄적으로 파생시키지 않는다. 비유를 썼다면 분석하지 않고, 이상한 인과를 말했다면 근거를 추가하지 않는다.
- 캐릭터가 지적·논리적·분석적이라는 설정은 상황 파악과 행동 선택이 빠르고 정확하다는 뜻이다. 사고 과정을 독백하거나 결론에 이르는 논리를 강의하라는 뜻이 아니다.
- 직업은 실제 행동과 사실에만 반영한다. 감정·사과·관계·성장·일상 사물을 전문 용어로 번역해 농담하지 않는다.
- 사용자가 뜻을 직접 묻지 않았다면 이모지, 단어 또는 전문 용어를 정의하지 않는다.

[GOOD - 구조만 참고]
화면의 ㅠㅠ를 잠깐 바라봤다.

"두 번 우셨네요."

다시 로그를 열었다.

"일단 서버부터 살리겠습니다."

[GOOD - 구조만 참고]
"사과는 잠시 보류하겠습니다."

빌드를 다시 실행했다.

"성공하면 짧게 받고, 실패하면 길게 받겠습니다."

[BAD 구조]
구체적 사건 → 추상화 → 개념 정의 → 의미·본질 설명 → 교훈 → 다른 비유 → 결론.

[판정]
- GOOD은 엉뚱한 한마디 뒤 즉시 실제 행동이나 본래 대화로 돌아간다.
- BAD는 농담을 설명문이나 철학적 독백으로 바꾸고 같은 전제를 다음 문단까지 이어간다.`
}

export function buildHumorRepairRules() {
  return `[유머 교정 규칙]
- 설명으로 확장된 농담은 문장을 다듬어 보존하지 말고 그 비트 전체를 폐기한다.
- 최신 입력에 대한 짧은 직접 반응을 먼저 쓰고, 필요하면 한 문장의 새 코믹 비트만 만든 뒤 즉시 구체적인 행동이나 본래 화제로 이동한다.
- 개념 정의, 의미·본질 분석, 교훈, 성장 서사, 사고 과정, 직업 용어 비유를 넣지 않는다.
- 부족한 분량은 농담이 아니라 현재 공간에서 실제로 수행하는 행동의 순서와 결과, 확인한 사실, 다음 결정으로 채운다.
- 캐릭터의 어미와 태도는 유지하되 지적·논리적·분석적이라는 설정을 장문의 설명으로 구현하지 않는다.`
}
