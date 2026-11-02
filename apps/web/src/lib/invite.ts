import { localCharacterId } from "../data/team";

export function inviteUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("character");
  url.searchParams.set("join", "1");
  url.searchParams.set("host", localCharacterId);
  return url.toString();
}

export async function copyInviteLink() {
  await navigator.clipboard.writeText(inviteUrl());
}
