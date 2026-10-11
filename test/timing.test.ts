import { test, expect } from "bun:test"
import { createTiming } from "../timing"

const start = (sessionID: string, assistantMessageID: string, started: number) => ({ type: "session.step.started", created: started, data: { sessionID, assistantMessageID, started } })
const delta = (sessionID: string, assistantMessageID: string, created: number, type = "session.text.delta", text = "token") => ({ type, created, data: { sessionID, assistantMessageID, delta: text } })

test("latest step resets; a past ten-second sample is not averaged", () => {
  const t = createTiming()
  expect(t.label("s")).toBe("TTFT —")
  t.handle(start("s", "a", 1000));expect(t.label("s")).toBe("TTFT …")
  t.handle(delta("s", "a", 11000));expect(t.label("s")).toBe("TTFT 10.0s")
  t.handle(start("s", "b", 12000));expect(t.label("s")).toBe("TTFT …")
  t.handle(delta("s", "b", 12300));expect(t.label("s")).toBe("TTFT 0.3s")
  t.handle(delta("s", "b", 16000));expect(t.label("s")).toBe("TTFT 0.3s")
})

for (const type of ["session.text.delta", "session.reasoning.delta", "session.tool.input.delta"]) {
  test(`first content boundary (${type})`, () => {
    const t = createTiming();t.handle(start("s", "m", 1000))
    t.handle(delta("s", "m", 1100, type, ""));expect(t.label("s")).toBe("TTFT …")
    t.handle(delta("s", "m", 1500, type));expect(t.label("s")).toBe("TTFT 0.5s")
  })
}

test("late prior-step events and other sessions cannot overwrite current result", () => {
  const t = createTiming();t.handle(start("s", "a", 1000));t.handle(start("s", "b", 2000))
  t.handle(delta("s", "a", 2200));expect(t.label("s")).toBe("TTFT …")
  t.handle(start("other", "o", 2000));t.handle(delta("other", "o", 8000));expect(t.label("s")).toBe("TTFT …")
  t.handle(delta("s", "b", 2300));t.handle(start("s", "a", 1000));expect(t.label("s")).toBe("TTFT 0.3s")
  expect(t.label("other")).toBe("TTFT 6.0s")
})

test("invalid and unavailable timing never fabricates zero or a historical number", () => {
  const t = createTiming();t.handle(delta("s", "m", 5000));expect(t.label("s")).toBe("TTFT —")
  t.handle(start("s", "m", NaN));expect(t.label("s")).toBe("TTFT —")
  t.handle(start("s", "m", 1000));t.handle(delta("s", "m", 999));t.handle(delta("s", "m", Infinity));expect(t.label("s")).toBe("TTFT …")
  t.handle({ type: "session.step.failed", data: { sessionID: "s", assistantMessageID: "m" } });expect(t.label("s")).toBe("TTFT —")
  t.handle(delta("s", "m", 5000));expect(t.label("s")).toBe("TTFT —")
})

test("reconnect, deletion and dispose clear retained latest timing", () => {
  const t = createTiming();t.handle(start("s", "m", 1000));t.handle(delta("s", "m", 1500));
  t.handle(start("s", "m", 1000));expect(t.label("s")).toBe("TTFT 0.5s")
  t.handle({ type: "server.connected" });expect(t.label("s")).toBe("TTFT —")
  t.handle(start("s", "n", 2000));t.handle({ type: "session.deleted", data: { sessionID: "s" } });expect(t.label("s")).toBe("TTFT —")
  t.handle(start("s", "o", 3000));t.clear();expect(t.label("s")).toBe("TTFT —")
})
