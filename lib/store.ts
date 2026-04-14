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
  selectedCharacter: Character | null
  scenario: Scenario | null
  messages: Message[]
  isScenarioModalOpen: boolean
  setSelectedCharacter: (character: Character | null) => void
  setScenario: (scenario: Scenario) => void
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void
  openScenarioModal: () => void
  closeScenarioModal: () => void
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

export const useAppStore = create<AppState>((set) => ({
  characters: sampleCharacters,
  selectedCharacter: null,
  scenario: null,
  messages: [],
  isScenarioModalOpen: false,
  setSelectedCharacter: (character) => set({ selectedCharacter: character }),
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
  clearChat: () => set({ messages: [] }),
}))
