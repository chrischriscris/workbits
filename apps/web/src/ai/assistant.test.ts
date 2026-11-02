import { describe, expect, test } from "bun:test";
import { answerAssistant, type AssistantPlayer } from "./assistant";

const players: AssistantPlayer[] = [
  { id: "self", characterId: "chus", name: "Chus", x: -5.7, z: 2.6 },
  { id: "felix", characterId: "felix", name: "Felix", x: 1.4, z: 5.6 },
  { id: "arlo", characterId: "arlo", name: "Arlo", x: -6.15, z: -4 },
];

const context = {
  players,
  selfId: "self",
  messages: [
    { authorId: "felix", body: "shipping the pod today", time: "9:40" },
    { authorId: "arlo", body: "meeting at ten", time: "9:41" },
  ],
};

describe("answerAssistant", () => {
  test("greets with the current room", () => {
    expect(answerAssistant("hello", context).text).toContain("Lounge");
  });

  test("lists live presence by room", () => {
    const reply = answerAssistant("where is everyone?", context);
    expect(reply.text).toContain("Chus (you)");
    expect(reply.text).toContain("Engineering: Felix");
    expect(reply.text).toContain("Meeting Room: Arlo");
  });

  test("finds a person by name and offers a walk action", () => {
    const reply = answerAssistant("where is Felix?", context);
    expect(reply.text).toContain("Felix is in Engineering");
    expect(reply.action?.x).toBeCloseTo(1.4);
    expect(reply.action?.z).toBeCloseTo(5.6);
  });

  test("reports meeting-room occupancy and privacy", () => {
    const reply = answerAssistant("who's in the meeting room?", context);
    expect(reply.text).toContain("Arlo");
    expect(reply.text).toContain("Meeting Room");
  });

  test("finds a free room", () => {
    const reply = answerAssistant("which room is free?", context);
    expect(reply.text).toContain("Meeting Room is occupied");
    expect(reply.text).toContain("Quiet rooms");
    expect(reply.action).toBeDefined();
  });

  test("summarizes presence and recent chat", () => {
    const reply = answerAssistant("summarize the office", context);
    expect(reply.text).toContain("3 people are connected");
    expect(reply.text).toContain("shipping the pod today");
  });

  test("falls back honestly for unhandled prompts", () => {
    const reply = answerAssistant("write me a poem about the moon", context);
    expect(reply.text).toContain("I can help with presence");
  });
});
