import { useState } from "react";
import {
  PageHeader,
  PromptTextarea,
  ControlBar,
  AnswerSection,
  ThinkingSection,
  ToolActivitySection,
} from "./ChatComponents";
import { useChatSession } from "./useAgentChat";
import { API_BASE } from "./chatApi";
import "./app.css";

export default function App() {
  const [query, setQuery] = useState("");
  const [useTimeline, setUseTimeline] = useState(false);
  const { response, reasoning, tools, error, loading, send, clear } = useChatSession();

  const run = (mode: "live" | "live-v2" | "mock") => {
    setUseTimeline(mode === "live-v2");
    send(query, mode);
  };

  return (
    <div className="app">
      <div className="container">
        <PageHeader />

        <section className="input-section">
          <PromptTextarea value={query} onChange={setQuery} disabled={loading} />
          <ControlBar
            loading={loading}
            onSend={() => run("live")}
            onSendV2={() => run("live-v2")}
            onMock={() => run("mock")}
            onClear={clear}
          />
        </section>

        {error && <div className="error-banner">{error}</div>}

        <section className="panels-row">
          <AnswerSection text={response} loading={loading} />
          <ThinkingSection items={reasoning} timeline={useTimeline} />
        </section>

        <ToolActivitySection items={tools} />
      </div>
    </div>
  );
}