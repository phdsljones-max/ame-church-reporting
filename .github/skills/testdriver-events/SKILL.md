---
name: testdriver:events
description: Listen to what TestDriver does during a test through its event emitter.
---
<!-- Generated from events.mdx. DO NOT EDIT. -->

TestDriver reports what it's doing through an event emitter. Get it with [`getEmitter()`](/client#getemitter) and listen with `on()`:

```javascript
const emitter = testdriver.getEmitter();

emitter.on('sandbox:progress', ({ step, message }) => {
  console.log(`[${step}] ${message}`);
});
```

The emitter is an [EventEmitter2](https://github.com/EventEmitter2/EventEmitter2) instance. Event names are segments separated by colons, such as `redraw:complete`.

## Listen in a test

The emitter exists as soon as you create the client, so add listeners before the first command:

```javascript tests/login.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Login', () => {
  it('shows an error for an empty form', async (context) => {
    const testdriver = TestDriver(context);
    const emitter = testdriver.getEmitter();

    const clicks = [];
    emitter.on('mouse-click', ({ x, y, button }) => {
      clicks.push({ x, y, button });
    });

    await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });
    await testdriver.find('Sign in button below the password field').click();

    console.log(clicks); // e.g. [{ x: 683, y: 412, button: 'left' }]
    expect(await testdriver.assert('an error says the fields are required')).toBe(true);
  });
});
```

## Use wildcards

`*` matches one segment. `**` matches any number of segments. Use a `function` listener, not an arrow function, to read the event's name from `this.event`:

```javascript
// Every error event: error:fatal, error:sdk, and so on
emitter.on('error:*', function (error) {
  console.error(`[${this.event}]`, error);
});

// Every event, with its arguments
emitter.on('**', function (...args) {
  console.debug(this.event, ...args);
});
```

`log:*` matches `log:log` and `log:warn` but not `log:markdown:start`, which has three segments. Use `log:**` to match all of them.

## Log events

The SDK prints these to the console unless you turn logging off with the `logging` option.

| Event | Arguments | When |
| --- | --- | --- |
| `log:log` | `(message: string)` | General output, such as each action and `find()` |
| `log:warn` | `(message: string)` | A warning |
| `log:debug` | `(message: string)` | Debug detail. Always emitted, but printed only when `VERBOSE` or `TD_DEBUG` is set |
| `log:narration` | `(message: string, overwrite?: boolean)` | Progress detail for an action, such as how long a redraw wait took |
| `log:markdown` | `(markdown: string)` | A complete Markdown message from `ai()` |
| `log:markdown:start` | `(streamId: string)` | `ai()` starts streaming a Markdown message |
| `log:markdown:chunk` | `(streamId: string, chunk: string)` | The next piece of that message |
| `log:markdown:end` | `(streamId: string)` | The message is complete |

There's no `log:info` or `log:error` in the event list. Listen to `log:log` and `error:*` instead.

## Error events

| Event | Arguments | When |
| --- | --- | --- |
| `error:fatal` | `(error: string \| Error)` | TestDriver hit an error it can't recover from |
| `error:general` | `(message: string)` | A non-fatal error |
| `error:sdk` | `({ message, code, ... })` | A request to the TestDriver API failed |
| `error:sandbox` | `(message: string)` | The sandbox reported an error, or the realtime connection to it failed |

## Sandbox events

| Event | Arguments | When |
| --- | --- | --- |
| `sandbox:authenticated` | `({ traceId })` | The connection to the sandbox is authenticated |
| `sandbox:connected` | none | The client is connected to a sandbox |
| `sandbox:progress` | `({ step, message })` | A setup step while the sandbox starts, or recovery after a dropped connection |
| `sandbox:sent` | `(message: object)` | A message was sent to the sandbox |
| `sandbox:received` | none | The sandbox replied to a message |
| `sandbox:file` | `(message: object)` | The sandbox sent a file message |
| `show-window` | `(url: string)` | The live preview URL is ready to open |

## Action events

| Event | Arguments | When |
| --- | --- | --- |
| `mouse-click` | `({ x, y, button, double })` | A click, double-click, right-click, `mouseDown()`, or `mouseUp()` was sent. `button` is `'left'` or `'right'`, and `double` is `true` for a double-click |
| `exec:output` | `({ chunk, requestId })` | A piece of output from a running [`exec()`](/exec) command |
| `screen-capture:start` | `({ scale, silent, display })` | TestDriver starts capturing the screen |
| `screen-capture:end` | `({ scale, silent, display })` | The capture finished |
| `screen-capture:error` | `({ error, scale, silent, display })` | The capture failed |

## Redraw events

Emitted only when [redraw detection](/redraw) is on.

| Event | Arguments | When |
| --- | --- | --- |
| `redraw:status` | `(status: object)` | Every 500 ms while TestDriver waits for the screen to settle |
| `redraw:complete` | `(result: object)` | The wait ended, either settled or timed out |

<ResponseField name="redraw:status" type="object">
  <Expandable title="properties">
    <ResponseField name="redraw" type="object">
      Screen state: `enabled`, `settled`, `hasChangedFromInitial`, `consecutiveFramesStable` (booleans), `diffFromInitial` and `diffFromLast` (percent of pixels that differ), and `text` (a short summary for the console).
    </ResponseField>
    <ResponseField name="network" type="object">
      Network state: `enabled`, `settled` (booleans), `rxBytes` and `txBytes` (bytes since the last check), and `text`.
    </ResponseField>
    <ResponseField name="timeout" type="object">
      Timing: `isTimeout` (boolean), `elapsed` and `max` (milliseconds), and `text`.
    </ResponseField>
  </Expandable>
</ResponseField>

<ResponseField name="redraw:complete" type="object">
  <Expandable title="properties">
    <ResponseField name="screenSettled" type="boolean">
      Whether the screen settled. `true` when the screen check is off.
    </ResponseField>
    <ResponseField name="networkSettled" type="boolean">
      Whether network traffic settled. `true` when the network check is off.
    </ResponseField>
    <ResponseField name="hasChangedFromInitial" type="boolean">
      Whether the screen changed after the action.
    </ResponseField>
    <ResponseField name="consecutiveFramesStable" type="boolean">
      Whether the last frames stopped changing.
    </ResponseField>
    <ResponseField name="isTimeout" type="boolean">
      Whether the wait ended because it ran out of time.
    </ResponseField>
    <ResponseField name="timeElapsed" type="number">
      How long the wait took, in milliseconds.
    </ResponseField>
  </Expandable>
</ResponseField>

## API request events

| Event | Arguments | When |
| --- | --- | --- |
| `sdk:request` | `({ path })` | A request to the TestDriver API starts |
| `sdk:response` | `({ path })` | The API responded |
| `sdk:retry` | `({ path, attempt, error, delayMs })` | A failed request will be retried after `delayMs` milliseconds |

## ai() command events

These fire for the commands the AI runs inside [`ai()`](/errors#aierror). Commands you call yourself, such as `testdriver.click()`, don't emit them.

| Event | Arguments |
| --- | --- |
| `command:start` | `({ command, depth, data, timestamp, sourcePosition })` |
| `command:status` | `({ command, status: 'executing', data, depth, timestamp })` |
| `command:progress` | `({ command, status: 'completed', timing, data, depth, timestamp })` |
| `command:success` | `({ command, depth, data, duration, response, timestamp, sourcePosition })` |
| `command:error` | `({ command, depth, data, error, duration, timestamp, sourcePosition })` |

- `command` is the command name, and `data` is the full command the AI generated.
- `error` is the error message as a string.
- `timing` and `duration` are in milliseconds.

## Other events

| Event | Arguments | When |
| --- | --- | --- |
| `runner:log` | `({ level, message, timestamp })` | A log line from the sandbox's runner. Sent only when debug logging is on |
| `exit` | `(exitCode: number)` | The agent stopped. `0` means success, `1` means failure |

The event list also contains names that Vitest tests don't emit:

- `step:*`, `test:*`, and `file:*` come from running YAML test files.
- `command:stop`, `command:location`, `sandbox:error`, `sandbox:disconnected`, `sdk:error`, `sdk:progress`, `status`, `mouse-move`, `terminal:stdout`, `terminal:stderr`, `matches:show`, and `vm:show` aren't currently emitted.

## Related

- [getEmitter()](/client#getemitter): get the client's emitter
- [Redraw](/redraw): what the redraw events measure
- [Errors](/errors): the errors TestDriver throws
- [Debug a failing test](/debugging-with-screenshots): find out why a test failed
