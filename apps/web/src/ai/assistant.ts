import { zoneAt, zoneName, zones, type ZoneId } from "@workbits/shared";
import { localCharacterId, teamById, teamCharacters } from "../data/team";

export type AssistantPlayer = {
  id: string;
  characterId: string;
  name: string;
  x: number;
  z: number;
};

export type AssistantMessage = {
  authorId: string;
  body: string;
  time: string;
};

export type AssistantAction = {
  label: string;
  x: number;
  z: number;
};

export type AssistantReply = {
  text: string;
  action?: AssistantAction;
};

const roomWords: Array<{ id: ZoneId; words: string[] }> = [
  { id: "meeting", words: ["meeting", "conference", "glass room"] },
  { id: "lounge", words: ["lounge", "sofa", "couch"] },
  { id: "kitchen", words: ["kitchen", "coffee", "lunch", "dining"] },
  { id: "nap", words: ["nap", "sleep", "bed"] },
  { id: "engineering", words: ["engineering", "desks", "pod", "dev"] },
];

function displayName(player: AssistantPlayer) {
  return teamById[player.characterId]?.displayName ?? player.name;
}

function zoneOf(player: AssistantPlayer) {
  return zoneAt(player.x, player.z);
}

function roomMention(text: string) {
  return roomWords.find((room) => room.words.some((word) => text.includes(word)));
}

function nameMention(text: string) {
  return teamCharacters.find((character) => {
    const first = character.shortName.toLowerCase();
    const full = character.displayName.toLowerCase();
    return text.includes(first) || text.includes(full);
  });
}

function livePeople(players: AssistantPlayer[], selfId: string | null) {
  return players.map((player) => ({
    ...player,
    label: `${displayName(player)}${player.id === selfId ? " (you)" : ""}`,
  }));
}

function presenceByRoom(players: AssistantPlayer[], selfId: string | null) {
  const groups = new Map<string, string[]>();
  for (const person of livePeople(players, selfId)) {
    const zone = zoneOf(person);
    const list = groups.get(zone) ?? [];
    list.push(person.label);
    groups.set(zone, list);
  }
  return [...groups.entries()]
    .map(([zone, people]) => `${zoneName(zone)}: ${people.join(", ")}`)
    .join("\n");
}

function walkAction(zone: ZoneId): AssistantAction {
  const room = zones.find((item) => item.id === zone);
  return {
    label: `Walk to ${zoneName(zone)}`,
    x: room?.anchor.x ?? 0,
    z: room?.anchor.z ?? 0,
  };
}

export function answerAssistant(
  prompt: string,
  context: { players: AssistantPlayer[]; messages: AssistantMessage[]; selfId: string | null },
): AssistantReply {
  const text = prompt.toLowerCase().trim();
  const { players, messages, selfId } = context;
  const self = players.find((player) => player.id === selfId);
  const selfZone = self ? zoneName(zoneOf(self)) : "the office";

  if (!text || /^(hi|hello|hey|help|what can you do)/.test(text)) {
    return {
      text: `Hi. I can answer questions from the live office — presence, rooms, and a quick summary. You're in ${selfZone} right now.\n\nTry “Where is everyone?”, “Which room is free?”, or “Who's in the meeting room?”`,
    };
  }

  if (/where.*every|who.*here|presence|anyone|anybody/.test(text) && !nameMention(text)) {
    const live = presenceByRoom(players, selfId);
    const offline = teamCharacters
      .filter((character) => !players.some((player) => player.characterId === character.id))
      .slice(0, 6)
      .map((character) => `${character.displayName} → ${character.room}`);
    return {
      text: `${players.length === 0 ? "No one is connected yet." : `Connected now (${players.length}):\n${live}`}${
        offline.length ? `\n\nDemo cast not connected: ${offline.join(", ")}.` : ""
      }`,
    };
  }

  if (/free|empty|quiet|available|open room|where.*meet/.test(text)) {
    const free = zones.filter(
      (room) => !players.some((player) => zoneOf(player) === room.id),
    );
    const meeting = zones.find((room) => room.id === "meeting")!;
    const meetingPeople = livePeople(players, selfId).filter(
      (player) => zoneOf(player) === "meeting",
    );
    const meetingLine =
      meetingPeople.length === 0
        ? "The Meeting Room is free and its voice is private."
        : `The Meeting Room is occupied by ${meetingPeople.map((p) => p.label).join(", ")}.`;
    return {
      text: `${meetingLine}\n\nQuiet rooms right now: ${
        free.length ? free.map((room) => room.name).join(", ") : "none — the loft is busy."
      }`,
      action: walkAction(meeting.id),
    };
  }

  const room = roomMention(text);
  if (room && /who|where|in |status|free|quiet/.test(text)) {
    const inRoom = livePeople(players, selfId).filter((player) => zoneOf(player) === room.id);
    return {
      text:
        inRoom.length === 0
          ? `No one is connected in ${zoneName(room.id)} right now.`
          : `${zoneName(room.id)}: ${inRoom.map((person) => person.label).join(", ")}.`,
      action: walkAction(room.id),
    };
  }

  const named = nameMention(text);
  if (named) {
    const live = players.find((player) => player.characterId === named.id);
    if (live) {
      return {
        text: `${named.displayName} is in ${zoneName(zoneOf(live))} right now.`,
        action: walkAction(zoneOf(live)),
      };
    }
    return {
      text: `${named.displayName} is not connected. Their demo seat is in ${named.room === "engineering" ? "Engineering" : named.room.replace(/^./, (letter) => letter.toUpperCase())}.`,
      action: walkAction(named.room as ZoneId),
    };
  }

  if (/summar|catch up|what.*happening|status|update/.test(text)) {
    const recent = messages
      .filter((message) => message.authorId !== "assistant")
      .slice(-3)
      .map((message) => `${teamById[message.authorId]?.shortName ?? "Someone"}: ${message.body}`);
    return {
      text: `${players.length} ${players.length === 1 ? "person is" : "people are"} connected.\n${presenceByRoom(players, selfId) || "No live presence."}${
        recent.length ? `\n\nLatest chat:\n${recent.join("\n")}` : "\n\nNo chat yet today."
      }`,
    };
  }

  if (/meeting|private|voice|call/.test(text)) {
    const inMeeting = livePeople(players, selfId).filter(
      (player) => zoneOf(player) === "meeting",
    );
    return {
      text:
        inMeeting.length === 0
          ? "The Meeting Room is free. Walking inside switches your voice into a private LiveKit room — people outside won't hear you."
          : `${inMeeting.map((person) => person.label).join(", ")} ${
              inMeeting.length === 1 ? "is" : "are"
            } in the private Meeting Room.`,
      action: walkAction("meeting"),
    };
  }

  if (/avatar|look|outfit|customi[sz]e/.test(text)) {
    return {
      text: "Open Avatar Studio from the wand in the bottom-right. Describe a look, generate three bases from the modular catalog, and apply one. Everyone in the office sees the change.",
    };
  }

  if (/desk|layout|workspace|office/.test(text)) {
    return {
      text: "Workspace Studio is the layout button next to the wand. It generates three desk configurations for the engineering pod; applying one syncs it to everyone.",
    };
  }

  return {
    text: `I can help with presence, rooms, and the office. Right now you're in ${selfZone} with ${players.length - 1} other ${
      players.length - 1 === 1 ? "person" : "people"
    } connected. Try “Where is everyone?”, “Who's in the meeting room?”, or “Summarize the office.”`,
    action: walkAction(self ? zoneOf(self) : "lounge"),
  };
}
