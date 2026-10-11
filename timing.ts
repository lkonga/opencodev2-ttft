type WireEvent = { type: string; created?: number; data?: unknown }
type Step = { messageID: string; started: number; state: "waiting" | "measured" | "unavailable"; milliseconds?: number }
const timestamp = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0
const deltas = new Set(["session.text.delta", "session.reasoning.delta", "session.tool.input.delta"])

/** Uses server timestamps on both ends. Never subtract client arrival time or
 * reconstruct first output from completed text/history. One latest step per
 * session only, with no averages, polling, storage, model hooks or provider calls. */
export function createTiming() {
  const latest = new Map<string, Step>()
  return {
    label(sessionID?: string) {
      const value = sessionID && latest.get(sessionID)
      if (!value || value.state === "unavailable") return "TTFT —"
      if (value.state === "waiting") return "TTFT …"
      return `TTFT ${(value.milliseconds! / 1000).toFixed(1)}s`
    },
    clear() { latest.clear() },
    handle(event: WireEvent): boolean {
      if (event.type === "server.connected" || event.type === "server.disconnected") {
        const changed = latest.size > 0
        latest.clear()
        return changed
      }
      if (!event.data || typeof event.data !== "object") return false
      const data = event.data as Record<string, unknown>
      if (typeof data.sessionID !== "string") return false
      const sessionID = data.sessionID
      if (event.type === "session.deleted") return latest.delete(sessionID)
      if (typeof data.assistantMessageID !== "string") return false
      const step = latest.get(sessionID)
      if (event.type === "session.step.started") {
        if (!timestamp(data.started)) return false
        if (step && data.started <= step.started) return false
        latest.set(sessionID, { messageID: data.assistantMessageID, started: data.started, state: "waiting" })
        return true
      }
      if (!step || step.messageID !== data.assistantMessageID || step.state !== "waiting") return false
      const firstOutput = deltas.has(event.type) ? data.delta :
        event.type === "session.tool.input.started" ? data.name :
        event.type === "session.text.ended" || event.type === "session.reasoning.ended" ? data.text : undefined
      if (typeof firstOutput === "string" && firstOutput.length) {
        if (!timestamp(event.created) || event.created < step.started) return false
        step.milliseconds = event.created - step.started
        step.state = "measured"
        return true
      }
      if (event.type === "session.step.failed" || event.type === "session.step.ended") {
        step.state = "unavailable"
        return true
      }
      return false
    },
  }
}
