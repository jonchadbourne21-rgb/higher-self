import { ENV } from "./env";
import Anthropic from "@anthropic-ai/sdk";

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
  model?: "sonnet" | "haiku"; // Route to Claude Sonnet or Haiku
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

const getModelName = (modelType?: "sonnet" | "haiku"): string => {
  if (modelType === "haiku") {
    return "claude-haiku-4-5-20251001";
  }
  // Default to Sonnet for user-facing features
  return "claude-sonnet-4-6";
};

const assertApiKey = () => {
  if (!ENV.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    maxTokens,
    max_tokens,
  } = params;

  const client = new Anthropic({
    apiKey: ENV.anthropicApiKey,
  });

  const modelName = getModelName(model);
  const maxTokensValue = maxTokens || max_tokens || 4096;

  // Convert messages to Anthropic format
  const anthropicMessages = messages
    .filter(msg => msg.role !== "system")
    .map(msg => {
      const normalized = normalizeMessage(msg);
      return {
        role: normalized.role === "user" ? "user" : "assistant",
        content: normalized.content as string,
      };
    });

  // Extract system message if present
  const systemMessage = messages.find(msg => msg.role === "system");
  const systemPrompt = systemMessage
    ? typeof systemMessage.content === "string"
      ? systemMessage.content
      : JSON.stringify(systemMessage.content)
    : undefined;

  // Prepare response format for Anthropic
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  // Build request payload
  const requestPayload: Record<string, unknown> = {
    model: modelName,
    max_tokens: maxTokensValue,
    messages: anthropicMessages,
  };

  if (systemPrompt) {
    requestPayload.system = systemPrompt;
  }

  // Handle JSON schema response format
  if (normalizedResponseFormat?.type === "json_schema") {
    requestPayload.response_format = {
      type: "json_schema",
      json_schema: {
        name: normalizedResponseFormat.json_schema.name,
        schema: normalizedResponseFormat.json_schema.schema,
        strict: normalizedResponseFormat.json_schema.strict ?? true,
      },
    };
  } else if (normalizedResponseFormat?.type === "json_object") {
    requestPayload.response_format = {
      type: "json",
    };
  }

  // Handle tools if provided
  if (tools && tools.length > 0) {
    requestPayload.tools = tools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description || "",
      input_schema: tool.function.parameters || {},
    }));

    const normalizedToolChoice = normalizeToolChoice(
      toolChoice || tool_choice,
      tools
    );

    if (normalizedToolChoice && normalizedToolChoice !== "none" && normalizedToolChoice !== "auto") {
      requestPayload.tool_choice = {
        type: "tool",
        name: normalizedToolChoice.function.name,
      };
    }
  }

  try {
    const response = await (client.messages.create as any)(requestPayload);

    // Transform Anthropic response to InvokeResult format
    const responseData = response as any;
    const content = responseData.content?.[0];
    let messageContent = "";
    let toolCalls: ToolCall[] | undefined;

    if (content?.type === "text") {
      messageContent = content.text;
    } else if (content?.type === "tool_use") {
      toolCalls = [{
        id: content.id,
        type: "function",
        function: {
          name: content.name,
          arguments: typeof content.input === "string" ? content.input : JSON.stringify(content.input),
        },
      }];
      messageContent = "";
    }

    return {
      id: responseData.id,
      created: Math.floor(Date.now() / 1000),
      model: responseData.model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: messageContent,
            tool_calls: toolCalls,
          },
          finish_reason: responseData.stop_reason === "end_turn" ? "stop" : responseData.stop_reason || null,
        },
      ],
      usage: {
        prompt_tokens: responseData.usage?.input_tokens || 0,
        completion_tokens: responseData.usage?.output_tokens || 0,
        total_tokens: (responseData.usage?.input_tokens || 0) + (responseData.usage?.output_tokens || 0),
      },
    };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new Error(
        `LLM invoke failed: ${error.status} ${error.message}`
      );
    }
    throw error;
  }
}
