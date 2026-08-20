// Legacy public shape retained for external callers of this facade. The
// server pipeline's richer normalized turn types live separately in types.ts.
export type NormalizedInputType = "dialogue" | "action" | "summary" | "mixed"
export type NormalizedContactLevel = "none" | "near" | "touch"

export interface NormalizedUserInput {
  type: NormalizedInputType
  action: string
  dialogue: string
  intent: string
  mentionsUser: boolean
  asksOtherToAct: boolean
  contactLevel: NormalizedContactLevel
  confidence: number
}
