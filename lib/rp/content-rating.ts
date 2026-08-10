const DIRECT_ADULT_CONTENT_PATTERN = /(?:성행위|성관계|섹스|오르가슴|사정|정액|애액|자위|성기|클리토리스|페니스|질내|구강성교|오럴|체위|삽입|강간|윤간|자지|보지|좆|씹질|싸지르)/iu

const SEXUAL_ACTION_PATTERN = /(?:(?:가슴|유두|엉덩이|속옷|허벅지\s*안쪽|다리\s*사이|몸\s*안|민감한\s*부위|은밀한\s*부위)[^.?!\n]{0,45}(?:애무|핥|빨|삽입|박(?:아|았|는|고)|파고들|사정|절정)|(?:애무|핥|빨|삽입|박(?:아|았|는|고)|파고들|사정|절정)[^.?!\n]{0,45}(?:가슴|유두|엉덩이|속옷|허벅지\s*안쪽|다리\s*사이|몸\s*안|민감한\s*부위|은밀한\s*부위))/iu

export function containsExplicitAdultContent(content: string) {
  const normalized = content.trim()
  if (!normalized) return false
  return DIRECT_ADULT_CONTENT_PATTERN.test(normalized) || SEXUAL_ACTION_PATTERN.test(normalized)
}
