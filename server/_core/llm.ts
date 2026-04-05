import { ENV } from "./env";
import sharp from "sharp";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const MIN_IMAGE_DIMENSION = 32;
const MIN_IMAGE_BYTES_FOR_SMALL_IMAGES = 2 * 1024;
const SMALL_IMAGE_DIMENSION_THRESHOLD = 128;
const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const FORMAT_TO_MIME: Record<string, string> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function invalidImageError(message: string): Error {
  return new Error(`INVALID_IMAGE_INPUT: ${message}`);
}

async function normalizeImageForOpenAI(
  rawBuffer: Buffer,
  sourceContentType: string | null
): Promise<{
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  reencoded: boolean;
}> {
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(rawBuffer, { failOn: "error" }).metadata();
  } catch {
    throw invalidImageError(
      "The uploaded image could not be decoded. Please upload a clear JPG/PNG/WebP photo."
    );
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
    throw invalidImageError(
      `Image resolution is too small (${width}x${height}). Minimum supported size is ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION}.`
    );
  }

  const rawMimeType = (sourceContentType ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const detectedMimeType = metadata.format
    ? FORMAT_TO_MIME[metadata.format.toLowerCase()]
    : undefined;

  let buffer = rawBuffer;
  let mimeType =
    (rawMimeType && SUPPORTED_IMAGE_MIME_TYPES.has(rawMimeType) && rawMimeType) ||
    (detectedMimeType && SUPPORTED_IMAGE_MIME_TYPES.has(detectedMimeType)
      ? detectedMimeType
      : "image/jpeg");
  let reencoded = false;

  // Harden image handling for OpenAI:
  // - re-encode unsupported/ambiguous formats
  // - re-encode tiny images that often fail model-side validation
  const shouldReencode =
    !SUPPORTED_IMAGE_MIME_TYPES.has(rawMimeType) ||
    !detectedMimeType ||
    !SUPPORTED_IMAGE_MIME_TYPES.has(detectedMimeType) ||
    rawBuffer.byteLength < MIN_IMAGE_BYTES_FOR_SMALL_IMAGES;

  if (shouldReencode) {
    try {
      buffer = await sharp(rawBuffer)
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();
      mimeType = "image/jpeg";
      reencoded = true;
    } catch {
      throw invalidImageError(
        "Image preprocessing failed. Please upload a standard JPG/PNG/WebP image."
      );
    }
  }

  if (
    buffer.byteLength < MIN_IMAGE_BYTES_FOR_SMALL_IMAGES &&
    (width < SMALL_IMAGE_DIMENSION_THRESHOLD ||
      height < SMALL_IMAGE_DIMENSION_THRESHOLD)
  ) {
    throw invalidImageError(
      `Image file is too small (${buffer.byteLength} bytes). Upload a clearer JPG/PNG/WebP photo.`
    );
  }

  return { buffer, mimeType, width, height, reencoded };
}

/**
 * Convert an image URL to a base64 data URI.
 * OpenAI cannot access S3/CloudFront URLs from the production environment,
 * so we download the image server-side and send it inline as base64.
 */
async function imageUrlToBase64(url: string): Promise<string> {
  // Already a data URI — pass through
  if (url.startsWith("data:")) return url;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw invalidImageError(
        `Failed to download image (${response.status}). Please upload a new image and try again.`
      );
    }

    const rawBuffer = Buffer.from(await response.arrayBuffer());
    const normalized = await normalizeImageForOpenAI(
      rawBuffer,
      response.headers.get("content-type")
    );
    const base64 = normalized.buffer.toString("base64");
    console.log(
      `[LLM] Converted image to base64 (${Math.round(normalized.buffer.byteLength / 1024)}KB, ${normalized.mimeType}, ${normalized.width}x${normalized.height}, reencoded=${normalized.reencoded})`
    );
    return `data:${normalized.mimeType};base64,${base64}`;
  } catch (err: any) {
    if (String(err?.message || "").includes("INVALID_IMAGE_INPUT")) {
      throw err;
    }
    console.warn(`[LLM] Error converting image to base64: ${err.message}`);
    throw invalidImageError(
      "Unable to preprocess image for AI analysis. Please upload a clear JPG/PNG/WebP photo."
    );
  }
}

/**
 * Process all messages: convert image_url parts to base64 data URIs
 * when using OpenAI provider (since OpenAI can't access our S3 URLs).
 */
async function convertImagesToBase64(messages: any[]): Promise<any[]> {
  const result = [];
  for (const msg of messages) {
    if (!msg.content || typeof msg.content === "string") {
      result.push(msg);
      continue;
    }
    if (Array.isArray(msg.content)) {
      const newContent = [];
      for (const part of msg.content) {
        if (part.type === "image_url" && part.image_url?.url) {
          const base64Url = await imageUrlToBase64(part.image_url.url);
          newContent.push({
            ...part,
            image_url: { ...part.image_url, url: base64Url },
          });
        } else {
          newContent.push(part);
        }
      }
      result.push({ ...msg, content: newContent });
    } else {
      result.push(msg);
    }
  }
  return result;
}

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

// --- Provider resolution ---
// Railway: Only OpenAI is supported. Set OPENAI_API_KEY env var.
// Read at runtime (not module load) so env is always fresh
const getOpenAIKey = () => (process.env.OPENAI_API_KEY ?? "").trim();

const getProvider = (): { apiUrl: string; apiKey: string; model: string; useThinking: boolean } => {
  const openaiKey = getOpenAIKey();
  // If user has their own OpenAI API key, use OpenAI directly
  if (openaiKey.length > 0) {
    console.log(`[LLM Provider] Using OpenAI (key length: ${openaiKey.length}, prefix: ${openaiKey.substring(0, 7)}...)`);
    return {
      apiUrl: "https://api.openai.com/v1/chat/completions",
      apiKey: openaiKey,
      model: "gpt-4o",
      useThinking: false,
    };
  }

  // No OpenAI key configured
  console.error(`[LLM Provider] OPENAI_API_KEY not found! AI features will not work.`);
  return {
    apiUrl: "https://api.openai.com/v1/chat/completions",
    apiKey: "",
    model: "gpt-4o",
    useThinking: false,
  };
};

const assertApiKey = () => {
  const provider = getProvider();
  if (!provider.apiKey) {
    throw new Error("No LLM API key configured. Set OPENAI_API_KEY environment variable.");
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const provider = getProvider();
  console.log(`[LLM] Using provider: ${provider.model} (OpenAI)`);

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  let normalizedMessages = messages.map(normalizeMessage);

  // When using OpenAI, convert image URLs to base64 data URIs
  // because OpenAI cannot access our S3/CloudFront image URLs from production
  const isOpenAI = provider.apiUrl.includes("openai");
  if (isOpenAI) {
    console.log("[LLM] Converting image URLs to base64 for OpenAI...");
    normalizedMessages = await convertImagesToBase64(normalizedMessages);
  }

  const payload: Record<string, unknown> = {
    model: provider.model,
    messages: normalizedMessages,
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  // Set max_tokens — OpenAI GPT-4o supports up to 16384 output tokens
  payload.max_tokens = 16384;

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = await fetch(provider.apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}
