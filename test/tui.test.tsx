/** @jsxImportSource @opentui/solid */
import { test, expect } from "bun:test"
import { RGBA } from "@opentui/core"
import { testRender } from "@opentui/solid"
import { createSignal } from "solid-js"
import plugin from "../tui"

test("actual plugin renders only latest-step TTFT in native prompt footer and disposes", async () => {
  let listener: ((value: { details: unknown }) => void) | undefined
  let reconnect: (() => void) | undefined
  let claim: { append: string; render(input: { sessionID?: string }): any } | undefined
  let disposed = 0
  const context = {
    theme: { text: { muted: RGBA.fromInts(120, 120, 120) } },
    data: {
      listen(fn: typeof listener) { listener = fn; return () => { listener = undefined; disposed++ } },
      on(kind: string, fn: () => void) { expect(kind).toBe("server.connected"); reconnect = fn; return () => { reconnect = undefined; disposed++ } },
    },
    ui: { slot(value: typeof claim) { claim = value; return () => { disposed++ } } },
  }
  const cleanup = plugin.setup!(context as never) as () => void
  expect(claim?.append).toBe("prompt.footer")
  const [session, select] = createSignal("s")
  function Probe() { return claim!.render({ get sessionID() { return session() } }) }
  const app = await testRender(() => <Probe />, { width: 32, height: 3 })
  app.renderer.start()
  const emit = (type: string, started?: number, created?: number, assistantMessageID = "m") => listener!({ details: {
    type, created, data: { sessionID: "s", assistantMessageID, ...(started === undefined ? { delta: "token" } : { started }) },
  } })
  try {
    await app.waitForFrame((frame) => frame.includes("TTFT —"))
    emit("session.step.started", 1000, 1000)
    await app.waitForFrame((frame) => frame.includes("TTFT …"))
    emit("session.reasoning.delta", undefined, 11000)
    await app.waitForFrame((frame) => frame.includes("TTFT 10.0s"))
    emit("session.step.started", 12000, 12000, "next")
    await app.waitForFrame((frame) => frame.includes("TTFT …"))
    emit("session.text.delta", undefined, 12300, "next")
    await app.waitForFrame((frame) => frame.includes("TTFT 0.3s"))
    const frame = app.captureCharFrame()
    expect(frame).not.toContain("TPS")
    expect(frame).not.toContain("Token Usage")
    select("other")
    await app.waitForFrame((frame) => frame.includes("TTFT —"))
    select("s")
    await app.waitForFrame((frame) => frame.includes("TTFT 0.3s"))
    reconnect!()
    await app.waitForFrame((frame) => frame.includes("TTFT —"))
  } finally { cleanup(); app.renderer.destroy() }
  expect(disposed).toBe(3)
  expect(listener).toBeUndefined()
  expect(reconnect).toBeUndefined()
})
