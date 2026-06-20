import { env, getLlmConfig } from "./config.js";
import { createApp } from "./app.js";
import { logInfo } from "./helpers.js";

const app = createApp();
const llm = getLlmConfig();

app.listen(env.PORT, () => {
  logInfo(`Server running on http://localhost:${env.PORT}`);
  logInfo(`LLM: ${llm.name} | model: ${llm.model}`);
  logInfo(`LLM base URL: ${llm.baseURL}`);
  logInfo(`Search: ${env.WEB_SEARCH_PROVIDER}`);
});
