---
name: testdriver:options
description: Every option you can pass to a TestDriver client, with its default.
---
<!-- Generated from options.mdx. DO NOT EDIT. -->

import { EnterpriseBadge, EnterpriseCta } from '/snippets/enterprise.mdx';

Options control the sandbox, the live preview, the AI, the cache, and redraw detection. A [quick reference](#quick-reference) table at the end lists every option and its default.

## Where to set options

Pass options in any of three places:

```javascript
// 1. The Vitest hook (most common)
const testdriver = TestDriver(context, { os: 'windows' });

// 2. The client constructor
const testdriver = new TestDriver({ os: 'windows' });
```

```javascript vitest.config.mjs
// 3. The Vitest plugin, for every test in the project
import { defineConfig } from 'vitest/config';
import TestDriver from 'testdriverai/vitest';

export default defineConfig({
  test: {
    reporters: ['default', TestDriver({ os: 'windows' })],
    setupFiles: ['testdriverai/vitest/setup'],
  },
});
```

When the same option is set in more than one place, the most specific wins:

1. Options you pass to the hook or the constructor
2. Plugin options in `vitest.config`
3. Environment variables: `TD_OS`, `TD_API_ROOT`, and `TD_E2B_TEMPLATE_ID`
4. Defaults

Options you pass to [`connect()`](/client#connect-options) override the client's values for that connection only.

## Sandbox

These options control the virtual machine that runs your test.

<ParamField path="os" type="'linux' | 'windows'" default="linux">
  The operating system of the sandbox. You can also set this with the `TD_OS` environment variable.

  <EnterpriseBadge /> `'windows'` is available on Enterprise plans.
</ParamField>

<ParamField path="resolution" type="string" default="1366x768">
  The screen resolution of the sandbox, such as `'1920x1080'`.

  <EnterpriseBadge /> Custom resolutions are available on Enterprise plans.
</ParamField>

<ParamField path="newSandbox" type="boolean" default="true">
  Create a new sandbox for this run. Set to `false` to reuse a recent sandbox when one is available. Defaults to `false` when you set `sandboxId` or `reconnect`.
</ParamField>

<ParamField path="reconnect" type="boolean" default="false">
  Reattach to the last sandbox this project used. The SDK records it in `.testdriver/last-sandbox` on every successful connect.

  While `reconnect` is `true`, provision methods such as `chrome()` and `installer()` are skipped, because the app is already running. The sandbox must still be alive. See [`keepAlive`](#param-keep-alive) and [Reuse a sandbox while you iterate](/copilot/running-tests#reuse-a-sandbox-while-you-iterate).
</ParamField>

<ParamField path="sandboxId" type="string">
  Attach to a specific sandbox by its id, for example to pin a chain of tests to one machine. This sets `newSandbox` to `false`.

  Unlike `reconnect`, `sandboxId` alone doesn't skip provision calls. Set `reconnect: true` as well if the app is already running.
</ParamField>

<ParamField path="keepAlive" type="number" default="60000">
  The number of milliseconds to keep the sandbox running after `disconnect()`, so you can reconnect to the same sandbox for debugging. Values above 30 minutes are capped at 30 minutes, and `0` uses the default.
</ParamField>

<ParamField path="debugOnFailure" type="boolean" default="false">
  Keep the sandbox running when a test fails, and print its id so you can reconnect with `sandboxId` and debug. Available only in the Vitest hook.
</ParamField>

<ParamField path="environment" type="object">
  Extra `TD_*` settings for the SDK itself, as key-value pairs. These configure TestDriver on your machine, not environment variables inside the sandbox. To set variables in the sandbox, run a command with [`exec()`](/exec).
</ParamField>

### Example

```javascript
const testdriver = TestDriver(context, {
  os: "windows",
  resolution: "1920x1080",
  keepAlive: 300000,
  debugOnFailure: true,
});
```

## Preview and recording

These options control what you see while the test runs.

<ParamField path="preview" type="'browser' | 'ide' | 'none'" default="browser">
  The preview mode for live test visualization.

  - `"browser"` opens the debugger in your default browser.
  - `"ide"` opens the preview in an editor panel. This needs the [TestDriver extension](/quickstart-vscode) for VS Code or Cursor.
  - `"none"` runs without a visual preview. Use this in CI.
</ParamField>

<ParamField path="headless" type="boolean" default="false">
  **Deprecated.** Use `preview: "none"` instead. `headless: true` maps to `preview: "none"`.
</ParamField>

<ParamField path="dashcam" type="boolean" default="true">
  Record a Dashcam video of the test. See [Dashcam](/dashcam).
</ParamField>

<ParamField path="autoScreenshots" type="boolean" default="false">
  Save a screenshot before and after each `testdriver` method call and each `find()`, and when one fails, to `.testdriver/screenshots/<test file>/`. Actions on an element, like `element.click()`, aren't captured. Files are named like `001-find-before-L42-submit-button.png`. See [Screenshots](/screenshots).
</ParamField>

<ParamField path="logging" type="boolean" default="true">
  Write SDK logs to the console. You can change this at runtime with [`setLogging()`](/client#setlogging-enabled).
</ParamField>

<ParamField path="analytics" type="boolean" default="true">
  Send usage analytics to TestDriver.
</ParamField>

### Example

```javascript
const testdriver = TestDriver(context, {
  preview: process.env.CI ? "none" : "browser",
  autoScreenshots: true,
});
```

## AI and element location

These options control how the AI locates elements and checks assertions.

<ParamField path="verify" type="boolean" default="false">
  Double-check every `find()` result with a second AI call. Off by default, because it makes each call slower.

  When on, after the AI locates an element:

  1. A second AI looks at that spot and confirms it's the element you described.
  2. If it isn't, TestDriver locates the element again with a hint about what was wrong, then checks once more.
  3. If that check also fails, `find()` returns an element whose `found()` is `false`.

  Results that fail the check are never cached. Results served from the cache aren't re-checked.

  Override it for one call with `find(description, { verify: true })`. See [find()](/find).
</ParamField>

<ParamField path="ai" type="object">
  Global AI sampling configuration. These values apply to `find()` verification and to `assert()`. You can override them for one `assert()` call with its `ai` option. `find()` ignores a per-call `ai` option, so set it here.

  <Expandable title="properties">
    <ParamField path="temperature" type="number">
      Controls randomness in AI responses. `0` is deterministic and is best for verification. Higher values give more varied responses. The default is `0` for find verification and the model default for assert.
    </ParamField>

    <ParamField path="top" type="object">
      Nucleus and top-k sampling parameters.

      <Expandable title="properties">
        <ParamField path="p" type="number">
          Top-P (nucleus sampling). Limits token choices to the smallest set whose total probability is more than P. Lower values give more focused responses. Range: 0 to 1.
        </ParamField>

        <ParamField path="k" type="number">
          Top-K sampling. Limits token choices to the K most likely tokens. `1` always picks the most likely token. `0` disables the limit.
        </ParamField>
      </Expandable>
    </ParamField>
  </Expandable>
</ParamField>

### Example

```javascript
const testdriver = TestDriver(context, {
  verify: true,
  ai: { temperature: 0, top: { p: 0.9, k: 40 } },
});
```

## Caching

These options control the element cache, which reuses element positions from a passing run when the screen hasn't changed. See [Caching](/caching).

<ParamField path="cache" type="boolean | object" default="true">
  Pass `false` to turn the cache off, or an object to set the match thresholds.

  `cache: { enabled: false }` and `TD_NO_CACHE=true` also turn it off.

  <Expandable title="advanced config">
    <ParamField path="thresholds" type="object">
      Fine-tune the cache matching.

      <Expandable title="properties">
        <ParamField path="find" type="object">
          Thresholds for `find()` operations.

          <Expandable title="properties">
            <ParamField path="screen" type="number" default="0.05">
              The pixel diff threshold for the screen comparison (0 to 1). `0.05` allows a 5% difference.
            </ParamField>

            <ParamField path="element" type="number" default="0.8">
              The OpenCV template match threshold for the element (0 to 1). `0.8` requires an 80% correlation.
            </ParamField>
          </Expandable>
        </ParamField>

        <ParamField path="assert" type="number" default="0.05">
          The pixel diff threshold for `assert()` operations (0 to 1). `0.05` allows a 5% difference.
        </ParamField>
      </Expandable>
    </ParamField>
  </Expandable>
</ParamField>

<ParamField path="cacheKey" type="string">
  The key the cache is stored under. By default, the SDK uses a hash of the test file, so editing the file starts a fresh cache. Set your own key to keep the cache across edits, or to share it between files.
</ParamField>

<ParamField path="cacheThreshold" type="object">
  **Deprecated.** Use `cache.thresholds` instead.
</ParamField>

### Example

```javascript
const testdriver = TestDriver(context, {
  cache: {
    thresholds: {
      find: { screen: 0.05, element: 0.8 },
      assert: 0.05,
    },
  },
  cacheKey: "login-test",
});
```

## Redraw detection

These options make the SDK wait for the screen to settle after each action. Redraw detection is off by default. See [Redraw](/redraw).

<ParamField path="redraw" type="boolean | object" default="false">
  Turn on screen-change detection with `true`, or pass an object to set the thresholds.

  <Expandable title="advanced config">
    <ParamField path="enabled" type="boolean" default="true">
      Whether redraw detection is on when you pass an object.
    </ParamField>

    <ParamField path="thresholds" type="object">
      Threshold configuration.

      <Expandable title="properties">
        <ParamField path="screen" type="number | false" default="0.05">
          Set to `false` to turn off screen-change detection and wait only for the network. Any number keeps it on; the number itself isn't used, because the change threshold is fixed.
        </ParamField>

        <ParamField path="network" type="boolean" default="false">
          Wait for network activity to stop.
        </ParamField>
      </Expandable>
    </ParamField>
  </Expandable>
</ParamField>

<ParamField path="redrawThreshold" type="number | object">
  **Deprecated.** Use `redraw` instead.
</ParamField>

### Example

```javascript
const testdriver = TestDriver(context, {
  redraw: {
    thresholds: { screen: 0.1, network: true },
  },
});
```

## Self-hosted and infrastructure

Most projects don't need these. They're for self-hosted or custom deployments.

<EnterpriseCta feature="Self-hosting" />

<ParamField path="apiRoot" type="string">
  The API endpoint URL. The default depends on the release channel. You can also set this with the `TD_API_ROOT` environment variable.
</ParamField>

<ParamField path="ip" type="string">
  The IP address of a running sandbox. The SDK connects to this address directly.

  <EnterpriseBadge /> Connecting to your own machines is available on Enterprise plans.
</ParamField>

<ParamField path="sandboxAmi" type="string">
  A custom AMI id for the sandbox instance (AWS deployments). Example: `'ami-1234'`.
</ParamField>

<ParamField path="sandboxInstance" type="string">
  The EC2 instance type for the sandbox (AWS deployments). Example: `'i3.metal'`.
</ParamField>

<ParamField path="e2bTemplateId" type="string">
  The E2B template id to use when the SDK creates the sandbox. You can also set this with the `TD_E2B_TEMPLATE_ID` environment variable.
</ParamField>

## Quick reference

| Option | Type | Default |
|---|---|---|
| `os` | `'linux' \| 'windows'` | `'linux'` |
| `resolution` | `string` | `'1366x768'` |
| `newSandbox` | `boolean` | `true` |
| `reconnect` | `boolean` | `false` |
| `sandboxId` | `string` | — |
| `keepAlive` | `number` | `60000` |
| `debugOnFailure` | `boolean` | `false` |
| `environment` | `object` | — |
| `preview` | `'browser' \| 'ide' \| 'none'` | `'browser'` |
| `dashcam` | `boolean` | `true` |
| `autoScreenshots` | `boolean` | `false` |
| `logging` | `boolean` | `true` |
| `analytics` | `boolean` | `true` |
| `verify` | `boolean` | `false` |
| `ai` | `object` | — |
| `cache` | `boolean \| object` | `true` |
| `cacheKey` | `string` | — |
| `redraw` | `boolean \| object` | `false` |
| `apiRoot` | `string` | channel default |
| `ip` | `string` | — |
| `sandboxAmi` | `string` | — |
| `sandboxInstance` | `string` | — |
| `e2bTemplateId` | `string` | — |
