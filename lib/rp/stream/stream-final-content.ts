export function splitFinalContentForStream(content: string) {
  const paragraphs = content.split(/(\n+)/)
  const chunks: string[] = []

  for (const paragraph of paragraphs) {
    if (!paragraph) continue
    if (paragraph.length <= 80) {
      chunks.push(paragraph)
      continue
    }
    for (let index = 0; index < paragraph.length; index += 80) {
      chunks.push(paragraph.slice(index, index + 80))
    }
  }

  return chunks
}
