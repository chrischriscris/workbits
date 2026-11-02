import { MessageCircle, Plus, SendHorizontal, Smile, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { localCharacterId, teamById } from "../data/team";
import { useRealtimeStore } from "../realtime/store";
import { useAppStore, type ChatTab } from "../state/app";
import { palette } from "../theme";

type ChatMessage = {
  id: string;
  channel: string;
  authorId: string;
  authorName?: string;
  body: string;
  time: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: "m1",
    channel: "office",
    authorId: "jules",
    body: "Morning! Coffee's on ☕",
    time: "9:38",
  },
  {
    id: "m2",
    channel: "office",
    authorId: "arlo",
    body: "frog mode activated 🐸",
    time: "9:39",
  },
  {
    id: "m3",
    channel: "office",
    authorId: "fern",
    body: "shipping the new room today",
    time: "9:40",
  },
  {
    id: "m4",
    channel: "office",
    authorId: "theo",
    body: "zzz",
    time: "9:41",
  },
  {
    id: "g1",
    channel: "global",
    authorId: "system",
    body: "Welcome to Workbits Loft. The team pack is live — click any teammate to say hi.",
    time: "9:30",
  },
  {
    id: "r1",
    channel: "room",
    authorId: "jules",
    body: "Lounge is looking good today.",
    time: "9:36",
  },
  {
    id: "d1",
    channel: "dm",
    authorId: "arlo",
    body: "did you see the new beanbag?",
    time: "9:35",
  },
  {
    id: "d2",
    channel: "dm",
    authorId: "chus",
    body: "obviously. it's perfect.",
    time: "9:35",
  },
];

const tabs: Array<{ key: ChatTab; label: string }> = [
  { key: "global", label: "Global" },
  { key: "office", label: "Office" },
  { key: "room", label: "Lounge" },
  { key: "dm", label: "DM · Arlo" },
];

export function ChatDock() {
  const chatOpen = useAppStore((state) => state.chatOpen);
  const setChatOpen = useAppStore((state) => state.setChatOpen);
  const chatTab = useAppStore((state) => state.chatTab);
  const setChatTab = useAppStore((state) => state.setChatTab);
  const realtimeMessages = useRealtimeStore((state) => state.messages);
  const sendChat = useRealtimeStore((state) => state.sendChat);
  const connection = useRealtimeStore((state) => state.status);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const messages: ChatMessage[] = [...initialMessages, ...realtimeMessages];
  const visibleMessages = messages.filter((message) => message.channel === chatTab);

  useEffect(() => {
    if (!chatOpen) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [chatOpen, chatTab, messages.length]);

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    const to = chatTab === "dm" ? (localCharacterId === "arlo" ? "chus" : "arlo") : undefined;
    sendChat(chatTab, body, to);
    setDraft("");
  };

  if (!chatOpen) {
    return (
      <button className="chat-bar" type="button" onClick={() => setChatOpen(true)}>
        <span className="chat-bar__icon">
          <MessageCircle size={17} />
        </span>
        <span className="chat-bar__placeholder">Message the team…</span>
        <span className="chat-bar__hint">Enter</span>
      </button>
    );
  }

  return (
    <section className="panel chat" aria-label="Team chat">
      <div className="panel__header chat__header">
        <div>
          <div className="eyebrow">Conversation · {connection === "connected" ? "Live" : "Local"}</div>
          <h2>Team chat</h2>
        </div>
        <button
          className="icon-button icon-button--small"
          type="button"
          onClick={() => setChatOpen(false)}
          aria-label="Close chat"
        >
          <X size={16} />
        </button>
      </div>

      <div className="chat__tabs" role="tablist" aria-label="Chat channels">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`chat__tab${chatTab === tab.key ? " is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={chatTab === tab.key}
            onClick={() => setChatTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="chat__messages" ref={listRef}>
        {visibleMessages.map((message) => {
          const author = teamById[message.authorId];
          const isYou = message.authorId === localCharacterId;
          const isSystem = message.authorId === "system";
          return (
            <div key={message.id} className={`chat-message${isSystem ? " chat-message--system" : ""}`}>
              {!isSystem && (
                <span
                  className="avatar avatar--chat"
                  style={{ background: author?.avatar.palette.primary ?? palette.slate }}
                >
                  {author?.shortName.slice(0, 1) ?? "?"}
                </span>
              )}
              <div className="chat-message__body">
                {!isSystem && (
                  <div className="chat-message__meta">
                    <strong>
                      {isYou ? "You" : message.authorName ?? author?.shortName ?? "Workbits"}
                    </strong>
                    <span>{message.time}</span>
                  </div>
                )}
                <p>{message.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="chat__composer">
        <button className="icon-button icon-button--small" type="button" aria-label="Add attachment" title="Add attachment">
          <Plus size={16} />
        </button>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") send();
            if (event.key === "Escape") setChatOpen(false);
          }}
          placeholder={`Message ${chatTab === "dm" ? "Arlo" : chatTab === "room" ? "#lounge" : `#${chatTab}`}…`}
          aria-label="Message"
        />
        <button className="icon-button icon-button--small" type="button" aria-label="Emoji" title="Emoji">
          <Smile size={16} />
        </button>
        <button className="send-button" type="button" onClick={send} aria-label="Send message">
          <SendHorizontal size={16} />
        </button>
      </div>
    </section>
  );
}
