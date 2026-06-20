import type { ReactNode } from "react";
import type { ThoughtItem, ToolActivityItem } from "./useAgentChat";

export function PageHeader() {
  return (
    <header className="header">
      <h1>🤖 AI Chat Interface</h1>
      <p>Experience streaming AI responses with detailed reasoning</p>
    </header>
  );
}

type PromptTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function PromptTextarea({ value, onChange, disabled }: PromptTextareaProps) {
  return (
    <textarea
      className="query-input"
      placeholder="Ask anything…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      
      rows={4}
    />
  );
}

type ControlBarProps = {
  loading: boolean;
  onSend: () => void;
  onSendV2: () => void;
  onMock: () => void;
  onClear: () => void;
};

export function ControlBar({ loading, onSend, onSendV2, onMock, onClear }: ControlBarProps) {
  return (
    <div className="actions">
      <button type="button" className="btn btn-primary" onClick={onSend} disabled={loading}>
        Send Query
      </button>
      <button type="button" className="btn btn-v2" onClick={onSendV2} disabled={loading}>
        Send Query (V2)
      </button>
      <button type="button" className="btn btn-mock" onClick={onMock} disabled={loading}>
        Mock (No Tokens)
      </button>
      <button type="button" className="btn btn-clear" onClick={onClear} disabled={loading}>
        Clear
      </button>
    </div>
  );
}

type SectionCardProps = {
  title: string;
  icon: string;
  variant: "response" | "reasoning" | "tools";
  children: ReactNode;
};

export function SectionCard({ title, icon, variant, children }: SectionCardProps) {
  return (
    <section className={`panel panel-${variant}`}>
      <div className="panel-header">
        <span>{icon}</span>
        <h2>{title}</h2>
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

type AnswerSectionProps = {
  text: string;
  loading: boolean;
};

export function AnswerSection({ text, loading }: AnswerSectionProps) {
  return (
    <SectionCard title="AI Response" icon="🎯" variant="response">
      {loading && !text && <p className="placeholder pulse">Waiting for response…</p>}
      {!loading && !text && <p className="placeholder">Final answer will appear here.</p>}
      {text ? <pre className="response-text">{text}</pre> : null}
    </SectionCard>
  );
}

type ThinkingSectionProps = {
  items: ThoughtItem[];
  timeline?: boolean;
};

export function ThinkingSection({ items, timeline }: ThinkingSectionProps) {
  return (
    <SectionCard title="Reasoning Process" icon="🧠" variant="reasoning">
      {items.length === 0 && (
        <p className="placeholder">Reasoning steps will show here as the agent thinks.</p>
      )}
      {timeline ? (
        <ul className="timeline">
          {items.map((item, i) => (
            <li key={i} className="timeline-item">
              <span className="timeline-time">{item.time}</span>
              <p>{item.text}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="reasoning-list">
          {items.map((item, i) => (
            <p key={i} className="reasoning-line">
              {item.text}
            </p>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

type ToolActivitySectionProps = {
  items: ToolActivityItem[];
};

export function ToolActivitySection({ items }: ToolActivitySectionProps) {
  return (
    <SectionCard title="Tool Calls & Results" icon="🔧" variant="tools">
      {items.length === 0 && (
        <p className="placeholder">Web search and other tool calls appear here.</p>
      )}
      {items.map((item, i) => (
        <article key={i} className="tool-card">
          <header>
            <strong>{item.tool}</strong>
            <span className="tool-input">Input: {item.input}</span>
          </header>
          <pre className="tool-output">{item.output}</pre>
        </article>
      ))}
    </SectionCard>
  );
}