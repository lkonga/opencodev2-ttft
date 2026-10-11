/** @jsxImportSource @opentui/solid */
import { Plugin } from "@opencode/plugin/tui"
import { createSignal } from "solid-js"
import { createTiming } from "./timing"

export default Plugin.define({
  id: "opencodev2-ttft",
  setup(context) {
    const timing = createTiming()
    const [revision, update] = createSignal(0)
    const refresh = () => update((value) => value + 1)
    const stop = context.data.listen(({ details }) => { if (timing.handle(details)) refresh() })
    const reconnect = context.data.on("server.connected", () => { timing.clear(); refresh() })
    const remove = context.ui.slot({
      append: "prompt.footer",
      render: (props) => {
        const label = () => { revision(); return timing.label(props.sessionID) }
        return <text fg={context.theme.text.muted} flexShrink={0} wrapMode="none" paddingLeft={1}>{label()}</text>
      },
    })
    return () => { remove(); stop(); reconnect(); timing.clear() }
  },
})
