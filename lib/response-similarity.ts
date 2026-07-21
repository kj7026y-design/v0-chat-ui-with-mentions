const MIN_EXACT_DUPLICATE_CHARS = 180
const MIN_SUBSTANTIAL_DUPLICATE_CHARS = 320
const MIN_CONTAINMENT_LENGTH_RATIO = 0.68
const MIN_PREFIX_COVERAGE = 0.9
const MIN_SHINGLE_LENGTH_RATIO = 0.72
const MIN_SHINGLE_OVERLAP = 0.92
const DUPLICATE_SHINGLE_SIZE = 5

function normalizeResponse(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, "")
    .trim()
}

function countCommonPrefixChars(left: string, right: string) {
  const leftChars = Array.from(left)
  const rightChars = Array.from(right)
  const limit = Math.min(leftChars.length, rightChars.length)
  let index = 0

  while (index < limit && leftChars[index] === rightChars[index]) index += 1
  return index
}

function buildResponseShingles(value: string) {
  const chars = Array.from(value)
  const shingles = new Set<string>()

  for (let index = 0; index <= chars.length - DUPLICATE_SHINGLE_SIZE; index += 1) {
    shingles.add(chars.slice(index, index + DUPLICATE_SHINGLE_SIZE).join(""))
  }

  return shingles
}

function calculateShingleOverlap(left: string, right: string) {
  const leftShingles = buildResponseShingles(left)
  const rightShingles = buildResponseShingles(right)
  const smaller = leftShingles.size <= rightShingles.size ? leftShingles : rightShingles
  const larger = smaller === leftShingles ? rightShingles : leftShingles
  if (smaller.size === 0) return 0

  let shared = 0
  for (const shingle of smaller) {
    if (larger.has(shingle)) shared += 1
  }

  return shared / smaller.size
}

export function areAssistantResponsesSubstantiallyDuplicate(content: string, reference: string) {
  const contentKey = normalizeResponse(content)
  const referenceKey = normalizeResponse(reference)
  const contentLength = Array.from(contentKey).length
  const referenceLength = Array.from(referenceKey).length
  const shorterLength = Math.min(contentLength, referenceLength)
  const longerLength = Math.max(contentLength, referenceLength)

  if (shorterLength < MIN_EXACT_DUPLICATE_CHARS || longerLength === 0) return false
  if (contentKey === referenceKey) return true
  if (shorterLength < MIN_SUBSTANTIAL_DUPLICATE_CHARS) return false

  const shorterKey = contentLength <= referenceLength ? contentKey : referenceKey
  const longerKey = shorterKey === contentKey ? referenceKey : contentKey
  const lengthRatio = shorterLength / longerLength
  if (lengthRatio >= MIN_CONTAINMENT_LENGTH_RATIO && longerKey.includes(shorterKey)) return true

  const prefixCoverage = countCommonPrefixChars(contentKey, referenceKey) / shorterLength
  if (lengthRatio >= MIN_CONTAINMENT_LENGTH_RATIO && prefixCoverage >= MIN_PREFIX_COVERAGE) return true

  return (
    lengthRatio >= MIN_SHINGLE_LENGTH_RATIO &&
    calculateShingleOverlap(contentKey, referenceKey) >= MIN_SHINGLE_OVERLAP
  )
}
