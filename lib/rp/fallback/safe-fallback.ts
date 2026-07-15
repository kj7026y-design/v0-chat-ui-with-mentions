export { buildSafeFallbackReply } from "@/lib/rp/pipeline"

export type RoleplayFallbackPolicy = {
  allowLocalFallback: boolean
  providerOrder: Array<"same" | "openrouter" | "local">
}
