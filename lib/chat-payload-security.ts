export type ClientChatPayloadMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export function buildClientChatPayloadMessages<T extends ClientChatPayloadMessage>(
  messages: T[],
  environment = process.env.NODE_ENV,
) {
  return environment === "production"
    ? messages.filter((message) => message.role !== "system")
    : messages
}
