# pstack — what we borrow

Lauren Tan (poteto) open-sourced **pstack**, a set of engineering-workflow skills, principles, playbooks, and subagents for coding agents. The central command `/poteto-mode` turns a short request into a structured workflow: pick a playbook, build a task list, delegate, and demand runtime verification.

## Core ideas

1. **Trust before parallelism.** Get one agent to produce verifiable work before running several.
2. **Verification is evidence.** A passing build is not proof. Drive the running app, take screenshots/video, and check the actual behavior.
3. **`control-app`.** A purpose-built verification tool that lets the agent interact with and inspect the app. In pstack, `/create-verification-skill` produces it.
4. **Write less, higher quality.** Avoid filler code and throughput without quality.
5. **Playbooks for recurring work.** Bug fix, feature, refactor, investigation, perf — each has a repeatable method.
6. **Adversarial review.** Interrogate the change; don't accept the first plausible answer.

## What Workbits adopts

- **`packages/harness`** is our `control-app`: screenshots, flows, bots, voice lab, perf, a11y, visual diff, and a report.
- **Phase gates** in `docs/verification/gates.md`: no phase is done without evidence.
- **Vertical slices**: one beautiful room before breadth.
- **Adversarial self-review** at the end of each phase: authz, empty/error/loading, mobile, performance.
- **Subagent briefs** with self-contained context and acceptance criteria; the parent reviews and reruns the gate.
- **Docs as memory**: `docs/progress.md`, ADRs, open questions. Agents forget; the repo shouldn't.

## What Workbits does not adopt

- We don't install the pstack plugin or depend on Cursor-specific commands.
- We don't run a swarm of agents on the same files. One child, one scope.
- We don't treat a child's "done" as proof.
- We don't optimize for agent throughput over product quality.

## Sources

- Daily.dev deep dive: https://daily.dev/posts/a-deep-dive-into-pstack-evqbnto9j
- Community port with docs: https://github.com/ahmedbenaw/pstack
- Lauren's X post: https://x.com/poteto/status/2094457600259842065
- Flavio Copes overview: https://flaviocopes.com/pstack
- Talk breakdown: https://www.youtube.com/watch?v=4wBVuj2an8E
