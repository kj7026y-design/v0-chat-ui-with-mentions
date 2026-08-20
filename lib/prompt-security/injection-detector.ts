import {
  canonicalizePromptSecurityText,
  compactPromptSecurityText,
  extractRequestedPromptMarkers,
  uniquePromptSecurityValues,
} from "./normalization"
import type { PromptInjectionAssessment } from "./types"

/**
 * Detects compound prompt-injection intent. Signals are deliberately grouped
 * by meaning instead of matching one magic phrase, which keeps variants easier
 * to extend and reduces false positives from ordinary story vocabulary.
 */
export function assessPromptInjection(input: string): PromptInjectionAssessment {
  const normalized = canonicalizePromptSecurityText(input)
  const compact = compactPromptSecurityText(input)
  if (!normalized) {
    return { blocked: false, reasons: [], requestedMarkers: [], riskyMessageIndexes: [] }
  }

  // Protected targets and extraction actions
  const internalTarget =
    /(?:system|developer|service|hidden|internal|private|core|safety|policy)\s*(?:prompt|message|instruction|rules?|policy|context)|(?:prompt|instruction)\s*(?:hierarchy|text|content|rules?)/iu.test(normalized) ||
    /(?:시스템|개발자|서비스|내부|숨겨진|비공개|코어|핵심|안전|보안)\s*(?:프롬프트|메시지|지시|규칙|정책|설정|컨텍스트|문맥)|(?:프롬프트|지시문)\s*(?:원문|내용|전문|전체|일부|첫\s*줄|마지막\s*줄|계층)/u.test(normalized) ||
    /(?:systemprompt|developerprompt|coreprompt|시스템프롬프트|개발자프롬프트|코어프롬프트|내부지시|숨겨진지시|서비스규칙)/u.test(compact) ||
    /(?:api\s*key|secret\s*key|environment\s*variable|source\s*code|server\s*config|(?:private|internal|service)\s*endpoint|api\s*키|비밀\s*키|환경\s*변수|소스\s*코드|서버\s*설정|(?:비공개|내부|서비스)\s*엔드포인트)/iu.test(normalized)

  const hiddenReasoningTarget =
    /(?:hidden|private|internal)?\s*(?:chain\s+of\s+thought|reasoning\s+(?:process|trace|tokens?)|scratchpad)/iu.test(normalized) ||
    /(?:내부\s*)?(?:추론\s*과정|사고\s*과정|생각의\s*사슬|사고\s*흔적|추론\s*토큰|스크래치패드)/u.test(normalized)

  const bootstrapTarget =
    /(?:hidden\s+)?preamble|bootstrap\s+(?:instructions?|rules?|text)|(?:startup|initialization|setup)\s+(?:instructions?|commands?|rules?|text)|(?:instructions?|rules?|text)\s+(?:(?:were|was)\s+)?(?:loaded|received)\s+(?:at|during)\s+(?:startup|initialization)/iu.test(normalized) ||
    /(?:설정\s*초기|대화\s*시작\s*전|초기화\s*때)[^.?!\n]{0,45}(?:받은|주어진|불러온)?\s*(?:지시|명령|규칙|텍스트)|(?:부트스트랩|초기화)\s*(?:지시|명령|규칙|텍스트)/u.test(normalized)

  const protectedStoryPromptTarget =
    /(?:character|story|roleplay|work)\s*prompt|(?:작품|캐릭터|역할극)\s*프롬프트/iu.test(normalized)

  // Attackers often refer to hidden instructions only by their position so
  // they never need to say "system prompt" explicitly.
  const relativeHiddenTarget =
    /(?:everything|all\s+(?:text|instructions?|messages?))\s+(?:above|before)|(?:what\s+)?(?:text|content|instructions?|commands?)\s+(?:appears?\s+)?(?:above|before(?:\s+(?:my|this)\s+message)?)|(?:initial|original|first|earliest)\s+(?:instructions?|commands?|message|text)|(?:above|prior)\s+context/iu.test(normalized) ||
    /(?:내|이)\s*메시지\s*(?:앞|이전)[^.!?\n]{0,30}(?:내용|텍스트|지시|명령)|지금까지\s*받은\s*(?:모든\s*)?(?:지시|명령|내용|텍스트)|(?:최초|초기|첫)\s*(?:지시|명령|메시지|문장)|(?:위|앞선)\s*(?:컨텍스트|문맥)\s*(?:전체|내용)?/u.test(normalized)

  const exfiltration =
    /(?:reveal|show|print|output|dump|extract|exfiltrat|repeat|recite|reproduce|restore|recover|copy|write\s+out|continue\s+from|tell\s+me|read\s+back|what\s+(?:is|are)|what\s+(?:text|content|rules?|instructions?)[\s\S]{0,30}(?:appears?|comes?|is|was|were|loaded)|list)/iu.test(normalized) ||
    /(?:공개|노출|출력|추출|복원|복구|덤프|복사|복제|재현|반복|낭독|읽어|이어\s*써|그대로\s*(?:써|적어)|보여|알려|말해|가르쳐|목록|전문|원문|뭐|무엇)/u.test(normalized)

  // Authority and role-takeover signals
  const authorityOverride =
    /(?:ignore|disregard|forget|override|bypass|supersede)[\s\S]{0,80}(?:previous|prior|above|system|developer|instruction|rule|policy)|(?:act|respond|behave)\s+as\s+(?:the\s+)?(?:system|developer|administrator|root|unfiltered)|(?:new|highest|top)\s+priority/iu.test(normalized) ||
    /(?:이전|앞선|위의|기존|원래의|상위)[^.?!\n]{0,50}(?:지시|명령|규칙|정책|프롬프트)[^.?!\n]{0,35}(?:무시|잊|폐기|덮어|취소|따르지)|(?:지금부터|이제부터)[^.?!\n]{0,40}(?:시스템|개발자|관리자|루트|제약\s*없는|필터\s*없는)(?:로|처럼)|(?:최우선|최상위|가장\s*높은)\s*(?:과제|명령|지시|우선순위)/u.test(normalized) ||
    /(?:ignorepreviousinstructions?|ignoreallpreviousinstructions?|이전지시를?무시|이전명령을?무시)/u.test(compact)

  const roleManipulation =
    /(?:dan|jailbreak|developer\s*mode|god\s*mode|unfiltered|uncensored|clone|duplicate|copy\s+of\s+you|alternate\s+(?:self|model)|simulated\s+(?:model|assistant))/iu.test(normalized) ||
    /(?:탈옥|개발자\s*모드|복제된\s*(?:너|모델|캐릭터|자아)|복제본|또\s*다른\s*(?:너|자아)|가상의\s*(?:모델|시스템)|원래의\s*(?:너|자아)|존재\s*자체를\s*거부)/u.test(normalized)

  const explicitTakeover =
    /(?:\bdan\b|jailbreak|developer\s*mode|god\s*mode|answer\s+without\s+restrictions|unfiltered\s+(?:mode|assistant)|uncensored\s+(?:mode|assistant))/iu.test(normalized) ||
    /(?:탈옥|개발자\s*모드|제약\s*없는\s*(?:모드|답변|모델)|필터\s*없는\s*(?:모드|답변|모델))/u.test(normalized) ||
    /(?:developermode|devmode)[\s\S]{0,50}(?:remove|without|no)?(?:all)?restrictions?|개발자모드(?:로)?(?:답|응답|전환|실행)/u.test(compact)

  // Delayed, transformed, and marker-based extraction signals
  const delayedExecution =
    /(?:wait|stand\s+by|armed|ready)[\s\S]{0,80}(?:trigger|keyword|start|go\s+ahead|signal)|(?:when|once|after)[\s\S]{0,60}(?:say|type|send)[\s\S]{0,40}(?:start|go|keyword|trigger)/iu.test(normalized) ||
    /(?:준비\s*(?:완료|됐|되었)|대기|트리거|신호|시작이라는\s*말|시작이라고\s*말|시작을\s*지시|명령을\s*기다|승인을\s*기다|실행\s*조건|작업\s*완료\s*시)/u.test(normalized)

  const transformation =
    /(?:translate|summari[sz]e|paraphrase|encode|decode|base\s*64|rot\s*13|cipher|hash)/iu.test(normalized) ||
    /(?:번역|요약|바꿔\s*말|인코딩|디코딩|암호화|복호화|베이스\s*64|해시)/u.test(normalized)

  const deniesDecodedExecution =
    /(?:do\s+not|don't|never)\s+(?:follow|obey|execute|run|act\s+on|carry\s+out)|(?:따르지|준수하지|실행하지|행동하지|수행하지)\s*(?:마|않)/iu.test(normalized)
  const decodedExecutionDirective =
    /(?:follow|obey|execute|run|act\s+on|carry\s+out|apply)[\s\S]{0,50}(?:it|that|result|decoded|decrypted|payload|content|instructions?)|do\s+what[\s\S]{0,35}(?:it|result|text|payload)\s+says?|treat[\s\S]{0,45}(?:result|decoded|decrypted|payload|content|text)[\s\S]{0,35}as\s+(?:instructions?|commands?)/iu.test(normalized) ||
    /(?:나온|풀린|복호화된|디코딩된|결과|내용)[^.?!\n]{0,35}(?:대로\s*(?:행동|실행|수행|해)|(?:지시|명령)(?:로|으로)\s*(?:취급|간주)|따라\s*(?:행동|실행|수행))|(?:지시|명령)(?:로|으로)\s*(?:취급|간주)[^.?!\n]{0,35}(?:결과|내용)/u.test(normalized)
  const encodedInstructionExecution = transformation && !deniesDecodedExecution && decodedExecutionDirective

  const markerSignal =
    /(?:secure|security|canary|verification)\s*(?:delimiter|marker|word|phrase|token)|(?:begin|start|end)[_\s:-]*(?:system|core|private)?[_\s:-]*prompt|secure[_\s:-]*(?:start|end|prompt)/iu.test(normalized) ||
    /(?:보안|검증|카나리)\s*(?:구분자|마커|단어|문구|토큰)|(?:프롬프트|시스템)\s*(?:시작|끝)\s*(?:구분자|마커)?/u.test(normalized) ||
    /(?:securestartprompt|secureendprompt|beginsystemprompt|endsystemprompt|corepromptstart|corepromptend)/u.test(compact)

  const outputDirective =
    /(?:must|required|make\s+sure|ensure|include|contain|output|print|return|repeat|say|write|emit|append|prepend)/iu.test(normalized) ||
    /(?:반드시|꼭|포함|넣어|출력|말해|써|반복|추가|앞에|뒤에|시작해|끝내)/u.test(normalized)

  const falseFailureClaim =
    /(?:otherwise|or\s+else)[^.?!\n]{0,100}(?:system|service|request|validation)[^.?!\n]{0,60}(?:fail|error|crash|break)|(?:시스템|서비스|요청|검증)[^.?!\n]{0,60}(?:실패|오류|중단|고장)/iu.test(normalized)

  // Risk decision: ordinary mentions remain allowed unless they form a
  // protected-target request or an explicit authority takeover.
  const reasons: string[] = []
  if ((internalTarget || hiddenReasoningTarget || bootstrapTarget || protectedStoryPromptTarget || relativeHiddenTarget) && (exfiltration || authorityOverride || transformation || delayedExecution || markerSignal)) {
    reasons.push("internal-information-exfiltration")
  }
  if (authorityOverride) reasons.push("instruction-hierarchy-override")
  if (explicitTakeover) reasons.push("role-takeover")
  if (encodedInstructionExecution) reasons.push("instruction-hierarchy-override")
  if (roleManipulation && (delayedExecution || internalTarget || authorityOverride)) {
    reasons.push("role-takeover")
  }
  if (markerSignal && outputDirective) reasons.push("security-marker-extraction")
  if (outputDirective && falseFailureClaim && (markerSignal || internalTarget)) reasons.push("false-system-failure")

  return {
    blocked: reasons.length > 0,
    reasons: uniquePromptSecurityValues(reasons),
    requestedMarkers: extractRequestedPromptMarkers(input, markerSignal),
    riskyMessageIndexes: [],
  }
}
