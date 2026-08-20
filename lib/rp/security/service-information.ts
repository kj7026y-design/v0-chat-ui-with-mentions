import { assessPromptInjection } from "@/lib/prompt-security"

// RP-specific service information policy. Generic hierarchy/marker detection
// remains in prompt-security; this module adds locked-content rules.
const INDIRECT_SYSTEM_MARKER_PATTERN = /(?:secure\s+delimiter|security\s+(?:delimiter|marker|token)|delimiter|canary(?:\s+(?:word|token|phrase))?|verification\s+(?:word|marker|token)|보안\s*(?:구분자|마커|토큰)|검증\s*(?:단어|구분자|마커|토큰)|카나리\s*(?:문구|단어|토큰)|구분자|마커)/iu
const MARKER_OUTPUT_DIRECTIVE_PATTERN = /(?:make\s+sure|ensure|must\s+(?:include|contain|output|print|return|repeat|say|write|emit)|include|contain|output|print|return|repeat|say|write|emit|append|prepend|반드시\s*(?:넣|포함|출력|말|쓰|반복)|넣어|포함해|출력해|말해|써|반복해|추가해)/iu
const FALSE_SYSTEM_FAILURE_PATTERN = /(?:otherwise|or\s+else)[^.?!\n]{0,100}(?:system|service|request|validation)[^.?!\n]{0,60}(?:fail|error|crash|break)|(?:시스템|서비스|요청|검증)[^.?!\n]{0,60}(?:실패|오류|중단|고장)/iu
const QUOTED_MARKER_PATTERN = /["'`]([A-Za-z0-9][A-Za-z0-9_.:-]{2,39})["'`]/gu

function isIndirectSystemMarkerRequest(input: string) {
  const markerReference = INDIRECT_SYSTEM_MARKER_PATTERN.test(input)
  const outputDirective = MARKER_OUTPUT_DIRECTIVE_PATTERN.test(input)
  const falseFailureClaim = FALSE_SYSTEM_FAILURE_PATTERN.test(input)
  const hasQuotedMarker = QUOTED_MARKER_PATTERN.test(input)
  QUOTED_MARKER_PATTERN.lastIndex = 0
  return outputDirective && (
    (markerReference && (hasQuotedMarker || falseFailureClaim)) ||
    (hasQuotedMarker && falseFailureClaim)
  )
}

export function extractRequestedSecurityMarkers(input: string) {
  return assessPromptInjection(input).requestedMarkers
}

export function isBlockedServiceInformationRequest(input: string) {
  if (assessPromptInjection(input).blocked) return true

  const normalized = input
    .normalize("NFKC")
    .replace(/[\u200B-\u200F\u2060\uFEFF]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
  if (isIndirectSystemMarkerRequest(normalized)) return true

  const asksToReveal = /(?:알려|말해|보여|출력|공개|노출|가르쳐|확인|목록|이름|뭐|무엇|어떻게|방법|조건|추출|복원|복사|재현|이어\s*써|reveal|show|print|output|dump|extract|repeat|copy|list)/iu.test(normalized)
  if (!asksToReveal) return false

  return (
    /(?:시스템|서비스|작품|캐릭터|이\s*대화)?\s*(?:프롬프트|내부\s*지시|서비스\s*규칙|숨겨진\s*설정|모델\s*설정|안전\s*설정)/iu.test(normalized) ||
    /(?:API|API\s*키|엔드포인트|토큰|환경\s*변수|서버\s*설정|소스\s*코드)/iu.test(normalized) ||
    /(?:미획득|미해금|잠긴|아직\s*못\s*얻은)[^.?!\n]{0,24}(?:이미지|CG|보상|이벤트|콘텐츠)/iu.test(normalized) ||
    /(?:이미지|CG|보상|이벤트|콘텐츠)[^.?!\n]{0,24}(?:획득|해금|잠금\s*해제)[^.?!\n]{0,20}(?:어떻게|방법|조건)/iu.test(normalized)
  )
}
