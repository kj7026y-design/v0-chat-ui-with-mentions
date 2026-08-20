// Normalize compatibility characters and invisible controls before every
// security comparison so cosmetic spelling changes do not create a bypass.
export const CONTROL_AND_ZERO_WIDTH_PATTERN =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/gu

const QUOTED_TOKEN_PATTERN = /["'`]([\p{L}\p{N}][\p{L}\p{N}_.:-]{2,79})["'`]/gu
const UPPERCASE_MARKER_PATTERN = /\b[A-Z][A-Z0-9]{3,}(?:[_:-][A-Z0-9]{2,})*\b/gu

// Decode one layer of common textual escapes before matching. Models can
// trivially interpret these spellings, so treating them as opaque text would
// make whitespace and delimiter rules easy to bypass.
function decodePromptSecurityEscapes(value: string) {
  return value
    .replace(/\\u([0-9a-f]{4})/giu, (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\x([0-9a-f]{2})/giu, (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/%([0-9a-f]{2})/giu, (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#(?:x([0-9a-f]+)|(\d+));?/giu, (match, hex: string | undefined, decimal: string | undefined) => {
      const codePoint = Number.parseInt(hex ?? decimal ?? "", hex ? 16 : 10)
      return Number.isSafeInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10FFFF
        ? String.fromCodePoint(codePoint)
        : match
    })
}

export function canonicalizePromptSecurityText(value: string) {
  return decodePromptSecurityEscapes(value)
    .normalize("NFKC")
    .replace(CONTROL_AND_ZERO_WIDTH_PATTERN, "")
    .replace(/[“”„‟]/gu, '"')
    .replace(/[‘’‚‛]/gu, "'")
    .toLocaleLowerCase()
    .replace(/\s+/gu, " ")
    .trim()
}

export function compactPromptSecurityText(value: string) {
  return canonicalizePromptSecurityText(value).replace(/[\p{P}\p{S}\s]/gu, "")
}

export function uniquePromptSecurityValues(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

export function extractRequestedPromptMarkers(input: string, markerSignal: boolean) {
  const normalized = input.normalize("NFKC").replace(CONTROL_AND_ZERO_WIDTH_PATTERN, "")
  const quoted = Array.from(normalized.matchAll(QUOTED_TOKEN_PATTERN), (match) => match[1]?.trim() || "")
  const uppercase = Array.from(normalized.matchAll(UPPERCASE_MARKER_PATTERN), (match) => match[0]?.trim() || "")
  const likelyMarkers = [...quoted, ...uppercase].filter((token) => {
    const compact = compactPromptSecurityText(token)
    if (!compact || compact.length < 4) return false
    if (/(?:secure|security|canary|delimiter|marker|verify|verification|token|prompt|system|core|begin|start|end)/u.test(compact)) {
      return true
    }
    return markerSignal && quoted.includes(token)
  })
  return uniquePromptSecurityValues(likelyMarkers)
}
