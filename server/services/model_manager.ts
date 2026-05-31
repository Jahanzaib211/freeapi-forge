import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { exec } from "child_process";
import axios from "axios";

const LITELLM_CONFIG_PATH = path.join(process.env.HOME || "/home/jahanzaib", "litellm/litellm_config.yaml");

export function loadLitellmConfig(): any {
  try {
    const content = fs.readFileSync(LITELLM_CONFIG_PATH, "utf-8");
    return yaml.load(content) || { model_list: [] };
  } catch {
    return { model_list: [] };
  }
}

export function saveLitellmConfig(config: any): void {
  const content = yaml.dump(config, { lineWidth: -1, noRefs: true });
  fs.writeFileSync(LITELLM_CONFIG_PATH, content, "utf-8");
}

export function restartLitellm(): Promise<void> {
  return new Promise((resolve, reject) => {
    exec("pm2 restart litellm-proxy", (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function addModelToConfig(
  modelName: string,
  provider: string,
  modelId: string,
  apiKey?: string,
  apiBase?: string
): Promise<boolean> {
  const config = loadLitellmConfig();
  if (!config.model_list) config.model_list = [];

  const exists = config.model_list.some((m: any) => m.model_name === modelName);
  if (exists) return false;

  const entry: any = {
    model_name: modelName,
    litellm_params: {
      model: `${provider}/${modelId}`,
    },
  };

  if (apiKey) {
    entry.litellm_params.api_key = apiKey;
  }
  if (apiBase) {
    entry.litellm_params.api_base = apiBase;
  }

  config.model_list.push(entry);
  saveLitellmConfig(config);

  try {
    await restartLitellm();
  } catch (err) {
    console.error("[ModelManager] Failed to restart LiteLLM:", err);
  }

  return true;
}

export async function removeModelFromConfig(modelName: string): Promise<boolean> {
  const config = loadLitellmConfig();
  if (!config.model_list) return false;

  const idx = config.model_list.findIndex((m: any) => m.model_name === modelName);
  if (idx === -1) return false;

  config.model_list.splice(idx, 1);
  saveLitellmConfig(config);

  try {
    await restartLitellm();
  } catch (err) {
    console.error("[ModelManager] Failed to restart LiteLLM:", err);
  }

  return true;
}

export async function testModel(modelName: string): Promise<{ success: boolean; latency: number; error?: string }> {
  const litellmUrl = process.env.LITELLM_URL || "http://localhost:5050";
  const litellmApiKey = process.env.LITELLM_API_KEY || "sk-ai-lab-master-key";

  const start = Date.now();
  try {
    const response = await axios.post(
      `${litellmUrl}/v1/chat/completions`,
      {
        model: modelName,
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 5,
      },
      {
        headers: {
          Authorization: `Bearer ${litellmApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );
    return { success: response.status === 200, latency: Date.now() - start };
  } catch (error: any) {
    return { success: false, latency: Date.now() - start, error: error.message };
  }
}

export function getAllModelsFromConfig(): Array<{ name: string; model: string; provider: string; apiBase?: string }> {
  const config = loadLitellmConfig();
  if (!config.model_list) return [];

  return config.model_list.map((m: any) => ({
    name: m.model_name,
    model: m.litellm_params?.model || "",
    provider: (m.litellm_params?.model || "").split("/")[0] || "unknown",
    apiBase: m.litellm_params?.api_base,
  }));
}
