export const IMAGE_SCENE_SYSTEM_INSTRUCTION = [
  "Generate exactly one full-bleed cinematic narrative scene from the supplied private story context.",
  "Show only the fictional world, characters, objects, lighting, and action.",
  "Do not create a character introduction, character sheet, profile card, poster, title card, book cover, infographic, social-media post, chat screen, or any other graphic-design layout.",
  "Never render visible text of any kind, including names, biographies, titles, captions, labels, subtitles, speech bubbles, dialogue, letters, numbers, signs, logos, signatures, or watermarks in any language.",
  "If the context contains dialogue or written information, communicate its meaning only through composition, facial expression, body language, action, and environmental detail.",
].join(" ")

export const IMAGE_TEXT_NEGATIVE_PROMPT = [
  "text",
  "typography",
  "letters",
  "words",
  "numbers",
  "Hangul text",
  "Hangul glyphs",
  "Latin alphabet text",
  "Latin alphabet glyphs",
  "Japanese writing",
  "kana glyphs",
  "kanji glyphs",
  "Chinese writing",
  "hanzi glyphs",
  "name",
  "biography",
  "character introduction",
  "character sheet",
  "profile card",
  "poster",
  "title card",
  "book cover",
  "caption",
  "subtitle",
  "label",
  "speech bubble",
  "dialogue",
  "signage",
  "logo",
  "signature",
  "watermark",
  "social media interface",
  "chat interface",
].join(", ")

export function applyImageScenePolicy(scenePrompt: string) {
  return [
    "FULL-BLEED NARRATIVE SCENE ONLY.",
    "The following description is private production context. Never copy, transcribe, quote, label, or display any of its words in the image.",
    scenePrompt.trim(),
    "FINAL OUTPUT CONSTRAINT: Depict the moment as a natural scene with no graphic-design layout and zero visible writing, symbols used as writing, captions, names, titles, labels, signs, subtitles, speech bubbles, logos, or watermarks.",
    `AVOID THESE VISUAL ELEMENTS: ${IMAGE_TEXT_NEGATIVE_PROMPT}.`,
  ].join("\n\n")
}
