/**
 * 이미지의 고정 그림체.
 *
 * 중요:
 * - "book cover style"이라고 표현하지 않는다.
 * - 표지의 레이아웃이 아니라 표지 일러스트의 렌더링 미감만 지정한다.
 * - scenePrompt 안에서는 그림체를 다시 지정하지 않는 것을 권장한다.
 */
export const IMAGE_DEFAULT_ART_STYLE = [
  "Apply the rendering language of an ornate, high-gloss Korean romantic-fantasy illustration to a natural narrative scene.",
  "Render the entire scene as a meticulously finished digital illustration with delicate, precise contour work and smooth airbrushed gradient shading.",
  "Use an elegant Korean romance-fantasy manhwa influence: graceful elongated adult silhouettes, refined facial rendering, sophisticated expressions, and beautifully controlled anatomy.",
  "Render clear luminous skin with soft blush, finely modeled facial planes, delicate eyelashes, jewel-like eyes, glossy lips, and silky hair composed of many flowing individual strands.",
  "Use clean, polished edges around the characters, with soft atmospheric blending in light, fabric, hair, and background depth.",
  "Render clothing, folds, lace, jewelry, glass, metal, marble, and interior materials with intricate decorative detail and luxurious surface highlights.",
  "Use pearlescent highlights, soft bloom, translucent light, champagne-gold and ivory illumination, restrained pastel accents, and selective jewel-like sparkle effects.",
  "Maintain a bright, delicate, romantic, and lavish finish even when the scene takes place at night.",
  "The result must look like a highly polished classic Korean romantic-fantasy webnovel illustration, not like a photograph, movie frame, modern game render, or flat animation.",
  "Apply only this rendering language to the actual story scene.",
  "Do not reproduce a book-cover layout, title area, decorative border, ornamental frame, typography, promotional composition, or character showcase.",
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

export const IMAGE_STYLE_EXCLUSIONS = [
  "Do not use photorealism or live-action photography.",
  "Do not use semi-realistic 2.5D rendering.",
  "Do not use plastic 3D CG, game-character rendering, or doll-like materials.",
  "Do not use rough painterly brushwork, western fantasy concept art, or matte painting.",
  "Do not use flat webtoon coloring, heavy comic outlines, simple cel shading, or generic modern anime rendering.",
  "Do not use muted movie color grading, realistic skin pores, harsh photographic shadows, or gritty film texture.",
].join(" ");

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
    IMAGE_STYLE_EXCLUSIONS,

    "[OUTPUT FORMAT]",
    "Create exactly one continuous full-bleed illustrated narrative scene.",
    "Show a naturally occurring moment inside the story.",
    "Do not create a cover, poster, title area, character showcase, decorative frame, promotional portrait, or designed layout.",
    "Do not render text, borders, panels, typography, logos, captions, or interface elements.",

    "[STORY PRIORITIES]",
    "Depict the exact current story beat rather than reducing it to a generic romantic pose.",
    "Preserve the supplied character identities, appearance, relationship progression, location, previous story context, and current action.",
    "Express the event through visible posture, hand placement, gaze direction, facial tension, physical distance, environmental contact, and active movement.",

    "[VISUAL PRIORITIES]",
    "Use the supplied art direction consistently across the characters, clothing, environment, lighting, and all visible objects.",
    "Preserve the ornate, luminous, high-gloss illustration finish without adding a cover layout.",
    "Keep faces and actions clearly readable.",
    "Night scenes must remain rich and luminous rather than becoming dark, photographic, or underexposed.",
    "Prioritize the current physical action and spatial relationship over a generic close-up of two faces.",

    "[CURRENT SCENE]",
    scene,
  ].join("\n\n");
}

