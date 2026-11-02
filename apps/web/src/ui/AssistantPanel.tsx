import { ArrowUpRight, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  answerAssistant,
  type AssistantAction,
  type AssistantReply,
} from "../ai/assistant";
import { useRealtimeStore } from "../realtime/store";
import { useAppStore } from "../state/app";

type Entry = {
  id: string;
  role: "user" | "assistant";
  text: string;
  action?: AssistantAction;
};

const prompts = [
  "Where is everyone?",
  "Which room is free?",
  "Who's in the meeting room?",
  "Summarize the office",
];

function replyFor(prompt: string): AssistantReply {
  const realtime = useRealtimeStore.getState();
  return answerAssistant(prompt, {
    players: Object.values(realtime.players),
    messages: realtime.messages,
    selfId: realtime.sessionId,
  });
}

export function AssistantPanel() {
  const open = useAppStore((state) => state.assistantOpen);
  const setOpen = useAppStore((state) => state.setAssistantOpen);
  const setTarget = useAppStore((state) => state.setTarget);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    setEntries((current) => {
      if (current.length > 0) return current;
      const reply = replyFor("hello");
      return [{ id: "greeting", role: "assistant", text: reply.text }];
    });
  }, [open]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [entries.length, thinking]);

  if (!open) return null;

  const ask = (prompt: string) => {
    const body = prompt.trim();
    if (!body || thinking) return;
    const reply = replyFor(body);
    setEntries((current) => [
      ...current,
      { id: `u-${Date.now()}`, role: "user", text: body },
    ]);
    setDraft("");
    setThinking(true);
    window.setTimeout(() => {
      setEntries((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: reply.text,
          action: reply.action,
        },
      ]);
      setThinking(false);
    }, 220);
  };

  return (
    <div
      className="assistant-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <section
        className="assistant"
        role="dialog"
        aria-modal="true"
        aria-label="Workbits assistant"
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <header className="assistant__head">
          <div className="assistant__identity">
            <span className="assistant__mark" aria-hidden="true">
              <Sparkles size={17} />
            </span>
            <div>
              <div className="eyebrow">Workbits assistant · local</div>
              <h2>Ask the office</h2>
            </div>
          </div>
          <button
            className="icon-button icon-button--small"
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close assistant"
          >
            <X size={16} />
          </button>
        </header>

        <p className="assistant__intro">
          Answers come from live presence and room data, on this device. No API key, no prompt
          leaves the browser.
        </p>

        <div className="assistant__prompts">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              className="assistant__prompt"
              type="button"
              onClick={() => ask(prompt)}
              disabled={thinking}
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="assistant__thread" ref={listRef} aria-live="polite">
          {entries.map((entry) => (
            <div key={entry.id} className={`assistant-row assistant-row--${entry.role}`}>
              {entry.role === "assistant" && (
                <span className="assistant__avatar" aria-hidden="true">
                  <Sparkles size={13} />
                </span>
              )}
              <div className="assistant-bubble">
                <p>{entry.text}</p>
                {entry.action && (
                  <button
                    className="assistant-action"
                    type="button"
                    onClick={() => {
                      setTarget({ x: entry.action!.x, z: entry.action!.z });
                      setOpen(false);
                    }}
                  >
                    {entry.action.label}
                    <ArrowUpRight size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="assistant-row assistant-row--assistant">
              <span className="assistant__avatar" aria-hidden="true">
                <Sparkles size={13} />
              </span>
              <div className="assistant-bubble assistant-bubble--thinking">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>

        <div className="assistant__composer">
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") ask(draft);
            }}
            placeholder="Ask about people, rooms, or the office…"
            aria-label="Ask the Workbits assistant"
          />
          <button
            className="send-button"
            type="button"
            onClick={() => ask(draft)}
            disabled={thinking || !draft.trim()}
            aria-label="Send question"
          >
            <Sparkles size={15} />
          </button>
        </div>

        <footer className="assistant__footer">
          <span className="live-pill">
            <span className="live-pill__dot" />
            Local engine
          </span>
          <span>Swap in an LLM provider when keys are available.</span>
        </footer>
      </section>
    </div>
  );
}
