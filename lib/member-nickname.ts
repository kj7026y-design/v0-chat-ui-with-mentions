const TWO_LETTER_ANIMALS = [
  "순록",
  "표범",
  "토끼",
  "여우",
  "수달",
  "판다",
  "기린",
  "참새",
  "물개",
  "펭귄",
  "마멋",
  "하마",
] as const

const THREE_LETTER_ANIMALS = [
  "강아지",
  "고양이",
  "다람쥐",
  "햄스터",
  "부엉이",
  "코알라",
  "오소리",
  "알파카",
] as const

const SIX_LETTER_PHRASES = [
  "날으는초록색",
  "건들대는노란",
  "비누방울부는",
  "달빛따라걷는",
  "콧노래부르는",
  "구름위를걷는",
  "새벽잠에취한",
  "햇살아래웃는",
  "별빛품고자는",
  "꽃밭에서뛰는",
] as const

const FIVE_LETTER_PHRASES = [
  "기지개피는",
  "꼬리흔드는",
  "낮잠을자는",
  "노래를하는",
  "산책을하는",
  "하품을하는",
  "춤추며노는",
  "바람을타는",
  "별보러가는",
  "간식을찾는",
] as const

function pickRandom<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)]
}

export function getMemberNicknameLength(value: string) {
  return Array.from(value).length
}

export function generateMemberNickname() {
  return Math.random() < 0.5
    ? `${pickRandom(SIX_LETTER_PHRASES)}${pickRandom(TWO_LETTER_ANIMALS)}`
    : `${pickRandom(FIVE_LETTER_PHRASES)}${pickRandom(THREE_LETTER_ANIMALS)}`
}
