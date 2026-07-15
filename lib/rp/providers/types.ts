export type ChatMessages = Array<{
  role: "system" | "user" | "assistant"
  content: string
}>
