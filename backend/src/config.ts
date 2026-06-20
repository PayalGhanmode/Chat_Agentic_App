import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(8000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  LLM_PROVIDER: z.enum(["groq", "openai"]).default("groq"),
  LLM_API_KEY: z.string().min(1, "LLM_API_KEY is required"),
  LLM_MODEL: z.string().min(1),
  LLM_BASE_URL: z.string().url().optional(),

  WEB_SEARCH_PROVIDER: z.enum(["mock", "tavily"]).default("mock"),
  TAVILY_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return parsed.data;
}

export const env = loadEnv();

export type LlmProviderName = "groq" | "openai";

export interface LlmProviderConfig {
  name: LlmProviderName;
  apiKey: string;
  model: string;
  baseURL: string;
}

const providerDefaults: Record<LlmProviderName, { baseURL: string; defaultModel: string }> = {
  groq: {
    baseURL: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.1-70b-versatile",
  },
  openai: {
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  },
};

export function getLlmConfig(): LlmProviderConfig {
  const defaults = providerDefaults[env.LLM_PROVIDER];

  return {
    name: env.LLM_PROVIDER,
    apiKey: env.LLM_API_KEY,
    model: env.LLM_MODEL || defaults.defaultModel,
    baseURL: env.LLM_BASE_URL ?? defaults.baseURL,
  };
}