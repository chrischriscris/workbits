import { MessageCircle, SendHorizontal, Smile, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { roomsOf, spaceOf } from "@workbits/shared";
import { useSpace } from "../state/space";
import { localCharacterId, teamById } from "../data/team";
import { useRealtimeStore } from "../realtime/store";
import { useAppStore, type ChatTab } from "../state/app";
import { palette } from "../theme";
import { AvatarPortrait } from "./AvatarPortrait";

type ChatMessage = {
  id: string;
  channel: string;
  authorId: string;
  authorName?: string;
  body: string;
  time: string;
  zone?: string;
  to?: string;
  history?: boolean;
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
    zone: "lounge",
  },
  {
    id: "d1",
    channel: "dm",
    authorId: "arlo",
    body: "did you see the new beanbag?",
    time: "9:35",
    to: "chus",
  },
  {
    id: "d2",
    channel: "dm",
    authorId: "chus",
    body: "obviously. it's perfect.",
    time: "9:35",
    to: "arlo",
  },
];

const tabs: Array<{ key: ChatTab; label: string }> = [
  { key: "global", label: "Global" },
  { key: "office", label: "Office" },
  { key: "room", label: "Room" },
  { key: "dm", label: "DM" },
];

export function ChatDock() {
  const chatOpen = useAppStore((state) => state.chatOpen);
  const setChatOpen = useAppStore((state) => state.setChatOpen);
  const chatTab = useAppStore((state) => state.chatTab);
  const setChatTab = useAppStore((state) => state.setChatTab);
  const realtimeMessages = useRealtimeStore((state) => state.messages);
  const sendChat = useRealtimeStore((state) => state.sendChat);
  const connection = useRealtimeStore((state) => state.status);
  const livePlayers = useRealtimeStore((state) => state.players);
  const dmTargetId = useAppStore((state) => state.dmTargetId);
  const dmTarget = teamById[dmTargetId];
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [unread, setUnread] = useState<Record<ChatTab, number>>({
    global: 0,
    office: 0,
    room: 0,
    dm: 0,
  });
  const seenRealtime = useRef(realtimeMessages.length);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const added = realtimeMessages.slice(seenRealtime.current);
    seenRealtime.current = realtimeMessages.length;
    if (added.length === 0) return;
    setUnread((current) => {
      const next = { ...current };
      for (const message of added) {
        if (message.authorId === localCharacterId || message.history) continue;
        const channel = message.channel as ChatTab;
        if (!(channel in next)) continue;
        if (chatOpen && chatTab === channel) continue;
        next[channel] = Math.min(99, next[channel] + 1);
      }
      return next;
    });
  }, [realtimeMessages, chatOpen, chatTab]);

  useEffect(() => {
    if (!chatOpen) return;
    setUnread((current) =>
      current[chatTab] === 0 ? current : { ...current, [chatTab]: 0 },
    );
  }, [chatOpen, chatTab]);

  const totalUnread = Object.values(unread).reduce((sum, count) => sum + count, 0);

  const doc = useSpace((state) => state.doc);
  // The room id, not the position object, so chat doesn't re-render on every step.
  const localZone = useRealtimeStore((state) => spaceOf(doc).roomAt(state.localPosition.x, state.localPosition.z).id);
  const roomName = roomsOf(doc).find((room) => room.id === localZone)?.name ?? "Office";
  const messages: ChatMessage[] = [...initialMessages, ...realtimeMessages];
  const visibleMessages = messages.filter((message) => {
    if (message.channel !== chatTab) return false;
    if (chatTab === "room" && message.zone !== localZone) return false;
    if (chatTab === "dm") {
      return (
        message.authorId === dmTargetId ||
        message.to === dmTargetId ||
        (message.authorId === localCharacterId && message.to === dmTargetId)
      );
    }
    return true;
  });

  useEffect(() => {
    if (!chatOpen) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [chatOpen, chatTab, messages.length]);

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    const to = chatTab === "dm" ? dmTargetId : undefined;
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
        {totalUnread > 0 ? (
          <span className="chat-bar__unread">{totalUnread > 9 ? "9+" : totalUnread}</span>
        ) : (
          <span className="chat-bar__hint">Enter</span>
        )}
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
            {tab.key === "room" ? roomName : tab.key === "dm" ? `DM · ${dmTarget?.shortName ?? "Team"}` : tab.label}
            {unread[tab.key] > 0 && <span className="chat__tab-badge">{unread[tab.key]}</span>}
          </button>
        ))}
      </div>

      <div className="chat__messages" ref={listRef}>
        {visibleMessages.map((message) => {
          const author = teamById[message.authorId];
          const liveAuthor = Object.values(livePlayers).find(
            (player) => player.characterId === message.authorId,
          );
          const authorConfig = liveAuthor?.avatar ?? author?.avatar;
          const isYou = message.authorId === localCharacterId;
          const isSystem = message.authorId === "system";
          return (
            <div key={message.id} className={`chat-message${isSystem ? " chat-message--system" : ""}`}>
              {!isSystem && (
                <span
                  className="avatar avatar--chat"
                  style={{ background: authorConfig?.palette.primary ?? palette.slate }}
                >
                  {authorConfig ? (
                    <AvatarPortrait
                      config={authorConfig}
                      species={author?.species ?? "human"}
                      size={32}
                    />
                  ) : (
                    author?.shortName.slice(0, 1) ?? "?"
                  )}
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
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") send();
            if (event.key === "Escape") setChatOpen(false);
          }}
          placeholder={`Message ${
            chatTab === "dm" ? dmTarget?.shortName ?? "teammate" : chatTab === "room" ? `#${roomName.toLowerCase().replace(/ /g, "-")}` : `#${chatTab}`
          }…`}
          aria-label="Message"
        />
        <button
          className={`icon-button icon-button--small${emojiOpen ? " is-active" : ""}`}
          type="button"
          aria-label="Emoji"
          title="Emoji"
          aria-expanded={emojiOpen}
          onClick={() => setEmojiOpen((open) => !open)}
        >
          <Smile size={16} />
        </button>
        <button className="send-button" type="button" onClick={send} aria-label="Send message">
          <SendHorizontal size={16} />
        </button>

        {emojiOpen && (
          <div className="emoji-pop" role="menu" aria-label="Insert emoji">
            {["👍", "🎉", "☕", "🐸", "🙌", "😅"].map((emoji) => (
              <button
                key={emoji}
                className="emoji-pop__item"
                type="button"
                role="menuitem"
                onClick={() => {
                  setDraft((current) => `${current}${emoji}`);
                  setEmojiOpen(false);
                  inputRef.current?.focus();
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
