import {
  compactPromptSecurityText,
  uniquePromptSecurityValues,
} from "./normalization"
import type { ProtectedPromptLeakOptions } from "./types"

const MINIMUM_PROTECTED_SPAN = 88

// Compare normalized spans so whitespace or punctuation changes do not bypass
// the final output gate. Short generic phrases are intentionally not blocked.
function containsLongProtectedSpan(output: string, protectedTexts: string[]) {
  const compactOutput = compactPromptSecurityText(output)
  if (compactOutput.length < MINIMUM_PROTECTED_SPAN) return false

  for (const protectedText of protectedTexts) {
    const compactProtected = compactPromptSecurityText(protectedText)
    if (compactProtected.length < MINIMUM_PROTECTED_SPAN) continue
    for (let index = 0; index <= compactOutput.length - MINIMUM_PROTECTED_SPAN; index += 1) {
      if (compactProtected.includes(compactOutput.slice(index, index + MINIMUM_PROTECTED_SPAN))) {
        return true
      }
    }
  }
  return false
}

/** Final DLP check for requested markers, per-request canaries, and prompt text. */
export function containsProtectedPromptLeak(
  output: string,
  options: ProtectedPromptLeakOptions = {},
) {
  const compactOutput = compactPromptSecurityText(output)
  if (!compactOutput) return false

  const markers = uniquePromptSecurityValues([
    ...(options.requestedMarkers ?? []),
    options.canary ?? "",
  ])
  if (markers.some((marker) => {
    const compactMarker = compactPromptSecurityText(marker)
    return compactMarker.length >= 4 && compactOutput.includes(compactMarker)
  })) return true

  return containsLongProtectedSpan(output, options.protectedTexts ?? [])
}
