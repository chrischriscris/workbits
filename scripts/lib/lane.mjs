import { chromium } from "playwright";

// Where a check points. verify runs checks in parallel lanes, each against its
// own realtime server (WB_RT_PORT) and LiveKit room prefix (WB_VOICE_ROOM); the
// defaults are the normal dev stack.
export const RT_PORT = Number(process.env.WB_RT_PORT ?? 3101);
export const API = `http://127.0.0.1:${RT_PORT}`;
export const WS = `ws://127.0.0.1:${RT_PORT}`;
export const VOICE_ROOM = process.env.WB_VOICE_ROOM ?? "office:workbits-loft";
export const MEETING_ROOM = `${VOICE_ROOM}:meeting`;

/** App page URL (`query` like "?character=chus&e2e=1"), pointed at this lane's server. */
export function app(query = "") {
  const url = new URL(`http://127.0.0.1:3100/${query}`);
  if (RT_PORT !== 3101) url.searchParams.set("rt", String(RT_PORT));
  return url.toString();
}


const SOFTWARE_GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];

/**
 * Launch the check browser. Software GL (Playwright's Chromium + SwiftShader)
 * by default: it spreads across CPU cores, so parallel lanes scale, where a
 * small iGPU shared by several headless browsers was slower (468s vs 335s for
 * the full verify). WB_GPU=1 uses system Chrome on the real GPU instead, which
 * is a little faster for a single check.
 */
export async function launchBrowser(options = {}) {
  const args = options.args ?? [];
  if (process.env.WB_GPU === "1") {
    try {
      return await chromium.launch({ ...options, channel: "chrome", args });
    } catch {
      // No system Chrome: fall through to software GL.
    }
  }
  return chromium.launch({ ...options, args: [...SOFTWARE_GL, ...args] });
}
