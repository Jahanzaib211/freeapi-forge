import { errorLogger } from "./error_logger";

export interface ProxyMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DirectProxyParams {
  messages: ProxyMessage[];
  model: string;
  apiUrl: string;
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function directProxyChat(params: DirectProxyParams): Promise<ChatCompletionResponse> {
  const url = params.apiUrl.replace(/\/+$/, "") + "/v1/chat/completions";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      max_tokens: params.maxTokens || 1024,
      temperature: params.temperature || 0.7,
      stream: false,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    errorLogger.error("direct_proxy", `Request failed: ${response.status}`, undefined, {
      url, model: params.model, status: response.status
    });
    throw new Error(`Provider returned HTTP ${response.status}: ${errText}`);
  }

  return response.json();
}

export async function directProxyStream(params: DirectProxyParams): Promise<Response> {
  const url = params.apiUrl.replace(/\/+$/, "") + "/v1/chat/completions";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      max_tokens: params.maxTokens || 1024,
      temperature: params.temperature || 0.7,
      stream: true,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`Provider returned HTTP ${response.status}: ${errText}`);
  }

  return response;
}
