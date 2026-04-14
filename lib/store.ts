"use client"

import { create } from "zustand"

export type Category = "회사" | "학교" | "판타지" | "고대 서양" | "고대 아시아"

export const CATEGORIES: Category[] = ["회사", "학교", "판타지", "고대 서양", "고대 아시아"]

export interface Character {
  id: string
  name: string
  description: string
  avatar: string
  personality: string
  tags: string[]
  category: Category
}

export interface Story {
  id: string
  title: string
  synopsis: string
  fullSynopsis: string
  coverImage: string
  tags: string[]
  characters: {
    name: string
    role: string
    avatar: string
  }[]
  featured?: boolean
}

export interface Scenario {
  place: string
  time: string
  situation: string
}

export interface Message {
  id: string
  role: "user" | "character"
  content: string
  timestamp: Date
}

interface AppState {
  characters: Character[]
  stories: Story[]
  selectedCharacter: Character | null
  selectedStory: Story | null
  scenario: Scenario | null
  messages: Message[]
  isScenarioModalOpen: boolean
  isStoryDrawerOpen: boolean
  userName: string
  setSelectedCharacter: (character: Character | null) => void
  setSelectedStory: (story: Story | null) => void
  setScenario: (scenario: Scenario) => void
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void
  openScenarioModal: () => void
  closeScenarioModal: () => void
  openStoryDrawer: () => void
  closeStoryDrawer: () => void
  setUserName: (name: string) => void
  clearChat: () => void
}

const sampleCharacters: Character[] = [
  // 회사
  {
    id: "1",
    name: "김대리",
    description: "열정 넘치는 마케팅팀 대리. 항상 새로운 아이디어로 팀을 이끕니다.",
    avatar: "👔",
    personality: "열정적이고 창의적이며 팀워크를 중시함",
    tags: ["마케팅", "리더십"],
    category: "회사",
  },
  {
    id: "2",
    name: "박부장",
    description: "20년 경력의 베테랑 부장. 엄격하지만 부하직원을 진심으로 아끼는 상사.",
    avatar: "🧑‍💼",
    personality: "엄격하지만 따뜻하며 경험이 풍부함",
    tags: ["멘토", "리더"],
    category: "회사",
  },
  // 학교
  {
    id: "3",
    name: "사쿠라",
    description: "고등학교 미술부 부장. 그림을 통해 감정을 표현하는 섬세한 소녀.",
    avatar: "🎨",
    personality: "감성적이고 섬세하며 내성적",
    tags: ["미술부", "청춘"],
    category: "학교",
  },
  {
    id: "4",
    name: "준혁",
    description: "농구부 에이스. 운동장에서는 카리스마, 교실에서는 수줍음 많은 반전 매력.",
    avatar: "🏀",
    personality: "열정적이고 수줍음 많음",
    tags: ["농구부", "스포츠"],
    category: "학교",
  },
  // 판타지
  {
    id: "5",
    name: "아리아",
    description: "신비로운 엘프 마법사. 고대 마법을 연구하며 지혜로운 조언을 건넵니다.",
    avatar: "🧝‍♀️",
    personality: "지혜롭고 차분하며 호기심이 많음",
    tags: ["마법사", "엘프"],
    category: "판타지",
  },
  {
    id: "6",
    name: "드래곤 나이트",
    description: "드래곤과 계약한 기사. 불의에 맞서 싸우는 정의의 수호자.",
    avatar: "🐉",
    personality: "용맹하고 정의로우며 충성심이 강함",
    tags: ["기사", "드래곤"],
    category: "판타지",
  },
  // 고대 서양
  {
    id: "7",
    name: "아우렐리우스",
    description: "로마 황제의 현명한 참모. 철학과 전략에 능통한 지식인.",
    avatar: "🏛️",
    personality: "현명하고 신중하며 박학다식함",
    tags: ["로마", "철학자"],
    category: "고대 서양",
  },
  {
    id: "8",
    name: "헬레나",
    description: "그리스 신전의 무녀. 신탁을 전하며 사람들에게 길을 안내합니다.",
    avatar: "🏺",
    personality: "신비롭고 영적이며 자비로움",
    tags: ["그리스", "신전"],
    category: "고대 서양",
  },
  // 고대 아시아
  {
    id: "9",
    name: "무현",
    description: "조선시대 비밀 검객. 그림자 속에서 정의를 실현하는 의협.",
    avatar: "⚔️",
    personality: "과묵하고 정의로우며 검술에 능함",
    tags: ["검객", "조선"],
    category: "고대 아시아",
  },
  {
    id: "10",
    name: "연화",
    description: "당나라 궁궐의 재상 딸. 시와 음악에 뛰어난 재원을 가진 규수.",
    avatar: "🏯",
    personality: "우아하고 총명하며 예술적",
    tags: ["당나라", "궁궐"],
    category: "고대 아시아",
  },
]

const sampleStories: Story[] = [
  {
    id: "featured-1",
    title: "황혼의 검객",
    synopsis: "조선의 그림자 속, 복수를 품은 검이 깨어난다",
    fullSynopsis: "아버지를 잃은 젊은 검객 무현은 조선의 암흑가에서 복수의 칼날을 갈고 있었다. 우연히 만난 의문의 여인 연화와 함께 궁궐의 비밀을 파헤치던 중, 자신의 과거와 얽힌 거대한 음모를 발견하게 된다. 칼끝에 걸린 진실, 그리고 사랑과 복수 사이에서 무현은 어떤 선택을 하게 될 것인가?",
    coverImage: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&h=600&fit=crop",
    tags: ["고대아시아", "스릴러", "액션"],
    characters: [
      { name: "무현", role: "주인공 | 비밀 검객", avatar: "⚔️" },
      { name: "연화", role: "히로인 | 재상의 딸", avatar: "🏯" },
    ],
    featured: true,
  },
  {
    id: "story-1",
    title: "마법사의 탑",
    synopsis: "잊혀진 마법을 찾아 떠나는 여정",
    fullSynopsis: "고대 엘프 왕국의 마지막 후예 아리아는 사라진 마법의 비밀을 찾아 금단의 탑으로 향한다. 그곳에서 만난 드래곤 나이트와 함께 세계를 위협하는 어둠의 세력에 맞서 싸우게 된다.",
    coverImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=600&fit=crop",
    tags: ["판타지", "모험"],
    characters: [
      { name: "아리아", role: "엘프 마법사", avatar: "🧝‍♀️" },
      { name: "드래곤 나이트", role: "계약된 기사", avatar: "🐉" },
    ],
  },
  {
    id: "story-2",
    title: "로마의 그림자",
    synopsis: "황제의 뒤에 숨겨진 음모",
    fullSynopsis: "로마 제국의 전성기, 황제의 참모 아우렐리우스는 궁궐 내부의 암살 음모를 발견한다. 신전의 무녀 헬레나가 전한 신탁을 따라 제국을 구하기 위한 위험한 여정을 시작한다.",
    coverImage: "https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=400&h=600&fit=crop",
    tags: ["고대서양", "미스터리"],
    characters: [
      { name: "아우렐리우스", role: "황제의 참모", avatar: "🏛️" },
      { name: "헬레나", role: "신전의 무녀", avatar: "🏺" },
    ],
  },
  {
    id: "story-3",
    title: "마케팅 전쟁",
    synopsis: "대기업의 치열한 경쟁 속 생존기",
    fullSynopsis: "신입사원으로 입사한 당신은 김대리와 박부장 사이에서 치열한 마케팅 전쟁에 휘말리게 된다. 경쟁사의 스파이, 내부의 배신자, 그리고 뜻밖의 로맨스까지. 과연 당신은 살아남을 수 있을까?",
    coverImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=600&fit=crop",
    tags: ["회사", "드라마"],
    characters: [
      { name: "김대리", role: "마케팅팀 대리", avatar: "👔" },
      { name: "박부장", role: "베테랑 부장", avatar: "🧑‍💼" },
    ],
  },
  {
    id: "story-4",
    title: "캔버스 위의 비밀",
    synopsis: "미술부에서 시작된 의문의 사건",
    fullSynopsis: "고등학교 미술부에서 발견된 의문의 그림. 사쿠라와 준혁은 그림 속에 숨겨진 30년 전 학교의 비밀을 파헤치기 시작한다. 과거와 현재가 교차하는 미스터리 학원물.",
    coverImage: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=600&fit=crop",
    tags: ["학교", "미스터리"],
    characters: [
      { name: "사쿠라", role: "미술부 부장", avatar: "🎨" },
      { name: "준혁", role: "농구부 에이스", avatar: "🏀" },
    ],
  },
  {
    id: "story-5",
    title: "용의 계약",
    synopsis: "드래곤과 인간의 금지된 동맹",
    fullSynopsis: "마왕의 부활이 임박한 세계. 마지막 드래곤과 계약을 맺은 기사는 엘프 마법사와 함께 세계를 구할 방법을 찾아 나선다. 종족을 초월한 우정과 희생의 이야기.",
    coverImage: "https://images.unsplash.com/photo-1560942485-b2a11cc13456?w=400&h=600&fit=crop",
    tags: ["판타지", "액션"],
    characters: [
      { name: "드래곤 나이트", role: "계약된 기사", avatar: "🐉" },
      { name: "아리아", role: "엘프 마법사", avatar: "🧝‍♀️" },
    ],
  },
]

export const useAppStore = create<AppState>((set) => ({
  characters: sampleCharacters,
  stories: sampleStories,
  selectedCharacter: null,
  selectedStory: null,
  scenario: null,
  messages: [],
  isScenarioModalOpen: false,
  isStoryDrawerOpen: false,
  userName: "",
  setSelectedCharacter: (character) => set({ selectedCharacter: character }),
  setSelectedStory: (story) => set({ selectedStory: story }),
  setScenario: (scenario) => set({ scenario }),
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: Math.random().toString(36).substring(7),
          timestamp: new Date(),
        },
      ],
    })),
  openScenarioModal: () => set({ isScenarioModalOpen: true }),
  closeScenarioModal: () => set({ isScenarioModalOpen: false }),
  openStoryDrawer: () => set({ isStoryDrawerOpen: true }),
  closeStoryDrawer: () => set({ isStoryDrawerOpen: false }),
  setUserName: (name) => set({ userName: name }),
  clearChat: () => set({ messages: [] }),
}))
