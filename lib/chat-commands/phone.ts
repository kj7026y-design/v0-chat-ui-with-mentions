import type { ImageCommandContext } from "./types"
import {
  cleanCommandText,
  commandPick,
  createCommandRandom,
  escapeCommandMarkup,
  formatPhoneListTime,
  formatPhoneStatusTime,
  getCommandBaseDate,
  kp,
  offsetCommandTime,
  type CommandRandom,
} from "./shared"

function normalizeList(value?: string | string[] | null): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean)
  if (!value) return []
  return value
    .split(/[,，、\n]/u)
    .map((item) => item.trim())
    .filter(Boolean)
}

/** 이름에서 성씨(Surname)를 추출한다 */
function extractSurname(fullName: string): string {
  const clean = fullName.trim()
  if (!clean) return ""
  if (clean.length >= 2) {
    if (
      clean.startsWith("독고") ||
      clean.startsWith("남궁") ||
      clean.startsWith("황보") ||
      clean.startsWith("제갈") ||
      clean.startsWith("사공") ||
      clean.startsWith("선우") ||
      clean.startsWith("서문")
    ) {
      return clean.slice(0, 2)
    }
    return clean.slice(0, 1)
  }
  return ""
}

/** 캐릭터의 성별을 판단한다 ("male" | "female") */
function inferCharacterGender(
  characterName: string,
  context?: ImageCommandContext
): "male" | "female" {
  if (context?.character?.gender === "male") return "male"
  if (context?.character?.gender === "female") return "female"

  const profileText = [
    characterName,
    context?.character?.genderCustom,
    context?.character?.summary,
    context?.character?.personality,
    context?.character?.role,
    context?.character?.appearance,
    context?.status?.characterName,
  ].filter(Boolean).join(" ")

  if (/남성|남자|남주|그는|그의|소년|청년|남학생/u.test(profileText)) return "male"
  if (/여성|여자|여주|그녀는|그녀의|소녀|숙녀|여학생/u.test(profileText)) return "female"

  if (/[현우진준혁민철훈태석욱재성호]/u.test(characterName)) return "male"
  if (/[진아은연린나혜수희]/u.test(characterName)) return "female"

  return "male" // 기본값
}

/** 한국식 성+이름을 생성한다. 성씨를 고정하거나 성별을 지정할 수 있다. */
function generateKoreanName(
  random: CommandRandom,
  fixedSurname?: string,
  gender?: "male" | "female"
): string {
  const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "송", "류", "전", "홍"]
  const MALE_GIVEN = ["태민", "지호", "승우", "현우", "도윤", "재원", "성민", "우진", "건우", "준혁", "민재", "해준", "시우", "동현", "진혁"]
  const FEMALE_GIVEN = ["혜진", "수아", "예은", "채원", "나은", "지수", "민지", "하은", "서연", "지은", "아영", "채은", "유나", "소연", "예린"]
  const ALL_GIVEN = [...MALE_GIVEN, ...FEMALE_GIVEN]

  const surname = fixedSurname || commandPick(random, SURNAMES)
  const givenName = gender === "male"
    ? commandPick(random, MALE_GIVEN)
    : gender === "female"
      ? commandPick(random, FEMALE_GIVEN)
      : commandPick(random, ALL_GIVEN)

  return surname + givenName
}

/**
 * 작품/세계관/캐릭터 설정과 관계 단계에 맞는 이름(관계) 형태의 연락처를 생성한다.
 * type: "related" = 지인/친구 계열, "family" = 가족/오래된 친구 계열
 */
function generateNamedContact(
  type: "related" | "family",
  characterName: string,
  context: ImageCommandContext | undefined,
  random: CommandRandom,
  stage: RelationshipStage,
): string {
  const charSurname = extractSurname(characterName)
  const charGender = inferCharacterGender(characterName, context)

  const profileText = getCommandProfileText(context)
  const setting = [
    context?.character?.role,
    context?.character?.genre,
    context?.work?.genre,
    context?.world?.genre,
    context?.work?.coreSetting,
    context?.world?.coreSetting,
  ].filter(Boolean).join(" ")

  const isFantasy = /판타지|왕국|길드|마법|기사|대장간|여관/u.test(profileText)
  const isPremium = /재벌|대표|사장|오너|청담|프라이빗|고급|VIP|명품|상류/u.test(profileText)
  const isStudent = /학생|대학생|학교|캠퍼스|동아리|알바|자취|과대/u.test(profileText)
  const isWork = /회사|직장|사무|팀장|대리|과장|업무|출근|프로젝트|비서/u.test(profileText)
  const isCelebrity = /아이돌|배우|가수|연예|모델|엔터/u.test(setting)
  const isDetective = /수사|형사|경찰|탐정|범죄/u.test(setting)

  // 판타지 세계관
  if (isFantasy) {
    const relatedPool = ["엘리온(동료 기사)", "카이론(길드원)", "세라핀(마법사 동료)", "발두르(용병)", "아리온(상단 동료)"]
    const familyPool = ["발도르(선임 기사)", "오리엔(왕실 전령)", "알렉(본가 연락관)", "마르코(대장간 주인)"]
    return commandPick(random, type === "related" ? relatedPool : familyPool)
  }

  if (type === "related") {
    const name = generateKoreanName(random)
    const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤"]
    const surname = commandPick(random, SURNAMES)

    // 연예인 설정
    if (isCelebrity) {
      const useTitle = random() < 0.4
      if (useTitle) return `${surname}${commandPick(random, ["매니저", "PD"])}`
      return `${name}(${commandPick(random, ["소속사 팀장", "스타일리스트", "현장 팀장", "동기 배우"])})`
    }
    // 형사/경찰 설정
    if (isDetective) {
      const useTitle = random() < 0.5
      if (useTitle) return `${surname}${commandPick(random, ["형사", "계장", "반장"])}`
      return `${name}(${commandPick(random, ["수사팀", "감식반", "당직 형사", "동기 형사"])})`
    }
    // 직장/재벌 설정
    if (isWork || isPremium) {
      const useTitle = random() < 0.45
      if (useTitle) {
        const titles = isPremium
          ? ["회장", "대표", "이사", "부장"]
          : ["팀장", "대리", "과장", "차장", "부장", "사원"]
        return `${surname}${commandPick(random, titles)}`
      }
      const roles = isPremium
        ? ["거래처 대표", "지인", "사업 파트너", "동창", "학창 시절 친구"]
        : ["거래처", "직장동료", "팀원", "동기", "전 직장 동료", "프로젝트 파트너"]
      return `${name}(${commandPick(random, roles)})`
    }
    // 학교 설정
    if (isStudent) {
      return `${name}(${commandPick(random, ["대학동기", "과대", "동기", "동아리 부원", "선배", "같은 과 동기", "과대표", "학과 친구"])})`
    }
    // 일반 — 성별에 맞는 친근한 관계 호칭
    const maleOlderRoles = ["아는 형", "형", "선배"]
    const femalePersonaOlderRoles = ["아는 언니", "언니", "선배"]

    const olderRole = charGender === "male"
      ? commandPick(random, maleOlderRoles)
      : commandPick(random, femalePersonaOlderRoles)

    const closeRoles = charGender === "male"
      ? ["불알친구", "찐친", "중학동창", "소꿉친구", "고향 친구"]
      : ["절친", "찐친", "중학동창", "소꿉친구", "고향 친구"]
    const casualRoles = ["지인", "친구", "동창", "고교 동창", olderRole, "아는 동생", "술친구"]
    const roles = (stage === "close" || stage === "intimate") ? closeRoles : casualRoles
    return `${name}(${commandPick(random, roles)})`
  }

  // family type — 가족/오래된 친구 계열
  // 1) 단독 관계명 사용 시 성별 고려! (남성은 형/누나, 여성은 오빠/언니)
  const useDirect = random() < 0.35
  if (useDirect) {
    const directFamily = charGender === "male"
      ? ["어머니", "아버지", "형", "누나"]
      : ["어머니", "아버지", "오빠", "언니"]
    return commandPick(random, directFamily)
  }

  // 2) 실제 혈연 가족 이름 생성 시: 캐릭터 성씨(charSurname)와 동일하게!
  const isBrotherOrSister = random() < 0.5
  if (isBrotherOrSister && charSurname) {
    const isOlder = random() < 0.5
    const isMaleSibling = random() < 0.5

    if (charGender === "male") {
      // 남성 캐릭터 (예: 강태현) -> 손위 남성은 "형", 손위 여성은 "누나"
      const relation = isOlder
        ? (isMaleSibling ? "형" : "누나")
        : (isMaleSibling ? "남동생" : "여동생")
      const siblingName = generateKoreanName(random, charSurname, isMaleSibling ? "male" : "female")
      return `${siblingName}(${relation})`
    } else {
      // 여성 캐릭터 -> 손위 남성은 "오빠", 손위 여성은 "언니"
      const relation = isOlder
        ? (isMaleSibling ? "오빠" : "언니")
        : (isMaleSibling ? "남동생" : "여동생")
      const siblingName = generateKoreanName(random, charSurname, isMaleSibling ? "male" : "female")
      return `${siblingName}(${relation})`
    }
  }

  // 3) 그 외 오래된 친구/동창 계열 (다른 성씨 사용 가능)
  const name2 = generateKoreanName(random)
  const familyRoles = isStudent
    ? ["고향 친구", "초등 동창", "중학 동창", "오래된 친구"]
    : isPremium
      ? ["오랜 지인", "학창 시절 친구", "대학 동문", "소꿉친구"]
      : ["고향 친구", "초등 동창", "소꿉친구", "오래된 친구"]
  return `${name2}(${commandPick(random, familyRoles)})`
}

function inferContextContact(
  characterName: string,
  context: ImageCommandContext | undefined,
  random: CommandRandom,
  stage: RelationshipStage = "early"
) {
  const personaName = context?.persona?.name || context?.status?.personaName || "나"
  // 메시지에 등장한 실제 이름 우선 사용
  const explicitNames = (context?.recentMessages ?? [])
    .flatMap((message) => [message.speakerName, ...(message.mentionCharacterNames ?? [])])
    .map((name) => name?.trim())
    .filter((name): name is string => Boolean(name) && name !== characterName && name !== personaName)
  if (explicitNames.length > 0) return commandPick(random, explicitNames)

  // fallback: 이름+관계 형태 생성
  return generateNamedContact("related", characterName, context, random, stage)
}

function getCommandProfileText(context?: ImageCommandContext) {
  return [
    context?.work?.title,
    context?.work?.genre,
    context?.work?.tagline,
    context?.work?.coreSetting,
    context?.world?.genre,
    context?.world?.era,
    context?.world?.coreSetting,
    context?.character?.role,
    context?.character?.summary,
    context?.character?.personality,
    context?.character?.relationship,
    context?.persona?.role,
    context?.persona?.summary,
    context?.persona?.personality,
    context?.persona?.relationship,
    context?.status?.currentLocation,
    context?.status?.currentGoal,
    context?.status?.currentMission,
  ].filter(Boolean).join(" ")
}

function inferCommandInterest(context: ImageCommandContext | undefined, random: CommandRandom) {
  const profileText = getCommandProfileText(context)
  if (/축구|월드컵|공격수|미드필더|스포츠|운동|선수/u.test(profileText)) return "soccer"
  if (/커피|카페|바리스타|원두|라떼|에스프레소/u.test(profileText)) return "coffee"
  if (/음악|밴드|기타|피아노|작곡|라이브|노래/u.test(profileText)) return "music"
  if (/향수|라운지|바|위스키|칵테일|청담|프라이빗/u.test(profileText)) return "lounge"
  if (/서점|책|작가|문학|소설|도서/u.test(profileText)) return "books"
  if (/마법|왕국|기사|길드|검|판타지/u.test(profileText)) return "fantasy"
  if (/학교|대학|동아리|수업|교실/u.test(profileText)) return "campus"
  return commandPick(random, ["daily", "coffee", "music"] as const)
}

function buildPhoneSearchRecords(
  interest: ReturnType<typeof inferCommandInterest>,
  personaName: string,
  location: string,
  random: CommandRandom,
  stage: RelationshipStage,
) {
  // 관계 단계별 검색 (50% — 유저/관계 관련)
  const stageSearches: Record<RelationshipStage, string[]> = {
    early: [
      `${personaName}에게 자연스럽게 연락하는 법`,
      `${personaName} 취향 떠보는 질문`,
      "옆집 사람과 친해지는 법",
      `${location} 근처 조용한 장소`,
      "처음 만난 사람 인상 좋게 남기는 법",
    ],
    growing: [
      `${personaName}${kp(personaName, '이', '가')} 좋아하는 것 알아가는 법`,
      "좋아하는 사람한테 먼저 연락하는 법",
      `${location} 데이트하기 좋은 곳`,
      "티 안 내고 좋아하는 티 내는 방법",
      `${personaName} 취향 선물 아이디어`,
    ],
    close: [
      `${personaName} 취향 맞춤 선물 추천`,
      "고백하기 좋은 타이밍과 장소",
      "단둘이 여행 자연스럽게 제안하는 법",
      `${personaName}한테 솔직하게 말하는 법`,
      "좋아한다는 말 대신 행동으로 보여주는 방법",
    ],
    intimate: [
      `${personaName}${kp(personaName, '이랑', '랑')} 같이 가볼 국내 여행지`,
      "커플링 사이즈 재는 법",
      "기념일 선물 뭐가 좋을까",
      `${personaName} 좋아하는 향수 찾는 법`,
      "호텔 조식 포함 패키지 예약",
    ],
  }
  // 일상/관심사 검색 (50% — 캐릭터 취미/일상)
  const interestSearches: Record<string, string[]> = {
    soccer: ["2026 월드컵 일정", "음바페 결승전 하이라이트", "축구 유니폼 사이즈 고르는 법"],
    coffee: ["산미 적은 원두 추천", "라떼아트 초보 영상", "밤에 마시기 좋은 디카페인 원두"],
    music: ["새벽에 듣기 좋은 기타 플레이리스트", "라이브바 예약 방법", "어쿠스틱 기타 줄 추천"],
    lounge: ["우디 머스크 향수 추천", "싱글몰트 입문 추천", "청담 조용한 라운지"],
    books: ["비 오는 날 읽기 좋은 소설", "작은 서점 추천", "첫 문장 좋은 한국 소설"],
    fantasy: ["검 관리용 기름", "고대 룬 문자 뜻", "왕실 연회 예법"],
    campus: ["과제 마감 일정 정리 앱", "학교 근처 조용한 카페", "동아리 뒤풀이 장소"],
    daily: ["늦은 밤 문 여는 카페", "카카오택시 예약", "편의점 숙취해소제 추천"],
  }
  return [
    commandPick(random, stageSearches[stage]),
    commandPick(random, interestSearches[interest] ?? interestSearches.daily),
  ]
}

function buildPhoneYoutubeRecords(
  interest: ReturnType<typeof inferCommandInterest>,
  random: CommandRandom,
  stage: RelationshipStage,
  personaName: string,
) {
  // 일상/관심사 영상 (50% — 캐릭터 취미)
  const interestRecords: Record<string, string[]> = {
    soccer: [
      "[2026 월드컵] 음바페 결승전 활약 하이라이트 모음",
      "전술 분석: 압박을 풀어내는 원터치 패스",
      "축구선수들이 경기 전 듣는 플레이리스트",
    ],
    coffee: [
      "바리스타가 알려주는 고소한 원두 고르는 법",
      "집에서 만드는 아이스 라떼 레시피",
      "새벽 카페 노동요 재즈 플레이리스트",
    ],
    music: [
      "새벽 라이브바 감성 기타 연주 모음",
      "공연 전 긴장 풀어주는 보컬 루틴",
      "비 오는 날 듣는 어쿠스틱 플레이리스트",
    ],
    lounge: [
      "향수 전문가가 고른 우디 향수 TOP 10",
      "싱글몰트 위스키 입문자 가이드",
      "프라이빗 바 조명 인테리어 참고 영상",
    ],
    books: [
      "비 오는 날 읽기 좋은 문장 모음",
      "작은 서점 사장님의 하루 브이로그",
      "첫 장면이 강렬한 로맨스 소설 추천",
    ],
    fantasy: [
      "중세 기사 검술 기본 자세",
      "판타지 세계관 지도 그리는 법",
      "왕국 연회 음악 1시간",
    ],
    campus: [
      "대학생 가방 속 필수템",
      "시험 전날 집중 음악",
      "동아리 축제 브이로그",
    ],
    daily: [
      "퇴근 후 혼자 걷기 좋은 밤 산책 코스",
      "말 예쁘게 하는 사람들의 대화 습관",
      "좁은 방 분위기 바꾸는 조명 추천",
    ],
  }
  // 관계 단계별 영상 (50% — 유저/관계 관련)
  const stageRecords: Record<RelationshipStage, string[]> = {
    early: [
      "처음 만난 사람과 자연스럽게 친해지는 법",
      "상대방 취향 파악하는 대화 기술",
      `좋은 첫인상 남기는 방법 실전편`,
    ],
    growing: [
      `고백 전 설레는 감정 다루는 법`,
      `${personaName}${kp(personaName, '이', '가')} 좋아할 것 같아서 찾아본 선물 추천`,
      "티 안 내고 마음 전하는 작은 행동들",
    ],
    close: [
      `${personaName}에게 솔직하게 말하는 법`,
      "함께 여행 계획 세우는 팁",
      "좋아하는 사람과 자연스러운 스킨십 방법",
    ],
    intimate: [
      `커플 여행 국내 숨은 명소 추천`,
      "분위기 좋은 호텔 고르는 법",
      `${personaName}${kp(personaName, '이', '가')} 좋아하는 취향 맞춤 선물 아이디어`,
    ],
  }
  const interestCandidates = interestRecords[interest] ?? interestRecords.daily
  const stageCandidates = stageRecords[stage]
  return [
    commandPick(random, interestCandidates),
    commandPick(random, stageCandidates),
  ]
}

/** 캐릭터 고유의 이름 기반 결정론적 난수를 생성한다 (동일 캐릭터에 대해 항상 동일한 결과 반환) */
function createCharacterFixedRandom(characterName: string, salt: string): CommandRandom {
  const seedText = `character_fixed|${characterName.trim()}|${salt}`
  let state = 2166136261
  for (const char of seedText) {
    state ^= char.codePointAt(0) ?? 0
    state = Math.imul(state, 16777619)
  }
  state >>>= 0

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/** 캐릭터가 보유하고 있는 고정된 주 카드(Main Card) 및 서브 카드(Sub Card) 1~2개를 결정한다 */
function getCharacterFixedCards(
  characterName: string,
  context?: ImageCommandContext
): { mainCard: string; subCard: string } {
  const profileText = getCommandProfileText(context)
  const isPremiumLife = /재벌|대표|사장|오너|라운지|청담|프라이빗|고급|VIP|계약|상류|명품/u.test(profileText)
  const isStudentLife = /학생|대학생|학교|캠퍼스|동아리|알바|자취/u.test(profileText)
  const isFantasyLife = /판타지|왕국|길드|마법|기사|대장간|여관/u.test(profileText)

  const cards = isFantasyLife
    ? ["길드 신용패", "왕국 은화 지갑", "상단 거래패", "여관 선불 장부"]
    : isPremiumLife
      ? ["AMEX Platinum", "Hyundai Card the Black", "Samsung THE O", "Hana Club1 Card"]
      : isStudentLife
        ? ["KakaoBank 체크카드", "Toss 체크카드", "KB 나라사랑카드", "Shinhan S20 체크카드"]
        : ["Hyundai Card ZERO", "Samsung taptap O", "Shinhan Mr.Life", "KB Kookmin Card"]

  const fixedRandom = createCharacterFixedRandom(characterName, "card_binding")
  const mainCard = commandPick(fixedRandom, cards)
  const otherCards = cards.filter((c) => c !== mainCard)
  const subCard = otherCards.length > 0 ? commandPick(fixedRandom, otherCards) : mainCard

  return { mainCard, subCard }
}

function buildPhoneMerchants(
  interest: ReturnType<typeof inferCommandInterest>,
  location: string,
  context: ImageCommandContext | undefined,
  random: CommandRandom,
  stage: RelationshipStage,
  personaName: string,
  characterName: string,
) {
  type PaymentCandidate = {
    merchant: string
    min: number
    max: number
    step: number
    currency?: string
  }
  const profileText = getCommandProfileText(context)
  const isPremiumLife = /재벌|대표|사장|오너|라운지|청담|프라이빗|고급|VIP|계약|상류|명품/u.test(profileText)
  const isStudentLife = /학생|대학생|학교|캠퍼스|동아리|알바|자취/u.test(profileText)
  const isFantasyLife = /판타지|왕국|길드|마법|기사|대장간|여관/u.test(profileText)

  // 캐릭터 고정 1~2개 카드 바인딩 (매번 바뀌는 비현실성 차단)
  const { mainCard, subCard } = getCharacterFixedCards(characterName, context)

  // 일상 결제 (Record A — 캐릭터 취미/라이프스타일)
  const interestPayments: Record<string, PaymentCandidate[]> = {
    soccer: [
      { merchant: "나이키 강남", min: 79_000, max: 289_000, step: 10_000 },
      { merchant: "아이엠그라운드 풋살장", min: 60_000, max: 140_000, step: 10_000 },
    ],
    coffee: [
      { merchant: "블루보틀 성수", min: 5_500, max: 18_000, step: 500 },
      { merchant: "동네 로스터리", min: 6_000, max: 24_000, step: 500 },
    ],
    music: [
      { merchant: "낙원악기상가", min: 35_000, max: 350_000, step: 5_000 },
      { merchant: "인터파크 티켓", min: 44_000, max: 154_000, step: 5_000 },
    ],
    lounge: [
      { merchant: "호텔 라운지", min: 85_000, max: 320_000, step: 5_000 },
      { merchant: "청담 와인샵", min: 48_000, max: 280_000, step: 5_000 },
    ],
    books: [
      { merchant: "교보문고", min: 14_000, max: 48_000, step: 1_000 },
      { merchant: "독립서점", min: 12_000, max: 36_000, step: 1_000 },
    ],
    fantasy: [
      { merchant: "길드 잡화점", min: 8, max: 35, step: 1, currency: "실버" },
      { merchant: "대장간 수리비", min: 2, max: 12, step: 1, currency: "골드" },
    ],
    campus: [
      { merchant: "스터디카페", min: 6_000, max: 24_000, step: 1_000 },
      { merchant: "학교 앞 카페", min: 4_000, max: 10_000, step: 500 },
    ],
    daily: isPremiumLife
      ? [
          { merchant: "카카오T 블랙", min: 28_000, max: 85_000, step: 1_000 },
          { merchant: "호텔 다이닝", min: 160_000, max: 520_000, step: 10_000 },
        ]
      : isStudentLife
        ? [
            { merchant: "GS25", min: 3_500, max: 18_000, step: 500 },
            { merchant: "배달의민족", min: 18_000, max: 38_000, step: 1_000 },
          ]
        : [
            /카페|커피/u.test(location)
              ? { merchant: "동네 카페 아메리카노", min: 4_500, max: 9_000, step: 500 }
              : { merchant: "카카오T", min: 8_000, max: 38_000, step: 1_000 },
            { merchant: "GS25", min: 4_500, max: 22_000, step: 500 },
          ],
  }

  // 관계 단계별 결제 (Record B — 유저/관계 관련)
  const stagePayments: Record<RelationshipStage, PaymentCandidate[]> = isFantasyLife
    ? {
        early: [{ merchant: "약초 상인 (선물 후보)", min: 3, max: 15, step: 1, currency: "실버" }],
        growing: [{ merchant: "왕실 선물 세트", min: 10, max: 40, step: 1, currency: "실버" }],
        close: [{ merchant: "커플 부적 한 쌍", min: 8, max: 25, step: 1, currency: "실버" }],
        intimate: [{ merchant: "기사 문장 반지 한 쌍", min: 50, max: 150, step: 10, currency: "골드" }],
      }
    : {
        early: [
          { merchant: `${personaName}${kp(personaName, '이', '가')} 좋다고 한 과자 한 상자`, min: 18_000, max: 42_000, step: 1_000 },
          { merchant: `${personaName} 취향 음료 6캔 세트`, min: 12_000, max: 28_000, step: 1_000 },
          { merchant: "취향 저격 원두 200g", min: 15_000, max: 32_000, step: 1_000 },
          { merchant: "차량용 방향제 프레시향", min: 18_000, max: 45_000, step: 1_000 },
        ],
        growing: [
          { merchant: `${personaName} 취향 책`, min: 16_000, max: 42_000, step: 1_000 },
          { merchant: "커플 영화 예매 2매", min: 22_000, max: 38_000, step: 2_000 },
          { merchant: "꽃다발 당일 배송", min: 35_000, max: 80_000, step: 5_000 },
          { merchant: `${personaName}${kp(personaName, '이', '가')} 좋아할 것 같은 빈티지 소품`, min: 28_000, max: 95_000, step: 1_000 },
        ],
        close: [
          { merchant: "커플 텀블러 세트", min: 48_000, max: 96_000, step: 4_000 },
          { merchant: `${personaName}${kp(personaName, '이', '가')} 원하던 향수`, min: 85_000, max: 240_000, step: 5_000 },
          { merchant: "둘이서 호텔 조식 예약", min: 78_000, max: 180_000, step: 10_000 },
          { merchant: `${personaName} 취향 디저트 세트 주문`, min: 42_000, max: 98_000, step: 2_000 },
        ],
        intimate: [
          { merchant: "초박형 콘돔+젤 세트", min: 18_000, max: 35_000, step: 1_000 },
          { merchant: "커플링 백금", min: 980_000, max: 2_800_000, step: 10_000 },
          { merchant: "국내 여행 숙소 2박 예약", min: 240_000, max: 680_000, step: 10_000 },
          { merchant: "란제리 세트 선물 포장", min: 68_000, max: 168_000, step: 4_000 },
        ],
      }

  const interestCandidates = interestPayments[interest] ?? interestPayments.daily
  const stageCandidates = stagePayments[stage]

  const paymentA = commandPick(random, interestCandidates)
  const paymentB = commandPick(random, stageCandidates)

  // 1번째 결제는 주 카드, 2번째 결제는 80% 확률 주 카드 / 20% 확률 서브 카드 사용!
  const cardA = mainCard
  const cardB = random() < 0.8 ? mainCard : subCard

  const buildAmount = (payment: PaymentCandidate) => {
    const steps = Math.floor((payment.max - payment.min) / payment.step)
    return payment.min + Math.floor(random() * (steps + 1)) * payment.step
  }
  return {
    cardA,
    cardB,
    merchantA: paymentA.merchant,
    merchantB: paymentB.merchant,
    amountA: buildAmount(paymentA),
    amountB: buildAmount(paymentB),
    currencyA: paymentA.currency ?? "원",
    currencyB: paymentB.currency ?? "원",
  }
}

function buildPhoneRecentApps(
  interest: ReturnType<typeof inferCommandInterest>,
  cardName: string,
  random: CommandRandom,
) {
  const cardApp = /Hyundai/u.test(cardName)
    ? "현대카드"
    : /Samsung/u.test(cardName)
      ? "삼성카드"
      : /Hana/u.test(cardName)
        ? "하나Pay"
        : /KakaoBank/u.test(cardName)
          ? "카카오뱅크"
          : /Toss/u.test(cardName)
            ? "토스"
            : /KB/u.test(cardName)
              ? "KB Pay"
              : /Shinhan/u.test(cardName)
                ? "신한 SOL페이"
                : /AMEX/u.test(cardName)
                  ? "Amex"
                  : "카드사 앱"
  const common = ["KakaoTalk", "Chrome", "YouTube", "Naver Map", cardApp]
  const byInterest: Record<string, string[]> = {
    soccer: ["FotMob", "Nike Run Club", "Chrome", "YouTube", cardApp],
    coffee: ["Naver Map", "Blue Bottle", "Chrome", "YouTube", cardApp],
    music: ["YouTube Music", "Melon", "음성 메모", "KakaoTalk", cardApp],
    lounge: [cardApp, "Naver Map", "Chrome", "KakaoTalk", "캘린더"],
    books: ["리디", "교보eBook", "Chrome", "KakaoTalk", cardApp],
    fantasy: ["지도", "메모", "시계", "메시지", "계산기"],
    campus: ["에브리타임", "Notion", "KakaoTalk", "Chrome", cardApp],
    daily: common,
  }
  return commandPick(random, [
    byInterest[interest] ?? common,
    [...(byInterest[interest] ?? common)].reverse(),
  ]).join("  ")
}

type CommandPersonalityTrait =
  | "reserved"
  | "expressive"
  | "playful"
  | "blunt"
  | "caring"
  | "confident"
  | "analytical"
  | "sensitive"
  | "balanced"

interface CommandPersonalityProfile {
  primary: CommandPersonalityTrait
  traits: CommandPersonalityTrait[]
}

type SnsSceneKind =
  | "confession"
  | "parting"
  | "apology"
  | "conflict"
  | "comfort"
  | "closeness"
  | "danger"
  | "date"
  | "secret"
  | "general"

function inferCommandPersonality(context?: ImageCommandContext): CommandPersonalityProfile {
  const personalityText = [
    context?.character?.personality,
    context?.character?.summary,
    context?.character?.speechStyle,
    context?.character?.relationship,
    ...normalizeList(context?.character?.tags),
    ...normalizeList(context?.character?.relationshipTags),
  ].filter(Boolean).join(" ")
  const patterns: Array<[Exclude<CommandPersonalityTrait, "balanced">, RegExp]> = [
    ["reserved", /내성|소심|과묵|낯가림|수줍|말수\s*적|조용한\s*성격|감정\s*표현.*서툴/u],
    ["expressive", /외향|활발|사교|쾌활|명랑|감정\s*표현.*솔직|말이\s*많/u],
    ["playful", /장난|능글|유머|농담|짓궂|놀리|익살/u],
    ["blunt", /무뚝뚝|직설|냉정|차갑|까칠|독설|시니컬|츤데레/u],
    ["caring", /다정|배려|친절|따뜻|상냥|헌신|보호|세심하게\s*챙/u],
    ["confident", /자신감|당당|주도|적극|대담|카리스마|직진|결단/u],
    ["analytical", /이성적|논리|분석|계획|꼼꼼|신중|냉철|현실적/u],
    ["sensitive", /섬세|예민|불안|걱정|감수성|상처|조심스|눈치/u],
  ]
  const matches = patterns
    .map(([trait, pattern]) => ({ trait, index: personalityText.search(pattern) }))
    .filter((match) => match.index >= 0)
    .sort((left, right) => left.index - right.index)
  const traits = matches.map((match) => match.trait)

  return {
    primary: traits[0] ?? "balanced",
    traits: traits.length > 0 ? traits : ["balanced"],
  }
}

function detectCommandSceneKind(text: string): SnsSceneKind | undefined {
  if (/고백|사귀|좋아(?:해|한다|하는)|사랑|반지|연인|마음.*전하|진심.*말/u.test(text)) return "confession"
  if (/이별|헤어지|떠나|마지막|작별|멀어지/u.test(text)) return "parting"
  if (/미안|사과|용서|잘못|후회/u.test(text)) return "apology"
  if (/싸우|다투|화내|분노|오해|갈등|냉전/u.test(text)) return "conflict"
  if (/울|위로|괜찮|안심|기대|믿어|고마/u.test(text)) return "comfort"
  if (/키스|입맞춤|포옹|껴안|손을?\s*잡|가까이|품에/u.test(text)) return "closeness"
  if (/위험|추격|도망|부상|상처|피가|공격|전투/u.test(text)) return "danger"
  if (/데이트|약속|만나|영화|카페|식사|산책/u.test(text)) return "date"
  if (/비밀|숨기|말하지\s*못|침묵|망설|고민/u.test(text)) return "secret"
  return undefined
}

function inferCommandSceneKind(context?: ImageCommandContext): SnsSceneKind {
  const recentSceneText = (context?.recentMessages ?? [])
    .filter((message) => message.type === "user" || message.type === "ai")
    .slice(-4)
    .map((message) => message.content)
    .join(" ")
  const statusText = [
    context?.status?.currentMission,
    context?.status?.currentGoal,
    context?.status?.characterStatus,
    context?.status?.nextEventCondition,
  ].filter(Boolean).join(" ")

  return detectCommandSceneKind(recentSceneText) ?? detectCommandSceneKind(statusText) ?? "general"
}

function getCommandSceneFocus(sceneKind: SnsSceneKind) {
  const focus: Record<SnsSceneKind, string> = {
    confession: "내 마음을 전하는 일",
    parting: "이 관계를 붙잡는 일",
    apology: "내 잘못을 인정하고 사과하는 일",
    conflict: "엉킨 감정을 바로잡는 일",
    comfort: "곁을 지켜 주는 일",
    closeness: "가까워진 마음을 받아들이는 일",
    danger: "무사한지 확인하고 지키는 일",
    date: "함께한 시간을 솔직히 즐기는 일",
    secret: "숨겨 둔 사실을 털어놓는 일",
    general: "지금 내 마음을 솔직히 마주하는 일",
  }
  return focus[sceneKind]
}

type RelationshipStage = "early" | "growing" | "close" | "intimate"

function inferRelationshipStage(
  context: ImageCommandContext | undefined,
): RelationshipStage {
  const allMessages = context?.recentMessages ?? []
  const narrativeMessages = allMessages
    .filter((message) => message.type === "user" || message.type === "ai")
    .slice(-20)
  const messageCount = narrativeMessages.length
  const messageText = narrativeMessages.map((message) => message.content).join(" ")

  const relationshipText = [
    context?.character?.relationship,
    context?.persona?.relationship,
    context?.work?.coreSetting,
    context?.world?.coreSetting,
  ].filter(Boolean).join(" ")

  const combinedText = messageText + " " + relationshipText

  // 친밀 단계 — 신체 접촉, 성인 관계, 커플 관련 신호
  if (/(?:키스|포옹|안아|침대|같이\s*자|사귀|연인|커플|고백|사랑해|좋아해|섹스|스킨십|콘돔|성인|친밀|밀착|눌러|껴안|뽀뽀|가슴|허리)/u.test(combinedText)) {
    return "intimate"
  }
  if (/(?:연인|사귄|애인|커플|고백|사랑)/u.test(relationshipText)) {
    return "intimate"
  }

  // 친한 단계 — 감정 공유, 마음 드러남
  if (/(?:마음|감정|좋아|신경\s*써|걱정|편해|친해|믿어|솔직|설레|두근|오래|의지|그리워|보고\s*싶)/u.test(combinedText)) {
    return "close"
  }
  if (messageCount > 14) return "close"

  // 발전 단계 — 관심, 궁금, 함께하기
  if (/(?:궁금|관심|알고\s*싶|같이|함께|또\s*만|연락|취향|한번|같은\s*시간)/u.test(combinedText)) {
    return "growing"
  }
  if (messageCount > 6) return "growing"

  return "early"
}

function buildContactMessagePreview(
  contactName: string,
  context: ImageCommandContext | undefined,
  random: CommandRandom
): string {
  const missionText = cleanCommandText(
    context?.status?.currentMission || context?.status?.currentGoal || context?.status?.nextEventCondition,
    34
  )
  if (missionText) return missionText

  // 공식/직장/상사/거래처 여부 감지
  const isFormal = /거래처|대표|회장|이사|팀장|부장|차장|과장|대리|매니저|PD|형사|계장|반장|수사팀|감식반|선임|실장|교수/u.test(contactName)

  if (isFormal) {
    return commandPick(random, [
      "다음 일정 확인 부탁드립니다.",
      "말씀하신 건 따로 챙겨두었습니다.",
      "약속 시간 변경되었습니다.",
      "확인 후 편하실 때 연락 주시기 바랍니다.",
      "오늘 정리된 내용 공유드립니다.",
    ])
  }

  // 친구/동창/가족/형/누나/오빠/언니/동생 등 친근한 관계 -> 반말 어조
  return commandPick(random, [
    "오늘 언제 보냐?",
    "아까 한 말 진짜지?",
    "주말에 시간 됨?",
    "도착하면 바로 톡해라.",
    "약속 시간 조금 늦어질 듯!",
    "야 어디냐ㅋㅋ",
    "담에 밥이나 한번 사봐라.",
    "확인하면 바로 연락 줘!",
  ])
}

function buildFamilyMessagePreview(
  contactName: string,
  random: CommandRandom
): string {
  const isParents = /어머니|아버지|엄마|아빠/u.test(contactName)
  if (isParents) {
    return commandPick(random, [
      "밥은 챙겨 먹었니? 조심히 들어와.",
      "주말에 들를 수 있으면 오렴.",
      "전화 좀 받아라.",
      "들어올 때 우유 좀 사와.",
      "용돈 보내줘서 고맙다.",
      "밥 안 거르고 잘 다니고 있지?",
    ])
  }

  const isOlderSibling = /\(형\)|\(누나\)|\(오빠\)|\(언니\)/u.test(contactName)
  if (isOlderSibling) {
    return commandPick(random, [
      "집에 언제 오냐?",
      "너 아까 놓고 간 거 챙겼다.",
      "오늘 저녁 뭐 먹을 거냐?",
      "들어올 때 아이스크림 사와.",
      "내 옷 입고 나가지 마라 ㅡㅡ",
    ])
  }

  const isYoungerSibling = /\(동생\)|\(남동생\)|\(여동생\)/u.test(contactName)
  if (isYoungerSibling) {
    return commandPick(random, [
      "용돈 조금만 줘라 ㅠㅠ",
      "언제 오는데?",
      "집 도착하면 톡해라",
      "이거 어떻게 하는 거냐?",
      "내 방 들어오지 마라 ㅡㅡ",
      "오늘 외식함?",
    ])
  }

  // 오래된 친구 / 초등 동창 / 고향 친구
  return commandPick(random, [
    "동창회 모임 날짜 잡혔다!",
    "오랜만이다! 잘 지내고 있지?",
    "이번 주말에 내려가는데 얼굴 볼래?",
    "애들이 너 보고 싶다더라ㅋㅋ",
    "소식 듣고 연락했다! 잘 지내냐?",
    "사진 잘 나왔더라 어디냐?",
  ])
}

function buildPersonalityPhoneContent(
  personaName: string,
  stage: RelationshipStage,
  context?: ImageCommandContext,
) {
  const personality = inferCommandPersonality(context)
  const focus = getCommandSceneFocus(inferCommandSceneKind(context))
  const isClose = stage === "close" || stage === "intimate"
  const content: Record<CommandPersonalityTrait, {
    message: string
    draft: string
    search: string
    video: string
  }> = {
    reserved: {
      message: `${personaName}, 오늘 잠깐 시간 있어? 할 말이 있어.`,
      draft: `${focus}은 직접 만나서 말하고 싶다. 말할 수 있을지는 모르겠지만.`,
      search: `${focus}을 자연스럽게 꺼내는 방법`,
      video: "말이 적은 사람이 진심을 전하는 법",
    },
    expressive: {
      message: isClose
        ? `${personaName}, 오늘 네 생각 많이 났어. 보고 싶다.`
        : `${personaName}, 오늘 네 생각이 났어. 시간 되면 볼래?`,
      draft: `${focus}을 더는 숨기고 싶지 않다. 만나면 전부 말해야지.`,
      search: `${focus}을 솔직하게 표현하는 방법`,
      video: "좋아하는 마음을 자연스럽게 표현하는 순간들",
    },
    playful: {
      message: `${personaName}, 오늘은 내가 먼저 연락했으니까 답장 빨리 해.`,
      draft: `장난으로 넘기지 말고 ${focus}은 제대로 말해야 하는데.`,
      search: "진지한 얘기 전에 분위기 자연스럽게 푸는 법",
      video: "장난 많은 사람이 진심일 때 보이는 행동",
    },
    blunt: {
      message: `${personaName}, 할 말 있어. 시간 되면 직접 보자.`,
      draft: `돌려 말하지 말고 ${focus}부터 바로 꺼내자.`,
      search: "짧게 말해도 오해 없이 진심 전달하는 법",
      video: "직설적인 대화가 상처가 되지 않게 말하는 방법",
    },
    caring: {
      message: `${personaName}, 오늘은 좀 괜찮아? 무리하지 말고.`,
      draft: `${focus}보다 먼저 ${personaName}${kp(personaName, "이", "가")} 부담스럽지 않은지 확인해야겠다.`,
      search: "지친 사람에게 부담 없이 해줄 수 있는 것",
      video: "말보다 곁을 지켜 주는 위로 방법",
    },
    confident: {
      message: `${personaName}, 오늘 만나자. 내가 갈게.`,
      draft: `${focus}은 망설이지 않고 내가 먼저 시작한다.`,
      search: `${focus}을 확실하게 보여주는 방법`,
      video: "중요한 순간 주도적으로 대화를 이끄는 법",
    },
    analytical: {
      message: `${personaName}, 얘기할 게 있어. 시간 괜찮을 때 알려줘.`,
      draft: `${focus}에 필요한 말부터 순서대로 정리해 두자.`,
      search: "감정적인 대화 전 생각 정리 체크리스트",
      video: "복잡한 감정을 차분하게 설명하는 대화법",
    },
    sensitive: {
      message: `${personaName}, 아까 표정이 계속 신경 쓰여. 괜찮아?`,
      draft: `${focus}이 혹시 부담이나 상처가 되지는 않을까.`,
      search: "상대 표정이 계속 신경 쓰이는 이유",
      video: "예민해진 마음을 진정시키고 대화하는 법",
    },
    balanced: {
      message: `${personaName}, 오늘 잠깐 볼 수 있어? 얘기하고 싶어.`,
      draft: `${focus}은 피하지 말고 솔직하게 말해 보자.`,
      search: `${focus}을 차분하게 이야기하는 방법`,
      video: "중요한 이야기를 자연스럽게 시작하는 법",
    },
  }

  return content[personality.primary]
}

export function buildPhoneCommandContent(characterName: string, context?: ImageCommandContext): string {
  const status = context?.status
  const random = createCommandRandom("phone", context)
  const now = getCommandBaseDate(context)
  const stage = inferRelationshipStage(context)
  const displayCharacterName = cleanCommandText(characterName, 16) || "캐릭터"
  const personaName = cleanCommandText(context?.persona?.name || status?.personaName, 16) || "나"
  const relatedContact = cleanCommandText(inferContextContact(characterName, context, random, stage), 22)
  const settingText = [context?.work?.genre, context?.world?.genre, context?.character?.role].filter(Boolean).join(" ")
  const interest = inferCommandInterest(context, random)
  const familyContact = cleanCommandText(generateNamedContact("family", characterName, context, random, stage), 22)
  // 최근 문자 미리보기 — 관계(친분 vs 공식업무)에 맞춰 반말/존댓말 분기
  const contactPreview = buildContactMessagePreview(relatedContact, context, random)
  // 가족/동창 일상 메시지 미리보기
  const familyPreview = buildFamilyMessagePreview(familyContact, random)
  const personalityContent = buildPersonalityPhoneContent(personaName, stage, context)
  const location = cleanCommandText(status?.currentLocation || context?.character?.residence, 18) || "현재 위치"
  const [searchA] = buildPhoneSearchRecords(interest, personaName, location, random, stage)
  const [youtubeA] = buildPhoneYoutubeRecords(interest, random, stage, personaName)
  const {
    cardA,
    cardB,
    merchantA,
    merchantB,
    amountA,
    amountB,
    currencyA,
    currencyB,
  } = buildPhoneMerchants(interest, location, context, random, stage, personaName, characterName)
  const battery = commandPick(random, [63, 72, 84, 91])
  const signal = commandPick(random, ["▂▄▆█", "▂▄▆▇", "▂▃▅█"])
  const quietIcon = commandPick(random, ["🔕", "🔇"])
  const apps = buildPhoneRecentApps(interest, cardA, random)

  return [
    `<phone-status><phone-time>${escapeCommandMarkup(formatPhoneStatusTime(now))}</phone-time><phone-icons>${escapeCommandMarkup(`${quietIcon} HD 5G ${signal} 🔋${battery}%`)}</phone-icons></phone-status>`,
    "<phone-divider></phone-divider>",
    "📞 최근 통화 기록",
    `- ${relatedContact} · 부재중 · ${formatPhoneListTime(offsetCommandTime(now, 64 + Math.floor(random() * 90)))}`,
    `- ${personaName} · 수신 · ${formatPhoneListTime(offsetCommandTime(now, 132 + Math.floor(random() * 80)))}`,
    `- ${familyContact} · 발신 · ${formatPhoneListTime(offsetCommandTime(now, 310 + Math.floor(random() * 180)))}`,
    "",
    "💬 최근 문자 목록",
    `- ${personaName} · 방금 | ${personalityContent.message}`,
    `- ${relatedContact} · ${12 + Math.floor(random() * 25)}분전 | ${contactPreview}`,
    `- ${familyContact} · ${42 + Math.floor(random() * 45)}분전 | ${familyPreview}`,
    `- ${personaName} · 임시저장 | ${personalityContent.draft}`,
    "",
    "🔍 최근 브라우저 검색 기록",
    `- ${searchA}`,
    `- ${personalityContent.search}`,
    "",
    "▶️ 최근 유튜브 시청 기록",
    `- ${youtubeA}`,
    `- ${personalityContent.video}`,
    "",
    "💳 최근 결제 내역",
    `- ${cardA} · ${merchantA} · ${amountA.toLocaleString("ko-KR")}${currencyA} | ${formatPhoneListTime(offsetCommandTime(now, 37 + Math.floor(random() * 50)))}`,
    `- ${cardB} · ${merchantB} · ${amountB.toLocaleString("ko-KR")}${currencyB} | 어제`,
    "",
    "📱 최근 실행 앱",
    `- ${apps}`,
  ].join("\n")
}
