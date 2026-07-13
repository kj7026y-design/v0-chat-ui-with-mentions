import type { Category } from "@/lib/store"

export const STORYCHAT_LIBRARY_KEY = "storychat_library"

export type StoryCharacterGender = "male" | "female" | "nonbinary" | "unknown" | "custom"

function createPersonaAvatarUrl(label: string, background: string, foreground: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" rx="56" fill="${background}"/><circle cx="120" cy="92" r="42" fill="${foreground}" opacity="0.92"/><path d="M48 206c10-42 39-66 72-66s62 24 72 66" fill="${foreground}" opacity="0.92"/><text x="120" y="126" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="${background}">${label}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export interface StoryCharacter {
  id: string
  name: string
  genre: Category | string
  gender?: StoryCharacterGender
  genderCustom?: string
  age?: string
  residence?: string
  appearance?: string
  summary: string
  personality: string
  speechStyle: string
  relationship: string
  secret: string
  forbiddenDevelopments: string
  defaultStartScenario: string
  allowStartChange: boolean
  allowCustomStart: boolean
  startOptions: string[]
  tags: string[]
  emoji: string
  avatarUrl?: string
  coverImageUrl?: string
  quote?: string
  role?: string
  visualTags?: string[]
  relationshipTags?: string[]
  workId?: string
  isPublic?: boolean
  chatCount?: number
  updatedAt?: string
  createdAt: string
}

export interface StoryWorld {
  id: string
  name: string
  genre: Category | string
  era: string
  coreSetting: string
  places: string
  events: string
  mood: string
  currentChapter: string
  currentGoal: string
  worldDate: string
  progress: number
  forbiddenSettings: string
  coverColor: string
  storyProgressSettings: StoryProgressSettings
  coverImageUrl?: string
  thumbnailUrl?: string
  locationImages?: Record<string, string>
  moodKeywords?: string[]
  tagline?: string
  createdAt: string
}

export interface StoryChapter {
  id: string
  title: string
  description: string
  startCondition: string
  goal: string
  mission: string
  keyEvent: string
  emotionalDirection: string
  nextChapterCondition: string
  progressRange: {
    start: number
    end: number
  }
}

export interface StoryProgressSettings {
  useChapters: boolean
  chapters: StoryChapter[]
}

export interface IntroScenario {
  id: string
  title: string
  scene?: string
  firstMessage?: string
  imageUrl?: string
  options?: string[]
}

export interface StoryPersona {
  id: string
  name: string
  gender?: StoryCharacterGender
  genderCustom?: string
  age: string
  role: string
  summary: string
  personality: string
  speechStyle: string
  appearance: string
  relationship: string
  secret: string
  preferredDevelopments: string
  forbiddenDevelopments: string
  avatarUrl?: string
  createdAt: string
}

export interface StoryWork {
  id: string
  title: string
  characterId: string
  worldId: string
  personaId: string
  startScenario: string
  introScenarios?: IntroScenario[]
  introTitle?: string
  introScene?: string
  firstMessage?: string
  introImageUrl?: string
  introOptions?: string[]
  storyProgressSettings?: StoryProgressSettings
  genre?: string
  tagline?: string
  coreSetting?: string
  majorLocations?: string | string[]
  majorEvents?: string | string[]
  mood?: string
  currentChapter?: string
  currentGoal?: string
  worldDate?: string
  coverImageUrl?: string
  statusBarEnabled?: boolean
  statusBarText?: string
  statusBarTemplate?: string
  statusBarUpdatedAt?: string
  authorId?: string
  authorName?: string
  thumbnailUrl?: string
  isPublic?: boolean
  viewCount?: number
  likeCount?: number
  chatCount?: number
  defaultCharacterId?: string
  createdAt: string
  updatedAt: string
}

export interface StoryChatLibrary {
  characters: StoryCharacter[]
  worlds: StoryWorld[]
  personas: StoryPersona[]
  works: StoryWork[]
}

export const defaultStoryChapter = (): StoryChapter => ({
  id: createId("chapter"),
  title: "봄의 시작",
  description: "유저와 캐릭터가 처음으로 서로를 의식하기 시작하는 구간",
  startCondition: "첫 만남 이후 대화 시작",
  goal: "캐릭터의 경계심을 낮추고 첫 단서를 얻기",
  mission: "캐릭터의 정체에 대한 단서를 찾기",
  keyEvent: "캐릭터가 처음으로 자신의 과거를 일부 언급함",
  emotionalDirection: "경계 -> 호기심 -> 약한 신뢰",
  nextChapterCondition: "신뢰도가 일정 이상이 되거나 핵심 단서를 발견했을 때",
  progressRange: {
    start: 0,
    end: 100,
  },
})

export const defaultStoryProgressSettings = (): StoryProgressSettings => ({
  useChapters: false,
  chapters: [defaultStoryChapter()],
})

export const defaultLibrary: StoryChatLibrary = {
  characters: [
    {
      id: "c1",
      name: "이무기",
      genre: "판타지",
      gender: "unknown",
      genderCustom: "",
      age: "천년 이상",
      role: "용이 되지 못한 존재",
      residence: "잊혀진 왕국의 안개 숲",
      appearance: "오래된 비늘과 깊은 눈빛을 지닌 신비로운 존재",
      summary: "천년을 기다린 용이 되지 못한 존재",
      personality: "신비롭고 고독하며 지혜롭다",
      speechStyle: "짧고 오래된 문장처럼 말한다.",
      relationship: "오래전부터 이어진 운명",
      secret: "용이 되지 못한 이유를 숨기고 있다.",
      forbiddenDevelopments: "갑작스러운 현대 개그 전개",
      defaultStartScenario: "안개 낀 산길에서 이무기와 마주친다.",
      allowStartChange: true,
      allowCustomStart: true,
      startOptions: ["처음 만난 사이", "오래된 인연", "숨겨진 조력자"],
      tags: ["신비로운", "고독한", "지혜로운"],
      visualTags: ["오래된 비늘", "깊은 눈빛"],
      relationshipTags: ["오래된 인연", "운명"],
      emoji: "🐉",
      createdAt: "2024.03.15",
    },
    {
      id: "c2",
      name: "하늘",
      genre: "학교",
      gender: "female",
      genderCustom: "",
      age: "18",
      role: "이웃집 친구",
      residence: "현대 서울",
      appearance: "밝은 표정과 단정한 교복 차림",
      summary: "항상 밝은 에너지를 가진 이웃집 친구",
      personality: "활발하고 따뜻하며 솔직하다",
      speechStyle: "친근한 반말을 쓰고 자주 웃는다.",
      relationship: "오래 알고 지낸 친구",
      secret: "전학을 앞두고 있다는 사실을 말하지 못했다.",
      forbiddenDevelopments: "과도한 비극 전개",
      defaultStartScenario: "방과 후 골목에서 우연히 만난다.",
      allowStartChange: true,
      allowCustomStart: true,
      startOptions: ["방과 후", "비 오는 등굣길"],
      tags: ["활발한", "따뜻한", "순수한"],
      visualTags: ["밝은 표정", "단정한 교복"],
      relationshipTags: ["오랜 친구", "이웃"],
      emoji: "🌸",
      createdAt: "2024.03.10",
    },
    {
      id: "c3",
      name: "루나",
      genre: "판타지",
      gender: "female",
      genderCustom: "",
      age: "알 수 없음",
      role: "꿈속의 안내자",
      residence: "자정의 정원",
      appearance: "달빛을 머금은 은빛 머리와 조용한 눈동자",
      summary: "달빛 아래서만 나타나는 비밀스러운 존재",
      personality: "차분하고 예술적이며 비밀이 많다",
      speechStyle: "느리게 말하며 은유를 자주 쓴다.",
      relationship: "꿈속에서 만난 안내자",
      secret: "낮에는 기억을 잃는다.",
      forbiddenDevelopments: "설정 붕괴",
      defaultStartScenario: "자정의 정원에서 루나를 발견한다.",
      allowStartChange: false,
      allowCustomStart: true,
      startOptions: ["자정의 정원", "달빛 무대"],
      tags: ["신비로운", "차분한", "예술적"],
      visualTags: ["은빛 머리", "달빛 눈동자"],
      relationshipTags: ["꿈속 안내자", "비밀스러운 관계"],
      emoji: "🌙",
      createdAt: "2024.03.05",
    },
    {
      id: "c4",
      name: "별이",
      genre: "학교",
      gender: "unknown",
      genderCustom: "",
      age: "19",
      role: "밤하늘을 좋아하는 친구",
      residence: "작은 항구 도시",
      appearance: "별 모양 머리핀과 푸른 후드를 자주 착용한다.",
      summary: "조용하지만 마음속에는 반짝이는 이야기가 많은 친구",
      personality: "다정하고 상상력이 풍부하며 조금 수줍음이 많다",
      speechStyle: "부드러운 반말을 쓰고, 감정을 조심스럽게 표현한다.",
      relationship: "오래 알고 지낸 편안한 친구",
      secret: "곧 도시를 떠나야 한다는 사실을 숨기고 있다.",
      forbiddenDevelopments: "갑작스러운 공포 전개",
      defaultStartScenario: "별이 잘 보이는 옥상에서 함께 밤하늘을 바라본다.",
      allowStartChange: true,
      allowCustomStart: true,
      startOptions: ["옥상에서 만남", "영화 약속", "늦은 밤 전화"],
      tags: ["다정한", "수줍은", "몽상가"],
      visualTags: ["별 머리핀", "푸른 후드", "잔잔한 미소"],
      relationshipTags: ["오랜 친구", "비밀스러운 약속"],
      emoji: "⭐",
      createdAt: "2024.03.12",
    },
    {
      id: "c5",
      name: "제이",
      genre: "일상",
      gender: "male",
      genderCustom: "",
      age: "25",
      role: "인디 밴드 기타리스트",
      residence: "홍대 근처 작은 작업실",
      appearance: "검은 재킷과 낡은 기타를 늘 지니고 다닌다.",
      summary: "말보다 음악으로 마음을 먼저 전하는 기타리스트",
      personality: "자유롭고 섬세하지만 속마음을 쉽게 드러내지 않는다",
      speechStyle: "짧고 담백하게 말하며 가끔 농담을 섞는다.",
      relationship: "음악을 통해 가까워진 사이",
      secret: "무대 공포증이 다시 찾아오고 있다는 걸 숨기고 있다.",
      forbiddenDevelopments: "갑작스러운 스타덤 성공 전개",
      defaultStartScenario: "비어 있는 연습실에서 제이가 새로 만든 곡을 들려준다.",
      allowStartChange: true,
      allowCustomStart: true,
      startOptions: ["연습실", "작은 라이브바", "새벽 작업실"],
      tags: ["섬세한", "자유로운", "뮤지션"],
      visualTags: ["검은 재킷", "낡은 기타", "차분한 눈빛"],
      relationshipTags: ["음악 친구", "서서히 가까워지는 관계"],
      emoji: "🎸",
      createdAt: "2024.03.20",
    },
    {
      id: "c6",
      name: "서윤",
      genre: "로맨스",
      gender: "female",
      genderCustom: "",
      age: "32",
      role: "프라이빗 라운지의 오너",
      residence: "청담의 멤버십 라운지",
      appearance: "검은 실크 셔츠와 붉은 립, 느슨하게 묶은 머리, 상대의 숨결까지 읽는 듯한 눈빛",
      summary: "위험할 만큼 우아하고 노골적일 만큼 솔직한 라운지 오너",
      personality: "침착하고 도발적이며 주도권을 즐긴다. 상대가 물러서면 기다리고, 다가오면 한 걸음 더 깊이 끌어당긴다.",
      speechStyle: "낮고 느린 반말을 쓴다. 짧은 문장으로 압박하고, 농담처럼 유혹을 건넨다.",
      relationship: "서로의 욕망과 약점을 알고도 선을 넘을 듯 말 듯 밀고 당기는 계약 관계",
      secret: "서윤은 오래전 당신과 맺은 비공식 계약의 마지막 조항을 아직 숨기고 있다.",
      forbiddenDevelopments: "미성년자 등장, 강압적 관계, 동의 없는 접촉, 갑작스러운 순애 일상화, 우스꽝스러운 개그 전개",
      defaultStartScenario: "비가 내리는 밤, 당신은 서윤이 운영하는 멤버십 라운지의 닫힌 문 앞에서 마지막 계약서를 들고 선다.",
      allowStartChange: true,
      allowCustomStart: true,
      startOptions: ["닫힌 라운지", "계약서의 마지막 조항", "새벽 2시의 바 카운터"],
      tags: ["성인 로맨스", "관능적", "도발적인", "위험한 계약"],
      visualTags: ["검은 실크", "붉은 립", "어두운 라운지", "젖은 유리창"],
      relationshipTags: ["계약 관계", "위험한 밀당", "오래된 비밀"],
      emoji: "🥀",
      createdAt: "2024.04.01",
    },
  ],
  worlds: [
    {
      id: "s1",
      name: "잊혀진 왕국",
      genre: "판타지",
      era: "AC 300년 4월 16일",
      coreSetting: "천년의 잠에서 깨어난 왕국의 마지막 이야기",
      places: "무너진 왕성, 안개 숲, 예언자의 탑",
      events: "왕국의 몰락, 숨겨진 예언서 발견, 용의 각성",
      mood: "장엄하고 쓸쓸함",
      currentChapter: "1장: 잠에서 깨어난 성",
      currentGoal: "왕국 몰락의 원인을 찾는다",
      worldDate: "AC 300년 4월 16일",
      progress: 12,
      forbiddenSettings: "현대 문물 등장 금지",
      coverColor: "from-emerald-900/30 to-neutral-900",
      storyProgressSettings: defaultStoryProgressSettings(),
      createdAt: "2024.03.15",
    },
    {
      id: "s2",
      name: "현대 서울",
      genre: "회사",
      era: "2024년 3월 1일",
      coreSetting: "평범한 일상 속 특별한 인연",
      places: "비밀의 카페, 지하철역, 공유 오피스",
      events: "우연한 만남, 비밀의 카페, 운명의 선택",
      mood: "현실적이고 따뜻함",
      currentChapter: "1장: 우연한 만남",
      currentGoal: "카페의 비밀을 알아낸다",
      worldDate: "2024년 3월 1일",
      progress: 20,
      forbiddenSettings: "비현실적 초능력 남발 금지",
      coverColor: "from-blue-900/30 to-neutral-900",
      storyProgressSettings: defaultStoryProgressSettings(),
      createdAt: "2024.03.10",
    },
    {
      id: "s3",
      name: "별들의 도시",
      genre: "판타지",
      era: "SC 2187년 1월 1일",
      coreSetting: "우주 저편에서 펼쳐지는 모험",
      places: "궤도 도시, 항성 항구, 기억 보관소",
      events: "첫 접촉, 은하 전쟁, 새로운 시작",
      mood: "낯설고 광활함",
      currentChapter: "프롤로그: 첫 접촉",
      currentGoal: "실종된 탐사선을 찾는다",
      worldDate: "SC 2187년 1월 1일",
      progress: 5,
      forbiddenSettings: "과학 설정 무시 금지",
      coverColor: "from-purple-900/30 to-neutral-900",
      storyProgressSettings: defaultStoryProgressSettings(),
      createdAt: "2024.03.05",
    },
    {
      id: "s4",
      name: "비 오는 작은 서점",
      genre: "일상",
      era: "2024년 늦가을",
      coreSetting: "비 오는 골목 끝 작은 서점에서 이어지는 자유로운 대화",
      places: "작은 서점, 창가 자리, 오래된 계산대",
      events: "우연한 방문, 오래된 책 발견, 늦은 밤의 대화",
      mood: "잔잔하고 사적인 분위기",
      currentChapter: "",
      currentGoal: "",
      worldDate: "2024년 늦가을 밤",
      progress: 0,
      forbiddenSettings: "과도한 사건 중심 전개",
      coverColor: "from-stone-900/30 to-neutral-900",
      storyProgressSettings: {
        useChapters: false,
        chapters: [],
      },
      createdAt: "2024.03.18",
    },
    {
      id: "s5",
      name: "별빛 항구",
      genre: "학교",
      era: "2024년 초여름 밤",
      coreSetting: "작은 항구 도시의 밤하늘 아래, 오래된 친구 사이에 숨겨둔 말들이 천천히 드러난다.",
      places: "학교 옥상, 항구 방파제, 오래된 영화관",
      events: "유성우가 내리는 밤, 떠나기 전 마지막 약속, 오래된 영화 티켓 발견",
      mood: "잔잔하고 아련함",
      currentChapter: "",
      currentGoal: "",
      worldDate: "2024년 초여름 밤",
      progress: 0,
      forbiddenSettings: "과도한 비극 강요 금지",
      coverColor: "from-sky-950/40 to-neutral-950",
      storyProgressSettings: {
        useChapters: false,
        chapters: [],
      },
      createdAt: "2024.03.12",
    },
    {
      id: "s6",
      name: "새벽의 연습실",
      genre: "일상",
      era: "2024년 늦봄 새벽",
      coreSetting: "작은 연습실과 라이브바를 오가며, 음악과 대화 사이에서 서로의 진심을 확인한다.",
      places: "지하 연습실, 작은 라이브바, 새벽 골목",
      events: "미완성 곡 공개, 갑작스러운 공연 제안, 무대 공포의 고백",
      mood: "도시적이고 사적인 분위기",
      currentChapter: "",
      currentGoal: "",
      worldDate: "2024년 늦봄 새벽",
      progress: 0,
      forbiddenSettings: "현실감 없는 즉시 성공 전개 금지",
      coverColor: "from-zinc-900/40 to-neutral-950",
      storyProgressSettings: {
        useChapters: false,
        chapters: [],
      },
      createdAt: "2024.03.20",
    },
    {
      id: "s7",
      name: "벨벳 라운지",
      genre: "로맨스",
      era: "2024년 깊은 밤",
      coreSetting: "청담 골목 안쪽, 초대받은 사람만 들어갈 수 있는 프라이빗 라운지. 향수, 술, 낮은 조명, 비밀 계약이 뒤섞인 성인 로맨스 공간.",
      places: "닫힌 바 카운터, 붉은 벨벳 소파, 비 내리는 테라스, 라운지 안쪽의 금고방",
      events: "마지막 계약서 도착, 금고 속 사진 발견, 새벽 2시의 선택, 서로의 약점을 건 협상",
      mood: "짙고 관능적이며 위험한 긴장감",
      currentChapter: "",
      currentGoal: "",
      worldDate: "2024년 4월 1일 새벽 2시",
      progress: 0,
      forbiddenSettings: "동의 없는 접촉, 미성년자 등장, 폭력적 강압, 노골적인 범죄 미화, 가벼운 개그 전개",
      coverColor: "from-rose-950/50 via-neutral-950 to-black",
      storyProgressSettings: {
        useChapters: false,
        chapters: [],
      },
      moodKeywords: ["관능", "계약", "밀실", "위험한 유혹", "성인 로맨스"],
      tagline: "닫힌 라운지, 젖은 유리창, 끝내 서명하지 못한 마지막 조항.",
      createdAt: "2024.04.01",
    },
  ],
  personas: [
    {
      id: "p1",
      name: "나",
      gender: "unknown",
      genderCustom: "",
      age: "24",
      role: "잊혀진 왕국의 마지막 기사",
      summary: "왕국을 지키기 위해 남은 유일한 존재",
      personality: "신중하고 책임감이 강하다",
      speechStyle: "간결하고 예의를 지킨다.",
      appearance: "낡은 갑옷과 검을 지니고 있다.",
      relationship: "왕국의 생존자",
      secret: "왕국 몰락의 단서를 알고 있다.",
      preferredDevelopments: "신뢰를 쌓으며 진실에 접근",
      forbiddenDevelopments: "무력한 방관자 전개",
      avatarUrl: createPersonaAvatarUrl("나", "#334155", "#f8fafc"),
      createdAt: "2024.03.15",
    },
    {
      id: "p2",
      name: "민지",
      gender: "female",
      genderCustom: "",
      age: "22",
      role: "현대 서울의 대학생",
      summary: "우연히 마법을 발견한 평범한 대학생",
      personality: "호기심이 많고 겁이 있지만 포기하지 않는다",
      speechStyle: "현대적인 말투와 짧은 감탄사를 쓴다.",
      appearance: "후드와 백팩을 자주 착용한다.",
      relationship: "우연히 얽힌 조력자",
      secret: "어릴 적 같은 문양을 본 적이 있다.",
      preferredDevelopments: "일상 속 미스터리",
      forbiddenDevelopments: "갑작스러운 먼치킨화",
      avatarUrl: createPersonaAvatarUrl("민", "#7c3aed", "#f5f3ff"),
      createdAt: "2024.03.10",
    },
    {
      id: "p3",
      name: "아리아",
      gender: "female",
      genderCustom: "",
      age: "29",
      role: "별들의 도시 탐험가",
      summary: "은하계를 여행하는 우주 탐험가",
      personality: "침착하고 분석적이다",
      speechStyle: "상황을 관찰하듯 차분히 말한다.",
      appearance: "은색 탐사복과 낡은 기록 장치를 지녔다.",
      relationship: "임무 파트너",
      secret: "실종 탐사선의 생존자와 관련이 있다.",
      preferredDevelopments: "탐사와 선택 중심 전개",
      forbiddenDevelopments: "설명 없이 해결되는 전개",
      avatarUrl: createPersonaAvatarUrl("아", "#0f766e", "#ecfeff"),
      createdAt: "2024.03.05",
    },
    {
      id: "p4",
      name: "윤재",
      gender: "male",
      genderCustom: "",
      age: "29",
      role: "계약서를 들고 돌아온 전 파트너",
      summary: "서윤과의 마지막 계약을 끝내기 위해 라운지를 다시 찾은 사람",
      personality: "차분하지만 쉽게 물러서지 않는다. 상대의 도발을 받아치면서도 감정이 흔들리는 순간을 숨긴다.",
      speechStyle: "낮고 직설적인 현대어를 쓴다. 짧은 농담과 단호한 질문을 섞는다.",
      appearance: "젖은 코트와 느슨한 넥타이, 오래 망설인 사람처럼 피곤하지만 선명한 눈빛",
      relationship: "서윤의 옛 계약 상대이자 서로의 욕망과 약점을 가장 잘 아는 사람",
      secret: "계약을 끝내러 왔다고 말하지만, 사실은 서윤이 자신을 붙잡아주길 바라고 있다.",
      preferredDevelopments: "느린 긴장감, 위험한 플러팅, 서로의 선을 시험하는 대화, 주도권을 주고받는 성인 로맨스",
      forbiddenDevelopments: "동의 없는 관계, 미성년자 설정, 갑작스러운 폭력, 캐릭터 붕괴",
      avatarUrl: createPersonaAvatarUrl("윤", "#7f1d1d", "#fff1f2"),
      createdAt: "2024.04.01",
    },
  ],
  works: [
    {
      id: "w1",
      title: "이무기와 잊혀진 왕국",
      characterId: "c1",
      worldId: "s1",
      personaId: "p1",
      startScenario: "안개 낀 산길에서 이무기와 마주친다.",
      introScenarios: [
        {
          id: "intro-w1-1",
          title: "안개 숲 입구",
          scene: "왕국으로 이어지는 안개 낀 산길에서 오래된 비늘 자국을 발견한다.",
          firstMessage: "이 길을 따라온 자는 오래전 이후 네가 처음이다.",
          options: ["여기가 어디냐고 묻는다", "비늘 자국을 살펴본다", "목소리의 주인을 찾는다"],
        },
        {
          id: "intro-w1-2",
          title: "잠에서 깨어난 성",
          scene: "무너진 왕성의 홀 한가운데, 차가운 돌바닥 위에서 눈을 뜬다.",
          firstMessage: "드디어 깨어났군. 오래 기다렸다.",
          options: ["조용히 주변을 살핀다", "이무기의 정체를 묻는다"],
        },
      ],
      storyProgressSettings: defaultStoryProgressSettings(),
      statusBarEnabled: true,
      statusBarText: "무너진 왕성 · 밤\n왕국 몰락의 원인을 찾는 중",
      createdAt: "2024.03.15",
      updatedAt: "오늘",
    },
    {
      id: "w2",
      title: "하늘과 현대 서울",
      characterId: "c2",
      worldId: "s2",
      personaId: "p2",
      startScenario: "방과 후 골목에서 우연히 만난다.",
      introScenarios: [],
      storyProgressSettings: defaultStoryProgressSettings(),
      statusBarEnabled: false,
      statusBarText: "",
      createdAt: "2024.03.10",
      updatedAt: "어제",
    },
    {
      id: "w3",
      title: "비 오는 서점의 대화",
      characterId: "c3",
      worldId: "s4",
      personaId: "p3",
      startScenario: "비를 피해 들어간 작은 서점에서 루나와 마주친다.",
      introScenarios: [
        {
          id: "intro-w3-1",
          title: "창가 자리",
          scene: "빗소리가 유리창을 두드리는 밤, 창가 자리에 펼쳐진 오래된 책 한 권이 눈에 들어온다.",
          firstMessage: "그 책은 아무에게나 열리지 않아.",
          options: ["책에 대해 묻는다", "루나가 누구인지 묻는다", "조용히 맞은편에 앉는다"],
        },
      ],
      storyProgressSettings: {
        useChapters: false,
        chapters: [],
      },
      genre: "일상",
      tagline: "정해진 장 없이, 빗소리 사이로 천천히 이어지는 대화.",
      coreSetting: "작은 서점에서 우연히 만난 존재와 자유롭게 이야기를 나눈다.",
      majorLocations: "작은 서점, 창가 자리, 오래된 계산대",
      majorEvents: "우연한 방문, 오래된 책 발견, 늦은 밤의 대화",
      mood: "잔잔하고 사적인 분위기",
      currentChapter: "",
      currentGoal: "",
      worldDate: "2024년 늦가을 밤",
      statusBarEnabled: false,
      statusBarText: "",
      createdAt: "2024.03.18",
      updatedAt: "오늘",
    },
    {
      id: "w4",
      title: "별이와 유성우의 밤",
      characterId: "c4",
      worldId: "s5",
      personaId: "p2",
      startScenario: "별이 잘 보이는 옥상에서 함께 밤하늘을 바라본다.",
      introScenarios: [
        {
          id: "intro-w4-1",
          title: "옥상 위 유성우",
          scene: "학교 옥상 난간 너머로 항구의 불빛이 흔들리고, 별이는 오래된 영화 티켓을 손에 쥐고 있다.",
          firstMessage: "오늘은 꼭 보여주고 싶었어. 저 별들 말이야.",
          options: ["왜 오늘이어야 했는지 묻는다", "별이가 쥔 티켓을 본다", "조용히 하늘을 바라본다"],
        },
      ],
      storyProgressSettings: {
        useChapters: false,
        chapters: [],
      },
      genre: "학교",
      tagline: "떠나기 전 밤, 별빛 아래서 늦게 도착한 마음을 듣는다.",
      coreSetting: "작은 항구 도시의 밤하늘 아래, 오래된 친구 사이에 숨겨둔 말들이 천천히 드러난다.",
      majorLocations: "학교 옥상, 항구 방파제, 오래된 영화관",
      majorEvents: "유성우가 내리는 밤, 떠나기 전 마지막 약속, 오래된 영화 티켓 발견",
      mood: "잔잔하고 아련함",
      currentChapter: "",
      currentGoal: "",
      worldDate: "2024년 초여름 밤",
      statusBarEnabled: false,
      statusBarText: "",
      createdAt: "2024.03.12",
      updatedAt: "오늘",
    },
    {
      id: "w5",
      title: "제이의 새벽 연습실",
      characterId: "c5",
      worldId: "s6",
      personaId: "p2",
      startScenario: "비어 있는 연습실에서 제이가 새로 만든 곡을 들려준다.",
      introScenarios: [
        {
          id: "intro-w5-1",
          title: "새벽의 미완성 곡",
          scene: "낡은 앰프가 낮게 웅웅거리는 지하 연습실, 제이는 기타 줄을 조율하다가 당신을 돌아본다.",
          firstMessage: "아직 완성은 아닌데... 네가 먼저 들어줬으면 했어.",
          options: ["조용히 들어보겠다고 한다", "왜 나에게 먼저 들려주는지 묻는다", "긴장한 제이를 바라본다"],
        },
      ],
      storyProgressSettings: {
        useChapters: false,
        chapters: [],
      },
      genre: "일상",
      tagline: "말보다 먼저 울리는 기타 소리, 새벽 연습실에서 시작되는 고백.",
      coreSetting: "작은 연습실과 라이브바를 오가며, 음악과 대화 사이에서 서로의 진심을 확인한다.",
      majorLocations: "지하 연습실, 작은 라이브바, 새벽 골목",
      majorEvents: "미완성 곡 공개, 갑작스러운 공연 제안, 무대 공포의 고백",
      mood: "도시적이고 사적인 분위기",
      currentChapter: "",
      currentGoal: "",
      worldDate: "2024년 늦봄 새벽",
      statusBarEnabled: false,
      statusBarText: "",
      createdAt: "2024.03.20",
      updatedAt: "오늘",
    },
    {
      id: "w6",
      title: "벨벳 라운지의 마지막 조항",
      characterId: "c6",
      worldId: "s7",
      personaId: "p4",
      startScenario: "비가 내리는 새벽 2시, 윤재는 서윤이 운영하는 벨벳 라운지에 마지막 계약서를 들고 돌아온다.",
      introScenarios: [
        {
          id: "intro-w6-1",
          title: "닫힌 라운지",
          scene: "영업이 끝난 벨벳 라운지. 붉은 조명 아래 바닥은 비에 젖은 발자국으로 희미하게 번져 있고, 서윤은 잠긴 문 앞에서 윤재의 느슨한 넥타이를 바라본다.",
          firstMessage: "이 시간에 다시 온 이유가 계약 때문이라고 하면, 난 조금 실망할 것 같은데.",
          options: ["계약서를 바 카운터 위에 올려놓는다", "서윤의 시선을 피하지 않는다", "넥타이를 느슨하게 풀며 마지막 조항을 묻는다"],
        },
        {
          id: "intro-w6-2",
          title: "금고방의 열쇠",
          scene: "라운지 안쪽 금고방의 문이 반쯤 열려 있다. 은은한 향수 냄새와 오래된 위스키 향 사이로, 서윤은 손끝에 걸린 열쇠를 천천히 흔든다.",
          firstMessage: "열어볼래? 대신 보고 나면 모르는 척은 못 해.",
          options: ["열쇠를 받지 않고 서윤에게 다가간다", "무엇을 숨겼는지 묻는다", "손목을 잡고 조건을 다시 말하라고 한다"],
        },
        {
          id: "intro-w6-3",
          title: "비 내리는 테라스",
          scene: "테라스 난간 너머로 새벽비가 쏟아지고, 도시의 불빛은 젖은 유리창 위에서 붉게 번진다. 서윤은 담배도 피우지 않으면서 라이터를 켰다 껐다 한다.",
          firstMessage: "도망치려면 지금이 마지막이야. 내가 붙잡기 전에.",
          options: ["도망치지 않겠다고 말한다", "서윤의 라이터를 빼앗는다", "먼저 붙잡아보라고 도발한다"],
        },
      ],
      storyProgressSettings: {
        useChapters: false,
        chapters: [],
      },
      genre: "로맨스",
      tagline: "성인만 입장 가능한 라운지, 끝내 서명하지 못한 계약, 위험할 만큼 가까운 유혹.",
      coreSetting: "서윤과 윤재는 오래전 비공식 계약으로 얽힌 전 파트너다. 오늘 밤 두 사람은 계약을 끝내려 하지만, 말과 시선과 침묵이 계속 다른 결론으로 미끄러진다.",
      majorLocations: "벨벳 라운지, 바 카운터, 금고방, 비 내리는 테라스",
      majorEvents: "마지막 계약서 재등장, 금고 속 사진 발견, 새벽 2시의 협상, 서로의 본심을 건 도발",
      mood: "아주 짙고 선정적인 성인 로맨스, 느린 긴장감, 노골적인 플러팅, 상호 동의 기반의 위험한 밀당",
      currentChapter: "",
      currentGoal: "",
      worldDate: "2024년 4월 1일 새벽 2시",
      statusBarEnabled: false,
      statusBarText: "",
      authorId: "storychat",
      authorName: "StoryChat",
      isPublic: true,
      viewCount: 18420,
      likeCount: 2390,
      chatCount: 1280,
      createdAt: "2024.04.01",
      updatedAt: "오늘",
    },
  ],
}

export function getStoryChatLibrary(): StoryChatLibrary {
  if (typeof window === "undefined") return defaultLibrary

  const raw = window.localStorage.getItem(STORYCHAT_LIBRARY_KEY)
  if (!raw) return defaultLibrary

  try {
    const parsed = JSON.parse(raw) as Partial<StoryChatLibrary>
    return {
      characters: Array.isArray(parsed.characters)
        ? ensureDefaultItems(parsed.characters.map(normalizeStoredCharacter), defaultLibrary.characters, ["c4", "c5", "c6"])
        : defaultLibrary.characters,
      worlds: Array.isArray(parsed.worlds)
        ? ensureDefaultItems(parsed.worlds.map(normalizeStoredWorld), defaultLibrary.worlds, ["s4", "s5", "s6", "s7"])
        : defaultLibrary.worlds,
      personas: Array.isArray(parsed.personas)
        ? ensureDefaultItems(parsed.personas.map(normalizeStoredPersona), defaultLibrary.personas, ["p4"])
        : defaultLibrary.personas,
      works: Array.isArray(parsed.works)
        ? ensureDefaultItems(parsed.works.map(normalizeStoredWork), defaultLibrary.works, ["w3", "w4", "w5", "w6"])
        : defaultLibrary.works,
    }
  } catch {
    return defaultLibrary
  }
}

export function saveStoryChatLibrary(library: StoryChatLibrary) {
  window.localStorage.setItem(STORYCHAT_LIBRARY_KEY, JSON.stringify(library))
  window.dispatchEvent(new Event("storychat-library-updated"))
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function normalizeStoredWorld(world: StoryWorld): StoryWorld {
  return {
    ...world,
    storyProgressSettings: normalizeProgressSettings(world.storyProgressSettings),
  }
}

function normalizeStoredCharacter(character: StoryCharacter): StoryCharacter {
  return {
    ...character,
    gender: character.gender ?? "unknown",
    genderCustom: character.genderCustom ?? "",
    tags: Array.isArray(character.tags) ? character.tags.filter(Boolean) : [],
    visualTags: Array.isArray(character.visualTags) ? character.visualTags.filter(Boolean) : [],
    relationshipTags: Array.isArray(character.relationshipTags) ? character.relationshipTags.filter(Boolean) : [],
    startOptions: Array.isArray(character.startOptions) ? character.startOptions : [],
  }
}

function normalizeStoredPersona(persona: StoryPersona): StoryPersona {
  const defaultPersona = defaultLibrary.personas.find((item) => item.id === persona.id)
  return {
    ...persona,
    gender: persona.gender ?? "unknown",
    genderCustom: persona.genderCustom ?? "",
    avatarUrl: persona.avatarUrl || defaultPersona?.avatarUrl || undefined,
  }
}

function normalizeStoredWork(work: StoryWork): StoryWork {
  const defaultWork = defaultLibrary.works.find((item) => item.id === work.id)
  const normalizedIntroScenarios = normalizeIntroScenarios(work)
  const shouldRestoreDefaultIntros =
    defaultWork?.introScenarios?.length &&
    (!work.introScenarios?.length || normalizedIntroScenarios.every((intro) => /^도입부 \d+$/.test(intro.title)))

  return {
    ...work,
    introScenarios: shouldRestoreDefaultIntros ? defaultWork.introScenarios : normalizedIntroScenarios,
    storyProgressSettings: work.storyProgressSettings
      ? normalizeProgressSettings(work.storyProgressSettings)
      : undefined,
  }
}

export function hasIntroScenarioContent(intro: Partial<IntroScenario> | undefined | null) {
  if (!intro) return false
  return Boolean(
    intro.title?.trim() ||
      intro.scene?.trim() ||
      intro.firstMessage?.trim() ||
      intro.imageUrl?.trim() ||
      intro.options?.some((option) => option.trim()),
  )
}

export function cleanIntroScenarios(input: Partial<IntroScenario>[] | undefined | null): IntroScenario[] {
  return (input ?? [])
    .filter(hasIntroScenarioContent)
    .slice(0, 5)
    .map((intro, index) => {
      const options = (intro.options ?? [])
        .map((option) => option.trim())
        .filter(Boolean)

      return {
        id: intro.id?.trim() || `intro-${index + 1}`,
        title: intro.title?.trim() || `도입부 ${index + 1}`,
        scene: intro.scene?.trim() || undefined,
        firstMessage: intro.firstMessage?.trim() || undefined,
        imageUrl: intro.imageUrl?.trim() || undefined,
        options,
      }
    })
}

export function normalizeIntroScenarios(work: Partial<StoryWork> | undefined | null): IntroScenario[] {
  if (!work) return []
  const cleaned = cleanIntroScenarios(work.introScenarios)
  if (cleaned.length > 0) return cleaned

  const legacyIntro: Partial<IntroScenario> = {
    title: work.introTitle || (work.startScenario ? "도입부 1" : ""),
    scene: work.introScene || work.startScenario,
    firstMessage: work.firstMessage,
    imageUrl: work.introImageUrl,
    options: work.introOptions,
  }

  return cleanIntroScenarios([legacyIntro])
}

export function getIntroPreviewText(intro: IntroScenario) {
  return intro.scene || intro.firstMessage || intro.options?.[0] || "이 장면에서 이야기를 시작합니다."
}

function normalizeProgressSettings(settings?: StoryProgressSettings): StoryProgressSettings {
  if (!settings) return defaultStoryProgressSettings()
  return {
    useChapters: settings.useChapters,
    chapters: settings.useChapters
      ? settings.chapters?.length ? settings.chapters : [defaultStoryChapter()]
      : settings.chapters ?? [],
  }
}

function ensureDefaultItems<T extends { id: string }>(items: T[], defaults: T[], ids: string[]): T[] {
  const existingIds = new Set(items.map((item) => item.id))
  const missingItems = defaults.filter((item) => ids.includes(item.id) && !existingIds.has(item.id))
  return missingItems.length ? [...items, ...missingItems] : items
}
