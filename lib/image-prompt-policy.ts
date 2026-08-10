/**
 * 이미지의 고정 그림체.
 *
 * 중요:
 * - "book cover style"이라고 표현하지 않는다.
 * - 표지의 레이아웃이 아니라 표지 일러스트의 렌더링 미감만 지정한다.
 * - scenePrompt 안에서는 그림체를 다시 지정하지 않는 것을 권장한다.
 */
export const IMAGE_DEFAULT_ART_STYLE = [
  "[ART DIRECTION]",
  "Apply the rendering language of a highly polished Korean romantic-fantasy illustration to a single illustrated story moment.",
  "Render the scene as a meticulously finished digital illustration with delicate, precise contour work, smooth luminous gradient shading, and a refined classic Korean romance-fantasy manhwa influence. The overall style should feel elegant, idealized, bright, delicate, and beautifully finished.",
  "Use graceful elongated adult silhouettes, idealized anatomy, refined facial rendering, and sophisticated emotional expression. Render smooth illustrated skin, delicately modeled facial planes, elegant eyelashes, expressive slightly enlarged eyes, softly defined natural lips, and silky hair composed of many fine flowing strands. Use polished edges around the characters and soft atmospheric blending in light, fabric, hair, and background depth.",
  "Use soft luminous highlights, restrained bloom, translucent light, warm ivory and champagne-toned illumination, subtle pastel undertones, and a delicately luxurious finish. Even in a night scene, keep the image rich, luminous, and visually elegant rather than dark or photographic.",
  "Do not create photorealism, live-action realism, coarse realism, realistic skin texture, harsh photographic shadows, plastic 3D CG, game-character rendering, flat anime coloring, simple cel shading, thick comic outlines, western fantasy concept-art rendering, or gritty cinematic realism.",

  "[CHARACTER IDEALIZATION]",
  "Both characters must look like premium Korean romance-fantasy protagonists rather than ordinary real people.",
  "Faces should be idealized, stylized, and exceptionally attractive rather than realistic or average-looking. Prioritize facial beauty above realism. Use highly harmonious facial proportions, elegant symmetry, refined jawlines, graceful noses, expressive eyes, balanced lips, and delicately perfected facial structure. The faces should look more illustrated and idealized than real people.",
  "The male character should be strikingly handsome, with a refined masculine facial structure, elegant jawline, straight nose, expressive almond-shaped dark eyes, strong brows, balanced lips, and clear smooth skin.",
  "The partner beneath him should also be exceptionally attractive, with refined facial harmony, elegant features, expressive eyes, delicate facial structure, and clear luminous illustrated skin.",
  "Use strongly idealized romantic-fantasy anatomy rather than realistic anatomy. Both characters should have elongated, elegant, protagonist-like body proportions: long legs, long forearms, long shins, graceful necks, slim waists, relatively small head-to-body proportions, and visually lengthened silhouettes.",
  "Avoid short limbs, compact proportions, stocky anatomy, short torsos, short forearms, short legs, or average realistic body proportions.",
].join("\n\n");

export const IMAGE_SCENE_SYSTEM_INSTRUCTION = [
  "Create exactly one production-ready English text-to-image prompt from the supplied private story context.",
  "Depict one specific story moment visibly happening now.",
  "Both characters MUST be described with exceptionally handsome and beautiful romance-fantasy protagonist faces, refined facial proportions, and elongated body proportions (e.g., long limbs, graceful necks, slim waists).",
  "Explicitly describe physical traits, clothing, hairstyle, posture, and facial expression for BOTH characters in the scene to ensure balanced description and prevent unrequested stock priors.",
  "Describe the fictional environment, lighting sources, composition, and visible story-relevant action.",
  "Translate dialogue and narrative emotion into visible physical action, posture, and expression.",
  "Return only scene-specific visible details. Do not include art-style labels or negative directives in the prompt body.",
].join(" ");

export const IMAGE_TEXT_NEGATIVE_PROMPT = [
  "photorealistic",
  "realistic person",
  "live action",
  "naturalistic face",
  "ordinary face",
  "average-looking face",
  "plain face",
  "coarse realism",
  "realistic facial structure",
  "awkward facial proportions",
  "asymmetrical face",
  "unattractive face",
  "malformed face",
  "flat expression",
  "small dull eyes",
  "distorted lips",
  "weak facial harmony",
  "bulky body",
  "stocky build",
  "compact body",
  "short limbs",
  "short arms",
  "short forearms",
  "short legs",
  "short shins",
  "short torso",
  "large head",
  "squat proportions",
  "stubby limbs",
  "realistic body proportions",
  "awkward anatomy",
  "compressed anatomy",
  "extreme foreshortening",
  "distorted pose",
  "messy overlap",
  "plastic 3d",
  "cg render",
  "game render",
  "doll-like materials",
  "flat anime coloring",
  "cel shading",
  "thick comic outlines",
  "gritty film realism",
  "poster",
  "cover",
  "title text",
  "typography",
  "logo",
  "frame",
  "wedding dress",
  "bridal veil",
  "tuxedo",
  "wedding portrait",

  // 이마 맞대기 및 천편일률적 포즈 클리셰 방지
  "forehead touching",
  "forehead to forehead",
  "touching foreheads",
  "head press pose",
  "generic forehead press",
  "touching faces",
  "face contact",
  "nose touching",
  "overlapping faces",
  "faces glued together",
  "cheeks touching",
  "extreme close-up",
  "tight face framing",
  "head press",
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
    artStyle.trim(),

    "[OUTPUT FORMAT]",
    "Create exactly one continuous full-bleed illustrated narrative scene.",
    "Show one naturally unfolding story moment inside the scene.",
    "Do not create a cover, poster, title area, character showcase, decorative border, ornamental frame, typography, logos, captions, seals, interface elements, or any graphic design layout.",

    "[COMPOSITION PRIORITIES]",
    "Use a flattering three-quarter side view or similarly elegant angle that preserves the readability of both characters and their body proportions.",
    "Maintain a clear visible physical space between their faces and heads; do not allow their foreheads, noses, or cheeks to touch or press together.",
    "Both faces must be completely separate, distinct, and clearly readable with space between them.",
    "Avoid extreme foreshortening, compressed perspective, awkward overlap, or camera angles that make the limbs look shortened.",
    "Keep the silhouettes readable and visually elongated. Prioritize clear body flow, elegant line of action, readable torso and waist structure, and graceful arm and leg proportions.",

    "[SCENE PRIORITIES]",
    "Depict the exact current story beat rather than reducing it to a generic romantic pose.",
    "Preserve the current relationship tension, physical closeness, posture, hand placement, gaze direction, facial tension, and emotional atmosphere. Emphasize the physical action and spatial relationship between the two characters through posture, forearm support, gaze, body weight, and the tension in the rumpled sheets.",

    "[CURRENT SCENE]",
    scene,

    "Render the entire scene as a single elegant illustrated story moment, with idealized proportions, beautifully attractive protagonist faces, and a refined luminous Korean romantic-fantasy finish.",
  ].join("\n\n");
}

