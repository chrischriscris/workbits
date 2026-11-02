function devLike() {
  return import.meta.env.DEV || window.location.port === "3100";
}

export function apiBase() {
  const explicit = import.meta.env.VITE_API_URL as string | undefined;
  if (explicit !== undefined) return explicit;
  if (devLike()) {
    return `${window.location.protocol}//${window.location.hostname}:3101`;
  }
  return window.location.origin;
}

export function realtimeUrl() {
  const explicit = import.meta.env.VITE_REALTIME_URL as string | undefined;
  if (explicit) return explicit;
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  if (devLike()) {
    return `${protocol}://${window.location.hostname}:3101`;
  }
  return `${protocol}://${window.location.host}`;
}
