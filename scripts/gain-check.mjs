import { proximityGain } from "../apps/web/src/voice/gain.ts";

const cases = [
  [0, 1],
  [1.2, 1],
  [4.35, 0.5],
  [7.5, 0],
  [12, 0],
];

for (const [distance, expected] of cases) {
  const actual = proximityGain(distance);
  const ok = Math.abs(actual - expected) < 0.001;
  console.log(`${ok ? "PASS" : "FAIL"} distance=${distance} gain=${actual.toFixed(3)} expected=${expected}`);
  if (!ok) process.exitCode = 1;
}
