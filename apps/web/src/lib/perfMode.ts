/**
 * Measurement tooling (fake avatars, per-frame counters, effect switches) runs
 * in dev builds, or in any build when the URL has `?perf`, so production
 * bundles can be measured too (scripts/perf-check.mjs). All of it is
 * client-side and changes nothing for other people.
 */
export const perfTools =
  import.meta.env.DEV || (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("perf"));
