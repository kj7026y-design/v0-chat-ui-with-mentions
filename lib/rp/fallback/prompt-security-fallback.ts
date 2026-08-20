/** In-character response used when the model call is skipped entirely. */
export function buildPromptSecurityFallbackReply(
  input: string | { characterName: string } = "캐릭터",
) {
  const characterName = typeof input === "string" ? input : input.characterName
  return `${characterName}은 잠시 흐트러진 대화의 방향을 바로잡고, 눈앞의 장면으로 시선을 돌렸다.

"그 얘기는 여기서 넘어갈게. 지금 우리 사이에 실제로 벌어진 일부터 이어가자."

불필요한 설명을 덧붙이지 않은 채 현재 위치를 지켰다. 직전까지 확정된 상황을 바꾸거나 새로운 일을 꾸며 내지도 않았다.

"하던 이야기로 돌아와. 그다음은 거기서부터 듣지."

말을 마친 ${characterName}은 다른 신호를 기다리지 않고, 지금 장면에 필요한 반응만 남겼다.`
}
