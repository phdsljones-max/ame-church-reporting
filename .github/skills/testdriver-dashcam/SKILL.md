---
name: testdriver:dashcam
description: Every test is recorded as a video replay with logs, linked when the test ends.
---
<!-- Generated from dashcam.mdx. DO NOT EDIT. -->

Dashcam records the sandbox screen while your test runs and saves it as a replay you can watch in the TestDriver console.

- Recording is on by default. You don't need to configure anything.
- The replay includes the console output from your test and, for websites, the page's network traffic.
- When the test ends, TestDriver prints a link to the replay.

## How recording works

1. **A provision method starts it.** Every [provision method](/provision) starts Dashcam after it launches your app: `chrome()`, `chromeExtension()`, `vscode()`, `installer()`, `electron()`, and `dashcam()`.
2. **The test runs.** Everything on the sandbox screen is recorded.
3. **The test ends.** The [Vitest hook](/client#testdriver-context-options) stops the recording, uploads your test's console output to the replay, and prints the link:

```text
🎥 Dashcam URL: https://console.testdriver.ai/replay/6789abcdef0123456789abcd
```

`chrome()` also records the network traffic for the domain of the URL it opens.

When Vitest retries a failed test, each attempt gets its own recording and link.

## Add a log file to the replay

Call `provision.dashcam()` to show a log file from the sandbox next to the video. Call it before the method that launches your app, so the log is set up before recording starts:

```javascript tests/checkout.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Checkout', () => {
  it('records the app log', async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.dashcam({
      title: 'Checkout flow',
      logPath: '/tmp/my-app.log',
      logName: 'App log',
    });
    await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });

    const result = await testdriver.assert('the login form is visible');
    expect(result).toBe(true);
  });
});
```

TestDriver creates the file if it doesn't exist. Anything your app writes to it appears in the replay.

<ParamField path="logPath" type="string">
  The log file in the sandbox. Defaults to `/tmp/testdriver.log` on Linux, or `C:\Users\testdriver\testdriver.log` on Windows.
</ParamField>

<ParamField path="logName" type="string" default="TestDriver Log">
  The log's name in the replay.
</ParamField>

<ParamField path="webLogs" type="boolean" default="true">
  Also record network traffic. It covers the domain opened with `chrome()` if that ran first, or all traffic otherwise.
</ParamField>

<ParamField path="title" type="string">
  The recording's title. Defaults to the test file's name and the test's name, such as `checkout - records the app log`.
</ParamField>

## Turn recording off

Pass `dashcam: false` when you create the client:

```javascript
const testdriver = TestDriver(context, { dashcam: false });
```

Provision methods then skip recording, and the test prints no replay link.

## Control the recording yourself

`testdriver.dashcam` gives you direct control of the recorder. Most tests don't need it, because the provision methods and the Vitest hook handle recording for you.

```javascript
await testdriver.dashcam.addApplicationLog('Google Chrome', 'Browser logs');
await testdriver.dashcam.start();

// ...test steps...

const replayUrl = await testdriver.dashcam.stop();
console.log(replayUrl);
```

| Method | What it does |
| --- | --- |
| `start()` | Starts recording. Does nothing if it's already recording. |
| `stop()` | Stops recording and resolves to the replay URL, or `null` if there isn't one. |
| `isRecording()` | Resolves to `true` while recording. |
| `setTitle(title)` | Sets the title. Call it before `start()`. |
| `addFileLog(path, name)` | Adds a log file from the sandbox to the replay. |
| `addApplicationLog(application, name)` | Adds an application's logs to the replay. |
| `addWebLog(pattern, name)` | Records network traffic for URLs matching `pattern`, such as `'*example.com*'`. |
| `getElapsedTime()` | Milliseconds since recording started, or `null` when not recording. |

Add logs before you call `start()`. If you call `stop()` yourself, the Vitest hook doesn't print the link, so log it as shown above.

With `dashcam: false`, these methods do nothing and `stop()` resolves to `null`.

<Note>
  Older tests may use `chrome()` from `testdriverai/presets` to get a `dashcam` object. Presets are deprecated. Use `TestDriver(context)` and a provision method instead.
</Note>

## Related

- [Launch apps](/provision): the provision methods that start recording
- [Debug a failing test](/debugging-with-screenshots): use the replay to find out why a test failed
- [Test result JSON](/test-results-json): read the replay URL from a file after the run
- [Options](/options#preview-and-recording): every client option
