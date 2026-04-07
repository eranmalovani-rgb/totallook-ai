import { ENV } from "./env";

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
      console.warn(`[LLM] Failed to fetch image for base64 conversion: ${response.status} ${url.substring(0, 100)}`);
      return url; // fallback to original URL
    }
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const base64 = Buffer.from(buffer).toString("base64");
    console.log(`[LLM] Converted image to base64 (${Math.round(buffer.byteLength / 1024)}KB, ${contentType})`);
    return `data:${contentType};base64,${base64}`;
  } catch (err: any) {
    console.warn(`[LLM] Error converting image to base64: ${err.message}`);
    return url; // fallback to original URL
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
// Priority: OpenAI API key > Manus built-in forge API
// Read at runtime (not module load) so env is always fresh
const getOpenAIKey = () => (process.env.OPENAI_API_KEY ?? "").trim();

const getProvider = (): {
  apiUrl: string;
  apiKey: string;
  model: string;
  fallbackModel?: string;
  useThinking: boolean;
} => {
  const openaiKey = getOpenAIKey();
  // If user has their own OpenAI API key, use OpenAI directly
  if (openaiKey.length > 0) {
    console.log(`[LLM Provider] Using OpenAI (key length: ${openaiKey.length}, prefix: ${openaiKey.substring(0, 7)}...)`);
    return {
      apiUrl: "https://api.openai.com/v1/chat/completions",
      apiKey: openaiKey,
      model: "gpt-5.3-mini",
      fallbackModel: "gpt-4o",
      useThinking: false,
    };
  }

  // Fallback to Manus built-in forge API
  console.warn(`[LLM Provider] OPENAI_API_KEY not found (length: ${openaiKey.length}), falling back to Manus Forge`);
  const forgeUrl = ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

  return {
    apiUrl: forgeUrl,
    apiKey: ENV.forgeApiKey,
    model: "gpt-5.3-mini",
    fallbackModel: "gemini-2.5-flash",
    useThinking: false,
  };
};

function isModelAccessError(status: number, errorText: string): boolean {
  if (![400, 403, 404].includes(status)) return false;
  const lower = errorText.toLowerCase();
  return (
    lower.includes("model_not_found") ||
    lower.includes("does not exist") ||
    lower.includes("do not have access") ||
    lower.includes("you do not have access") ||
    lower.includes("invalid model")
  );
}

const assertApiKey = () => {
  const provider = getProvider();
  if (!provider.apiKey) {
    throw new Error("No LLM API key configured (OPENAI_API_KEY or BUILT_IN_FORGE_API_KEY)");
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
  console.log(`[LLM] Using provider: ${provider.model} (${provider.apiUrl.includes("openai") ? "OpenAI" : "Manus Forge"})`);

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

  // Unified default budget for text model responses
  payload.max_tokens = 16384;

  // Only add thinking config for Manus Forge (Gemini)
  if (provider.useThinking) {
    payload.thinking = {
      "budget_tokens": 8192
    };
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const modelsToTry = provider.fallbackModel
    ? [provider.model, provider.fallbackModel]
    : [provider.model];
  let lastError: Error | null = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    payload.model = model;

    const response = await fetch(provider.apiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      if (i > 0) {
        console.warn(`[LLM] Fallback model succeeded: ${model}`);
      }
      return (await response.json()) as InvokeResult;
    }

    const errorText = await response.text();
    const shouldFallback =
      i < modelsToTry.length - 1 && isModelAccessError(response.status, errorText);

    if (shouldFallback) {
      console.warn(
        `[LLM] Model '${model}' unavailable (${response.status}). Retrying with fallback '${modelsToTry[i + 1]}'`
      );
      continue;
    }

    lastError = new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
    break;
  }

  throw lastError || new Error("LLM invoke failed with unknown error");
}
