function devLike() {
  return import.meta.env.DEV || window.location.port === "3100";
}

/** Dev-only `?rt=<port>`: points the page at another realtime server (parallel verify lanes). */
function devRealtimePort() {
  if (!devLike()) return "3101";
  return new URLSearchParams(window.location.search).get("rt")?.match(/^\d{2,5}$/)?.[0] ?? "3101";
}

export function apiBase() {
  const explicit = import.meta.env.VITE_API_URL as string | undefined;
  if (explicit !== undefined) return explicit;
  if (devLike()) {
    return `${window.location.protocol}//${window.location.hostname}:${devRealtimePort()}`;
  }
  return window.location.origin;
}

export function realtimeUrl() {
  const explicit = import.meta.env.VITE_REALTIME_URL as string | undefined;
  if (explicit) return explicit;
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  if (devLike()) {
    return `${protocol}://${window.location.hostname}:${devRealtimePort()}`;
  }
  return `${protocol}://${window.location.host}`;
}
