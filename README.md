# Minimal OC2 TTFT

One prompt-footer label: **`TTFT 1.2s`**. No TPS, sidebar, token/cost report,
history aggregation, server hook, storage or provider call.

Measures the latest **observed native assistant step**: request-dispatch
`session.step.started.data.started` to the first nonempty text, reasoning or
tool-input output's server timestamp. A tool-name start is already observable
output; done-only text/reasoning is measured when delivered if no delta arrived.
Reasoning counts as the first token, not
only visible final text. This is observable upstream delivery latency, not
provider-internal execution or user-prompt-to-answer wall time.

- New step: `TTFT …` until first content, then its value is held.
- Next step: reset immediately; **never a session/tree historical average**.
- Client attached mid-step, failed/empty step or reconnect: `TTFT —` rather than
  guessing from old messages or displaying a stale value.
- Other sessions, late previous-step deltas and invalid timestamps cannot change
  the selected session's value. No timers or histories are scanned.

CLI-only registration points to this package in OC2 `cli.json.plugins`.
Verified target: OC2 `2.0.26-dev-patched-710f3f2664`, Linux/Bun with the host's
shared Solid/OpenTUI runtime. No core patch/server restart is required.

Uses the same native-event boundaries inspected in the MIT-licensed
`chenlongapps/opencode-token-usage@0.4.9`, but this is a separate small tracker;
it does not copy that package's history-average/controller/UI implementation.
No claim is made for untested OC2 versions or hidden provider reasoning.
