import { generateTextWithSelectedChatModel } from "@/lib/rp/pipeline";
import {
  IMAGE_TEXT_NEGATIVE_PROMPT,
  applyImageScenePolicy,
} from "@/lib/image-prompt-policy";

const DEFAULT_FAL_IMAGE_ENDPOINT = "https://queue.fal.run/fal-ai/flux/dev";
const DEFAULT_FAL_FALLBACK_IMAGE_ENDPOINT =
  "https://queue.fal.run/fal-ai/fast-sdxl";
const DEFAULT_FAL_IMAGE_TIMEOUT_MS = 90_000;
const DEFAULT_FAL_FALLBACK_TIMEOUT_MS = 30_000;
const MIN_FAL_TIMEOUT_MS = 1;
const MAX_FAL_TIMEOUT_MS = 120_000;
const MAX_MESSAGE_LENGTH = 20_000;
const MAX_HISTORY_ITEMS = 40;
const MAX_HISTORY_ITEM_LENGTH = 12_000;
const MAX_IMAGE_PROMPT_LENGTH = 2_000;

export const IMAGE_TRIGGER_PATTERN = /\[TRIGGER_IMG:\s*([\s\S]*?)\]/i;
const IMAGE_TRIGGER_GLOBAL_PATTERN = /\[TRIGGER_IMG:\s*[\s\S]*?\]/gi;

const HYBRID_SYSTEM_PROMPT = [
  "Reply naturally in the user's language and continue the supplied conversation.",
  "When an image would materially improve the response, append exactly one tag at the end in this format: [TRIGGER_IMG: concise English visual prompt].",
  "The visual prompt must describe the scene, subjects, composition, lighting, mood, and relevant appearance details in English.",
  "Do not mention or explain the tag. Do not emit the tag when an image is unnecessary.",
  "Any requested image must comply with the image provider's policies.",
].join(" ");

type HybridChatRole = "user" | "assistant";

interface HybridChatMessage {
  role: HybridChatRole;
  content: string;
}

export interface HybridChatRequest {
  message: string;
  chatHistory?: unknown;
  modelId?: string;
  selectedModelId?: string;
}

export interface HybridChatResult {
  text: string;
  image: string | null;
}

interface HybridChatDependencies {
  fetcher?: typeof fetch;
  env?: Partial<NodeJS.ProcessEnv>;
  textGenerator?: typeof generateTextWithSelectedChatModel;
}

interface FalImageDependencies {
  fetcher?: typeof fetch;
  env?: Partial<NodeJS.ProcessEnv>;
}

interface FalImageResponse {
  images?: Array<{ url?: string }>;
  image?: { url?: string };
}

interface FalQueueSubmission {
  request_id?: string;
  response_url?: string;
  status_url?: string;
  cancel_url?: string;
}

interface FalQueueStatus {
  status?: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";
  queue_position?: number;
  metrics?: {
    inference_time?: number;
  };
  logs?: Array<{
    message?: string;
    timestamp?: string;
  }>;
  error?: string;
  error_type?: string;
}

interface FalImageRequestOptions {
  endpoint: string;
  fallback: boolean;
  timeoutMs: number;
  enableSafetyChecker: boolean;
}

export interface FalGeneratedImage {
  imageUrl: string;
  model: string;
  provider: "fal";
  usedFallback: boolean;
}

export class HybridChatError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "HybridChatError";
  }
}

export function hasHybridChatRequestShape(
  value: unknown,
): value is HybridChatRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Object.prototype.hasOwnProperty.call(record, "message") &&
    !Object.prototype.hasOwnProperty.call(record, "messages")
  );
}

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeHistory(value: unknown): HybridChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(-MAX_HISTORY_ITEMS)
    .flatMap((item): HybridChatMessage[] => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const record = item as Record<string, unknown>;
      const content = normalizeText(record.content, MAX_HISTORY_ITEM_LENGTH);
      if (!content) return [];

      const role =
        record.role === "assistant" || record.type === "ai"
          ? "assistant"
          : record.role === "user" || record.type === "user"
            ? "user"
            : null;

      return role ? [{ role, content }] : [];
    });
}

function normalizeHybridRequest(body: HybridChatRequest) {
  const message = normalizeText(body.message, MAX_MESSAGE_LENGTH);
  if (!message) {
    throw new HybridChatError("message가 필요합니다.", 400);
  }

  return {
    message,
    chatHistory: normalizeHistory(body.chatHistory),
    modelId:
      normalizeText(body.modelId || body.selectedModelId, 100) || undefined,
  };
}

function normalizeTimeout(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(
    MAX_FAL_TIMEOUT_MS,
    Math.max(MIN_FAL_TIMEOUT_MS, Math.round(parsed)),
  );
}

async function getUpstreamErrorMessage(response: Response) {
  const raw = await response.text().catch(() => "");
  if (!raw) return `${response.status} ${response.statusText}`.trim();

  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: unknown } | string;
      detail?: unknown;
    };
    if (
      typeof parsed.error === "object" &&
      typeof parsed.error?.message === "string"
    ) {
      return parsed.error.message;
    }
    if (typeof parsed.error === "string") return parsed.error;
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch {
    // Preserve a short non-JSON provider response for diagnostics.
  }

  return raw.slice(0, 500);
}

async function fetchWithTimeout(
  fetcher: typeof fetch,
  input: string,
  init: RequestInit,
  timeoutMs: number,
  label: string,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetcher(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new HybridChatError(`${label} 응답 시간이 초과됐습니다.`, 504);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function getFalQueueEndpoint(endpoint: string) {
  const url = new URL(endpoint);
  if (url.hostname === "fal.run") url.hostname = "queue.fal.run";
  url.pathname = url.pathname.replace(/\/+$/u, "");
  url.search = "";
  url.hash = "";
  return url.toString();
}

function getTrustedQueueOperationUrl(
  value: unknown,
  queueEndpoint: string,
  label: string,
) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Fal.ai Queue가 ${label} URL을 반환하지 않았습니다.`);
  }

  const operationUrl = new URL(value);
  const endpointUrl = new URL(queueEndpoint);
  if (
    operationUrl.protocol !== "https:" ||
    operationUrl.origin !== endpointUrl.origin
  ) {
    throw new Error(
      `Fal.ai Queue가 올바르지 않은 ${label} URL을 반환했습니다.`,
    );
  }
  return operationUrl.toString();
}

function getRemainingTimeout(deadline: number, label: string) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) {
    throw new HybridChatError(`${label} 응답 시간이 초과됐습니다.`, 504);
  }
  return remaining;
}

async function waitForQueuePoll(deadline: number, label: string) {
  const delayMs = Math.min(500, getRemainingTimeout(deadline, label));
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function cancelFalQueueRequest(
  fetcher: typeof fetch,
  cancelUrl: string | null,
  apiKey: string,
) {
  if (!cancelUrl) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);
  try {
    const response = await fetcher(cancelUrl, {
      method: "PUT",
      headers: { Authorization: `Key ${apiKey}` },
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    // Cancellation is best-effort; preserve the original generation error.
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function extractImageTrigger(aiText: string) {
  const match = aiText.match(IMAGE_TRIGGER_PATTERN);
  const imagePrompt = match
    ? normalizeText(match[1], MAX_IMAGE_PROMPT_LENGTH)
    : "";
  const text = aiText
    .replace(IMAGE_TRIGGER_GLOBAL_PATTERN, "")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();

  return {
    text,
    imagePrompt: imagePrompt || null,
  };
}

function buildFalImageRequestBody(
  endpoint: string,
  prompt: string,
  fallback: boolean,
  enableSafetyChecker: boolean,
) {
  const usesFastSdxlSchema = /\/fast-sdxl\/?$/u.test(endpoint);
  const usesFluxDevSchema = /\/flux\/dev\/?$/u.test(endpoint);
  const tuning = fallback
    ? {
        num_inference_steps: 4,
        guidance_scale: 1.75,
      }
    : usesFluxDevSchema
      ? {
          num_inference_steps: 28,
          guidance_scale: 3.5,
          acceleration: "none",
        }
      : {
          num_inference_steps: 25,
          guidance_scale: 3.5,
        };

  return {
    prompt,
    image_size: "square_hd",
    num_images: 1,
    ...tuning,
    enable_safety_checker: enableSafetyChecker,
    ...(usesFastSdxlSchema
      ? { negative_prompt: IMAGE_TEXT_NEGATIVE_PROMPT }
      : {}),
    ...(usesFastSdxlSchema ? { format: "jpeg" } : { output_format: "jpeg" }),
  };
}

function getFalModelName(endpoint: string) {
  try {
    return new URL(endpoint).pathname.replace(/^\/+|\/+$/gu, "");
  } catch {
    return endpoint;
  }
}

async function requestFalImage(
  imagePrompt: string,
  fetcher: typeof fetch,
  apiKey: string,
  options: FalImageRequestOptions,
) {
  const prompt = applyImageScenePolicy(imagePrompt);
  const label = options.fallback ? "Fal.ai 폴백 모델" : "Fal.ai 메인 모델";
  const queueEndpoint = getFalQueueEndpoint(options.endpoint);
  const startedAt = Date.now();
  const deadline = Date.now() + options.timeoutMs;
  let cancelUrl: string | null = null;
  let requestId: string | null = null;
  let lastStatus: FalQueueStatus["status"] | null = null;
  let lastQueuePosition: number | null = null;
  let pollCount = 0;
  let lastProgressLogAt = 0;

  try {
    console.info("[Fal queue submit started]", {
      label,
      endpoint: queueEndpoint,
      timeoutMs: options.timeoutMs,
      promptChars: prompt.length,
      fallback: options.fallback,
      enableSafetyChecker: options.enableSafetyChecker,
    });
    const submitResponse = await fetchWithTimeout(
      fetcher,
      queueEndpoint,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          buildFalImageRequestBody(
            options.endpoint,
            prompt,
            options.fallback,
            options.enableSafetyChecker,
          ),
        ),
      },
      getRemainingTimeout(deadline, label),
      label,
    );
    if (!submitResponse.ok) {
      const detail = await getUpstreamErrorMessage(submitResponse);
      throw new Error(
        `Fal.ai ${options.fallback ? "폴백" : "메인"} 모델 Queue 제출에 실패했습니다: ${detail}`,
      );
    }

    const submission = (await submitResponse
      .json()
      .catch(() => null)) as FalQueueSubmission | null;
    requestId = submission?.request_id?.trim() || null;
    const trustedStatusUrl = getTrustedQueueOperationUrl(
      submission?.status_url,
      queueEndpoint,
      "상태 조회",
    );
    const statusUrlObject = new URL(trustedStatusUrl);
    statusUrlObject.searchParams.set("logs", "1");
    const statusUrl = statusUrlObject.toString();
    const responseUrl = getTrustedQueueOperationUrl(
      submission?.response_url,
      queueEndpoint,
      "결과 조회",
    );
    cancelUrl = getTrustedQueueOperationUrl(
      submission?.cancel_url,
      queueEndpoint,
      "취소",
    );
    console.info("[Fal queue submitted]", {
      label,
      requestId,
      elapsedMs: Date.now() - startedAt,
      fallback: options.fallback,
    });

    while (true) {
      const statusResponse = await fetchWithTimeout(
        fetcher,
        statusUrl,
        {
          method: "GET",
          headers: { Authorization: `Key ${apiKey}` },
        },
        getRemainingTimeout(deadline, label),
        label,
      );
      if (!statusResponse.ok) {
        const detail = await getUpstreamErrorMessage(statusResponse);
        throw new Error(`Fal.ai Queue 상태 조회에 실패했습니다: ${detail}`);
      }

      const status = (await statusResponse
        .json()
        .catch(() => null)) as FalQueueStatus | null;
      pollCount += 1;
      const now = Date.now();
      const statusChanged = status?.status !== lastStatus;
      const queuePositionChanged =
        typeof status?.queue_position === "number" &&
        status.queue_position !== lastQueuePosition;
      const shouldLogProgress =
        statusChanged ||
        queuePositionChanged ||
        now - lastProgressLogAt >= 10_000;
      if (shouldLogProgress) {
        console.info("[Fal queue status]", {
          label,
          requestId,
          status: status?.status || "UNKNOWN",
          queuePosition: status?.queue_position,
          pollCount,
          elapsedMs: now - startedAt,
          remainingMs: Math.max(0, deadline - now),
          inferenceTimeSeconds: status?.metrics?.inference_time,
          latestProviderLog: status?.logs?.at(-1)?.message,
          fallback: options.fallback,
        });
        lastProgressLogAt = now;
      }
      lastStatus = status?.status || null;
      lastQueuePosition =
        typeof status?.queue_position === "number"
          ? status.queue_position
          : lastQueuePosition;
      if (status?.status === "COMPLETED") {
        if (status.error) {
          throw new Error(
            `Fal.ai ${options.fallback ? "폴백" : "메인"} 모델 생성에 실패했습니다: ${status.error}`,
          );
        }
        break;
      }
      if (status?.status !== "IN_QUEUE" && status?.status !== "IN_PROGRESS") {
        throw new Error("Fal.ai Queue가 알 수 없는 상태를 반환했습니다.");
      }
      await waitForQueuePoll(deadline, label);
    }

    const resultResponse = await fetchWithTimeout(
      fetcher,
      responseUrl,
      {
        method: "GET",
        headers: { Authorization: `Key ${apiKey}` },
      },
      getRemainingTimeout(deadline, label),
      label,
    );
    if (!resultResponse.ok) {
      const detail = await getUpstreamErrorMessage(resultResponse);
      throw new Error(`Fal.ai Queue 결과 조회에 실패했습니다: ${detail}`);
    }

    const data = (await resultResponse
      .json()
      .catch(() => null)) as FalImageResponse | null;
    const imageUrl =
      data?.images?.find((image) => Boolean(image.url))?.url ||
      data?.image?.url;
    if (!imageUrl) {
      throw new Error("Fal.ai가 이미지 URL을 반환하지 않았습니다.");
    }
    console.info("[Fal queue image completed]", {
      label,
      requestId,
      model: getFalModelName(options.endpoint),
      pollCount,
      elapsedMs: Date.now() - startedAt,
      fallback: options.fallback,
    });
    return {
      imageUrl,
      model: getFalModelName(options.endpoint),
      provider: "fal" as const,
      usedFallback: options.fallback,
    };
  } catch (error) {
    const cancelled = await cancelFalQueueRequest(fetcher, cancelUrl, apiKey);
    console.warn("[Fal queue request failed]", {
      label,
      requestId,
      endpoint: queueEndpoint,
      timeoutMs: options.timeoutMs,
      elapsedMs: Date.now() - startedAt,
      lastStatus,
      lastQueuePosition,
      pollCount,
      cancelled,
      fallback: options.fallback,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function generateFalImageFromPrompt(
  imagePrompt: string,
  dependencies: FalImageDependencies = {},
): Promise<FalGeneratedImage> {
  const fetcher = dependencies.fetcher || fetch;
  const env = dependencies.env || process.env;
  const apiKey = env.FAL_KEY?.trim();
  if (!apiKey) {
    throw new Error("FAL_KEY가 설정되어 있지 않습니다.");
  }

  const mainOptions: FalImageRequestOptions = {
    endpoint: env.FAL_IMAGE_ENDPOINT?.trim() || DEFAULT_FAL_IMAGE_ENDPOINT,
    fallback: false,
    timeoutMs: normalizeTimeout(
      env.FAL_IMAGE_TIMEOUT_MS,
      DEFAULT_FAL_IMAGE_TIMEOUT_MS,
    ),
    enableSafetyChecker: false,
  };
  const fallbackOptions: FalImageRequestOptions = {
    endpoint:
      env.FAL_FALLBACK_IMAGE_ENDPOINT?.trim() ||
      DEFAULT_FAL_FALLBACK_IMAGE_ENDPOINT,
    fallback: true,
    timeoutMs: normalizeTimeout(
      env.FAL_FALLBACK_TIMEOUT_MS,
      DEFAULT_FAL_FALLBACK_TIMEOUT_MS,
    ),
    enableSafetyChecker: false,
  };

  try {
    return await requestFalImage(imagePrompt, fetcher, apiKey, mainOptions);
  } catch (mainError) {
    console.warn("[hybrid chat main image generation failed; using fallback]", {
      endpoint: mainOptions.endpoint,
      timeoutMs: mainOptions.timeoutMs,
      fallbackEndpoint: fallbackOptions.endpoint,
      fallbackTimeoutMs: fallbackOptions.timeoutMs,
      errorName: mainError instanceof Error ? mainError.name : typeof mainError,
      errorMessage:
        mainError instanceof Error ? mainError.message : String(mainError),
    });
  }

  return requestFalImage(imagePrompt, fetcher, apiKey, fallbackOptions);
}

export async function runHybridChat(
  body: HybridChatRequest,
  dependencies: HybridChatDependencies = {},
): Promise<HybridChatResult> {
  const { message, chatHistory, modelId } = normalizeHybridRequest(body);
  const fetcher = dependencies.fetcher || fetch;
  const env = dependencies.env || process.env;
  const textGenerator =
    dependencies.textGenerator || generateTextWithSelectedChatModel;
  const generatedText = await textGenerator({
    modelId,
    messages: [
      { role: "system", content: HYBRID_SYSTEM_PROMPT },
      ...chatHistory,
      { role: "user", content: message },
    ],
  });
  const aiText = generatedText.content;
  const { text, imagePrompt } = extractImageTrigger(aiText);

  if (!imagePrompt) {
    return { text, image: null };
  }

  try {
    const generatedImage = await generateFalImageFromPrompt(imagePrompt, {
      fetcher,
      env,
    });
    return { text, image: generatedImage.imageUrl };
  } catch (error) {
    console.error(
      "[hybrid chat image generation failed]",
      error instanceof Error ? error.message : error,
    );
    return { text, image: null };
  }
}
