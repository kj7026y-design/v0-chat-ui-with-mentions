"use client"

import { create } from "zustand"

export interface Character {
  id: string
  name: string
  description: string
  avatar: string
  personality: string
  tags: string[]
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
  {
    id: "1",
    name: "아리아",
    description: "신비로운 엘프 마법사. 고대 마법을 연구하며, 지혜롭고 차분한 성격을 가지고 있습니다.",
    avatar: "🧝‍♀️",
    personality: "지혜롭고 차분하며 호기심이 많음",
    tags: ["판타지", "마법", "엘프"],
  },
  {
    id: "2",
    name: "카이",
    description: "우주 탐험가. 미지의 행성을 탐험하며 새로운 생명체를 발견하는 것이 꿈입니다.",
    avatar: "🚀",
    personality: "모험적이고 낙관적이며 용감함",
    tags: ["SF", "우주", "탐험"],
  },
  {
    id: "3",
    name: "미도리",
    description: "도쿄의 카페를 운영하는 바리스타. 따뜻한 미소와 완벽한 커피로 사람들에게 위안을 줍니다.",
    avatar: "☕",
    personality: "따뜻하고 세심하며 예술적 감각이 뛰어남",
    tags: ["현대", "일상", "로맨스"],
  },
  {
    id: "4",
    name: "레온",
    description: "중세 기사단의 단장. 명예와 정의를 위해 싸우며, 검술에 뛰어난 실력을 가지고 있습니다.",
    avatar: "⚔️",
    personality: "정의롭고 용맹하며 리더십이 강함",
    tags: ["중세", "기사", "액션"],
  },
  {
    id: "5",
    name: "사쿠라",
    description: "고등학교 미술부 부장. 그림을 통해 감정을 표현하며, 섬세하고 감성적인 성격입니다.",
    avatar: "🎨",
    personality: "감성적이고 섬세하며 내성적",
    tags: ["학원", "예술", "청춘"],
  },
  {
    id: "6",
    name: "닥터 윤",
    description: "천재 과학자. 인류의 미래를 위한 혁신적인 기술을 개발하고 있습니다.",
    avatar: "🔬",
    personality: "천재적이고 열정적이며 약간 괴짜",
    tags: ["SF", "과학", "미래"],
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
