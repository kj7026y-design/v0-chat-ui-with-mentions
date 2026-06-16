"use client"

export const STORYCHAT_TIMELINE_KEY = "storychat_timeline_events"

export interface TimelineEvent {
  id: string
  title: string
  date: string
  imageUrl?: string
  description: string
}

export const defaultTimelineEvents: TimelineEvent[] = [
  {
    id: "1",
    title: "첫 만남의 날",
    date: "2024-03-15",
    description: "카페에서 우연히 마주친 두 사람. 창밖으로 벚꽃이 흩날리던 그 날, 서로의 눈빛이 처음으로 마주쳤다. 이 만남이 모든 이야기의 시작이 될 줄은 아무도 몰랐다.",
  },
  {
    id: "2",
    title: "민지의 생일",
    date: "2024-04-22",
    description: "민지의 스물세 번째 생일. 깜짝 파티를 준비하며 처음으로 손을 잡았던 순간. 케이크 위 촛불이 꺼지고 어둠 속에서 나눈 첫 번째 약속.",
  },
  {
    id: "3",
    title: "우리의 100일",
    date: "2024-06-23",
    description: "함께한 지 100일이 되던 날. 처음 만났던 카페에서 다시 마주 앉아 지나온 날들을 이야기했다. 테이블 위에 놓인 작은 선물 상자와 그 안에 담긴 커플 반지.",
  },
  {
    id: "4",
    title: "비밀이 드러난 밤",
    date: "2024-08-10",
    description: "오해와 비밀이 얽힌 그 밤. 쏟아지는 빗속에서 마주한 진실. 서로에게 숨겨왔던 과거가 드러나며 관계에 균열이 생기기 시작했다.",
  },
  {
    id: "5",
    title: "이별의 순간",
    date: "2024-09-30",
    description: "기차역 플랫폼에서 마지막 인사를 나눴다. 떠나는 기차를 바라보며 흘린 눈물. 다시 만날 수 있을까, 대답 없는 질문만이 공허하게 울렸다.",
  },
  {
    id: "6",
    title: "재회",
    date: "2024-12-24",
    description: "크리스마스 이브, 눈 내리는 거리에서 우연히 다시 마주쳤다. 1년 전 그날처럼, 하지만 모든 것이 달라진 두 사람. 새로운 시작의 가능성이 열렸다.",
  },
]

export function getTimelineEvents() {
  if (typeof window === "undefined") return defaultTimelineEvents

  const savedEvents = window.localStorage.getItem(STORYCHAT_TIMELINE_KEY)
  if (!savedEvents) {
    saveTimelineEvents(defaultTimelineEvents)
    return defaultTimelineEvents
  }

  try {
    return JSON.parse(savedEvents) as TimelineEvent[]
  } catch {
    window.localStorage.removeItem(STORYCHAT_TIMELINE_KEY)
    saveTimelineEvents(defaultTimelineEvents)
    return defaultTimelineEvents
  }
}

export function saveTimelineEvents(events: TimelineEvent[]) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(STORYCHAT_TIMELINE_KEY, JSON.stringify(events))
  window.dispatchEvent(new Event("storychat-timeline-updated"))
}

export function createTimelineEventId() {
  return `timeline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
