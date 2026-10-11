# opencodev2-ttft

Minimal **OpenCode V2** plugin: one `TTFT 1.2s` label in the prompt footer.
No sidebar, TPS, historical averages, backend hooks, polling or network requests.

## Install

```sh
git clone https://github.com/lkonga/opencodev2-ttft.git \
  ~/.local/share/opencodev2-ttft
```

Append its **absolute directory** to `plugins` in your OC2 `cli.json`:

```json
{
  "plugins": ["/absolute/path/to/opencodev2-ttft"]
}
```

Keep existing entries. Reload the **CLI client**; no server restart is needed.
Use your active OC2 config directory; custom wrappers may select a different
location from the default `~/.config/opencode/cli.json`.

## Meaning

- Latest **observed assistant step**: native request-dispatch timestamp → first
  nonempty text, reasoning or tool output. Both timestamps come from the server.
- `TTFT …`: waiting for first output. A new step resets the measurement.
- `TTFT —`: unavailable, attached mid-step, empty/failed step or reconnected.
- Tool-name starts count as output; done-only content counts when delivered.

Not a session average, provider-internal timing, or separate physical-retry metric.
Hidden reasoning is unobservable. Old-session/old-step events cannot overwrite
the selected step's result.

## Compatibility

Verified on Linux with OC2 `2.0.26-dev-patched-710f3f2664` and its shared
Solid/OpenTUI runtime. Other builds are not certified. Requires native step/output
events and the `prompt.footer` plugin slot; no additional core patch is supplied.

Tests cover reset, first-output variants, invalid timing, isolation, cleanup and
real OpenTUI rendering: **11 passing tests** plus strict type checks.

## License

[MIT](LICENSE). A small independent tracker using native OC2 events; not a fork
of the token-usage plugin's historical aggregation implementation.
