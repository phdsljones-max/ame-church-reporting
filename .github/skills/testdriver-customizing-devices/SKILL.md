---
name: testdriver:customizing-devices
description: Choose the sandbox OS and resolution, preview mode, recording, and how long it stays alive.
---
<!-- Generated from customizing-devices.mdx. DO NOT EDIT. -->

import { EnterpriseBadge, EnterpriseCta } from '/snippets/enterprise.mdx';

Every test runs in a sandbox: a fresh virtual machine. Pass options to `TestDriver(context, options)` to change it.

```javascript
const testdriver = TestDriver(context, {
  os: 'windows',
  preview: 'none',
  keepAlive: 300000,
});
```

This page covers the common changes. For every option and its default, see [Options](/options).

## Choose the operating system

Sandboxes run Linux by default. Set `os` to run on Windows:

```javascript
const testdriver = TestDriver(context, { os: 'windows' });
```

<EnterpriseCta feature="Windows sandboxes" plural />

The `TestDriver()` hook also reads the `TD_OS` environment variable when you don't pass `os`. That lets you run one suite on both systems without changing code:

```bash
TD_OS=windows npx vitest run
```

In GitHub Actions, run the suite once per OS with a matrix:

```yaml .github/workflows/testdriver.yml
strategy:
  matrix:
    td-os: [linux, windows]
steps:
  # ...checkout, install, and authenticate steps
  - name: Run tests on ${{ matrix.td-os }}
    run: npx vitest run
    env:
      TD_OS: ${{ matrix.td-os }}
```

See [Run in CI/CD](/ci-cd) for the full workflow.

## Set the screen resolution

The default resolution is `1366x768`. Set `resolution` to change it:

```javascript
const testdriver = TestDriver(context, { resolution: '1920x1080' });
```

<EnterpriseCta feature="Custom screen resolution" />

## Choose how to watch the run

`preview` sets where the live view of the sandbox opens:

- `"browser"` opens it in your default browser. This is the default.
- `"ide"` opens it in an editor panel. This needs the [TestDriver extension](/quickstart-vscode) for VS Code or Cursor.
- `"none"` turns the live view off. Use this in CI.

```javascript
const testdriver = TestDriver(context, {
  preview: process.env.CI ? 'none' : 'browser',
});
```

`headless: true` is deprecated. Use `preview: "none"` instead.

## Record the run

- **Video.** [Dashcam](/dashcam) records every test by default. Set `dashcam: false` to turn it off.
- **Screenshots.** Set `autoScreenshots: true` to save a screenshot before and after each command. They're off by default. See [Debug a failing test](/debugging-with-screenshots).

```javascript
const testdriver = TestDriver(context, {
  dashcam: false,
  autoScreenshots: true,
});
```

## Keep a sandbox alive

After a test ends, its sandbox keeps running for `keepAlive` milliseconds, so you can reconnect to it:

- The default is `60000` (60 seconds).
- Values above 30 minutes are capped at 30 minutes.
- `0` uses the default. There's no value that ends the sandbox immediately.
- A sandbox never runs longer than 2 hours in total.

```javascript
const testdriver = TestDriver(context, {
  keepAlive: 10 * 60 * 1000, // 10 minutes
});
```

To reconnect from another test file, set `reconnect: true`. TestDriver reattaches to the last sandbox it used and skips `provision` calls, because the app is already open. See [Reuse a sandbox while you iterate](/copilot/running-tests#reuse-a-sandbox-while-you-iterate).

To attach to a specific sandbox, pass its id as `sandboxId`. Unlike `reconnect`, `sandboxId` alone still runs `provision` calls.

### Keep the sandbox when a test fails

Set `debugOnFailure: true` to keep the sandbox running when a test fails. TestDriver prints the sandbox id so you can connect to it and look around.

```javascript
const testdriver = TestDriver(context, { debugOnFailure: true });
```

## Run on your own machine

To run tests on a machine you manage, set `ip` to its address. See [Run on your own machine](/bring-your-own-machine).

<EnterpriseCta feature="Connecting to your own machines" />

```javascript
const testdriver = TestDriver(context, { ip: '203.0.113.42' });
```

## Next steps

<CardGroup cols={2}>
  <Card title="Options" icon="sliders" href="/options">
    Every client option, with its default.
  </Card>
  <Card title="Client & connection" icon="plug" href="/client">
    Create, connect, and disconnect a client.
  </Card>
  <Card title="Run tests" icon="play" href="/copilot/running-tests">
    Run tests locally and reuse a sandbox.
  </Card>
  <Card title="Run in CI/CD" icon="code-branch" href="/ci-cd">
    Run tests on every pull request.
  </Card>
</CardGroup>
