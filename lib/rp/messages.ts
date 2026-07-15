import type { ChatMessages } from "./providers"

export {
  buildRoleplayMessages,
  normalizeOpenRouterOutput,
} from "./pipeline"

export type RoleplayMessage = ChatMessages[number]

export function stripSystemMessages(messages: ChatMessages): ChatMessages {
  return messages.filter((message) => message.role !== "system")
}
