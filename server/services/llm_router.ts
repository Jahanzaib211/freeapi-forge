import axios from "axios";
import { providerService } from "./provider_service";
import { errorLogger } from "./error_logger";
import { localModelManager } from "./local_model_manager";
import { getModelForTask } from "../_core/model-registry";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionRequest {
  messages: ChatMessage[];
  taskType?: "chat" | "coding" | "vision" | "fast" | "long_context" | "local";
  maxTokens?: number;
  temperature?: number;
  teamId?: string;
  tenantId?: number;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  provider: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LLMRouter {
  private litellmUrl: string;
  private litellmApiKey: string;

  constructor() {
    this.litellmUrl = process.env.LITELLM_URL || "http://localhost:5050";
    this.litellmApiKey = process.env.LITELLM_API_KEY || "sk-ai-lab-master-key";
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const taskType = request.taskType || "chat";
    const model = await getModelForTask(taskType);

    if (model === "__LOCAL__") {
      return this.routeToLocal(request);
    }

    const providerName = this.extractProvider(model);

    const circuitOpen = await providerService.isCircuitOpen(providerName);
    if (circuitOpen) {
      return {
        id: `msg_${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        provider: providerName,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: `Error: Circuit breaker is open for provider ${providerName}. Too many recent failures.`,
            },
            finish_reason: "error",
          },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };
    }

    try {
      const response = await axios.post(
        `${this.litellmUrl}/v1/chat/completions`,
        {
          model,
          messages: request.messages,
          max_tokens: request.maxTokens || 1024,
          temperature: request.temperature || 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${this.litellmApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      const data = response.data;

      return {
        id: data.id || `msg_${Date.now()}`,
        object: data.object || "chat.completion",
        created: data.created || Math.floor(Date.now() / 1000),
        model: data.model || model,
        provider: this.extractProvider(data.model || model),
        choices: data.choices || [],
        usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };
    } catch (error: any) {
      console.error("[LLMRouter] LiteLLM request failed:", error.message);
      errorLogger.error("llm_router", `LiteLLM request failed for model ${model}: ${error.message}`, error, {
        model,
        provider: providerName,
      });

      return {
        id: `msg_${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        provider: "error",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: `Error: ${error.message || "Failed to get response from LLM provider"}`,
            },
            finish_reason: "error",
          },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };
    }
  }

  private async routeToLocal(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const activePort = localModelManager.getActiveModelPort();
    if (!activePort) {
      return {
        id: `msg_${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "local",
        provider: "local",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "Error: No local model is currently active. Go to Local Models page to activate one.",
            },
            finish_reason: "error",
          },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };
    }

    try {
      const response = await axios.post(
        `http://127.0.0.1:${activePort}/v1/chat/completions`,
        {
          messages: request.messages,
          max_tokens: request.maxTokens || 1024,
          temperature: request.temperature || 0.7,
        },
        { timeout: 120000 }
      );

      const data = response.data;
      return {
        id: data.id || `msg_${Date.now()}`,
        object: "chat.completion",
        created: data.created || Math.floor(Date.now() / 1000),
        model: data.model || "local",
        provider: "local",
        choices: data.choices || [],
        usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };
    } catch (error: any) {
      console.error("[LLMRouter] Local model request failed:", error.message);
      return {
        id: `msg_${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "local",
        provider: "local",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: `Error from local model: ${error.message}`,
            },
            finish_reason: "error",
          },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };
    }
  }

  private extractProvider(model: string): string {
    if (model.includes("/")) {
      return model.split("/")[0];
    }
    return "unknown";
  }
}

export const llmRouter = new LLMRouter();
