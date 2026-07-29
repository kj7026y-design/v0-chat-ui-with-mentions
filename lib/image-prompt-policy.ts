/**
 * 이미지의 고정 그림체.
 *
 * 중요:
 * - "book cover style"이라고 표현하지 않는다.
 * - 표지의 레이아웃이 아니라 표지 일러스트의 렌더링 미감만 지정한다.
 * - scenePrompt 안에서는 그림체를 다시 지정하지 않는 것을 권장한다.
 */
export const IMAGE_DEFAULT_ART_STYLE = [
  "Apply the visual rendering language of premium Korean commercial romance illustration to a natural narrative scene.",
  "Use polished painterly realism with idealized beauty, realistic adult anatomy, elegant Korean facial features, and emotionally expressive eyes.",
  "Render the characters as meticulously painted digital illustrations rather than photographs, animation, webtoon drawings, or 3D models.",
  "Use softly painted skin with natural tonal variation, refined facial planes, delicate highlights, detailed flowing hair, elegant silhouettes, and sophisticated fabric rendering.",
  "Faces should be exceptionally attractive and harmoniously proportioned while retaining believable human structure and mature adult features.",
  "Use luminous, romantic lighting, controlled contrast, rich but refined colors, and graceful cinematic depth.",
  "Maintain clean, sophisticated commercial illustration quality with a sensual and emotionally immersive atmosphere.",
  "The finished image should resemble premium Korean romance key artwork placed inside an actual story moment, without any cover typography, poster composition, decorative framing, or graphic-design layout.",
].join(" ");

export const IMAGE_SCENE_SYSTEM_INSTRUCTION = [
  "Generate exactly one full-bleed illustrated narrative scene from the supplied private story context.",
  "Depict one specific story moment visibly happening now rather than a generic pose or mood image.",
  "Show only the fictional world, characters, physical objects, lighting, expressions, body language, and visible action.",
  "Apply the supplied art-style instruction consistently to the characters, environment, lighting, and all visible objects.",
  "Prioritize beautiful and clearly readable faces, emotionally precise expressions, relationship dynamics, and story-relevant physical action.",
  "Preserve continuity with the supplied character appearance, relationship state, location, previous story beat, and current action.",
  "Use cinematic composition only for framing, depth, and visual storytelling; do not interpret cinematic as live-action photography or a movie screenshot.",
  "Treat references to Korean romance artwork strictly as rendering and beauty-direction guidance, never as instructions to create a book cover, poster, title card, or designed layout.",
  "Do not create a character introduction, character sheet, profile card, poster, title card, book cover, infographic, social-media post, chat screen, or any other graphic-design layout.",
  "Never render visible text of any kind, including names, biographies, titles, captions, labels, subtitles, speech bubbles, dialogue, letters, numbers, signs, logos, signatures, or watermarks in any language.",
  "If the context contains dialogue or written information, communicate its meaning only through visible action, facial expression, body language, composition, and environmental detail.",
].join(" ");

export const IMAGE_TEXT_NEGATIVE_PROMPT = [
  // 텍스트 및 레이아웃
  "text",
  "typography",
  "letters",
  "words",
  "numbers",
  "Hangul glyphs",
  "Latin alphabet glyphs",
  "kana glyphs",
  "kanji glyphs",
  "hanzi glyphs",
  "caption",
  "subtitle",
  "label",
  "speech bubble",
  "dialogue text",
  "signage",
  "logo",
  "signature",
  "watermark",
  "social media interface",
  "chat interface",
  "character sheet",
  "profile card",
  "poster layout",
  "title card",
  "book cover layout",
  "graphic design layout",
  "decorative frame",
  "split panel",
  "collage",

  // 원하지 않는 렌더링 방식
  "live-action photograph",
  "movie screenshot",
  "documentary photography",
  "raw photography",
  "flat webtoon drawing",
  "comic line art",
  "anime style",
  "cel shading",
  "chibi",
  "plastic 3D render",
  "game character render",
  "doll-like face",
  "wax figure",
  "uncanny photorealism",

  // 품질 문제
  "underexposed face",
  "face hidden in shadow",
  "facial silhouette",
  "crushed blacks",
  "muddy shadows",
  "harsh overhead shadow",
  "orange color cast",
  "plastic skin",
  "waxy skin",
  "distorted face",
  "asymmetrical eyes",
  "deformed hands",
  "extra fingers",
  "fused fingers",
  "extra limbs",
].join(", ");

export function applyImageScenePolicy(
  scenePrompt: string,
  artStyle: string = IMAGE_DEFAULT_ART_STYLE,
) {
  const scene = scenePrompt.trim();

  if (!scene) {
    throw new Error("scenePrompt must not be empty.");
  }

  return [
    "[ART DIRECTION]",
    artStyle.trim(),

    "[OUTPUT FORMAT]",
    "Create exactly one continuous full-bleed illustrated narrative scene.",
    "Show a naturally occurring moment inside the story, not a cover, poster, character showcase, promotional portrait, or designed composition.",
    "Do not render text, borders, panels, decorative framing, or interface elements.",

    "[STORY PRIORITIES]",
    "Depict the exact current story beat rather than reducing the prompt to a generic romantic mood.",
    "Preserve the supplied character identities, physical appearance, relationship progression, location, and immediately preceding context.",
    "Express the scene through specific visible behavior: gaze direction, facial tension, hand placement, posture, physical distance, environmental interaction, and active movement.",

    "[VISUAL PRIORITIES]",
    "Keep the main characters' faces aesthetically refined, emotionally readable, and clearly illuminated.",
    "Prioritize polished painterly illustration, idealized beauty, and expressive character rendering over photographic realism.",
    "Use cinematic framing and depth without producing a live-action movie still.",
    "Keep the environment coherent and immersive, but subordinate it to the current character interaction.",
    "Dark scenes must retain luminous skin tones, visible eyes, readable expressions, and controlled shadow detail.",

    "[CURRENT SCENE]",
    scene,
  ].join("\n\n");
}
