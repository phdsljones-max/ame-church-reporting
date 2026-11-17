---
name: testdriver:redraw
description: Make actions wait until the screen stops changing before the next step runs.
---
<!-- Generated from redraw.mdx. DO NOT EDIT. -->

Redraw detection makes each action wait until the screen has changed and then stopped changing.

- Use it for apps with animations, page transitions, or content that loads after a click.
- It's off by default. Without it, the next command runs as soon as the action is sent.
- It can also wait for network traffic in the sandbox to die down.

## Turn it on

Pass `redraw: true` when you create the client:

```javascript tests/search.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Search', () => {
  it('shows results after searching', async (context) => {
    const testdriver = TestDriver(context, { redraw: true });
    await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });

    // With redraw on, click() returns once the error message has finished drawing
    await testdriver.find('Sign in button below the password field').click();

    const result = await testdriver.assert('an error says the fields are required');
    expect(result).toBe(true);
  });
});
```

Every click, hover, type, key press, scroll, and `focusApplication()` call now waits for the screen to settle.

## What it waits for

TestDriver takes a small screenshot right before the action, then one every 500 ms after it. The screen counts as settled when both of these are true:

1. **The screen changed.** A frame differs from the "before" screenshot by more than 0.1% of its pixels.
2. **The screen stopped changing.** The latest frame differs from the previous one by less than 0.1%, or by less than the average of the last 10 frames.

If the screen doesn't settle in time, the command carries on anyway. It doesn't throw.

| Command | Waits at most |
| --- | --- |
| `click()`, `doubleClick()`, `rightClick()`, `mouseDown()`, `mouseUp()` | 5 s |
| `hover()` | 2.5 s |
| `type()` | 5 s |
| `pressKeys()` | 5 s |
| `scroll()` | 5 s |
| `focusApplication()` | 1 s |

<Warning>
  An action that doesn't change the screen never meets the first condition. It waits the full timeout, such as 5 seconds for a click. Turn redraw off for those commands (see below) or leave it off and use [`wait()`](/wait) where you need it.
</Warning>

## Wait for network traffic too

Set `thresholds.network` to also wait until the sandbox's network traffic drops below its recent average:

```javascript
const testdriver = TestDriver(context, {
  redraw: { thresholds: { network: true } },
});
```

TestDriver then waits for both the screen and the network to settle, within the same timeouts.

To wait for the network only, turn off the screen check with `thresholds: { screen: false, network: true }`.

## Options

<ParamField path="redraw" type="boolean | object" default="false">
  `true` turns on screen detection. Pass an object to choose what to wait for.

  <Expandable title="properties">
    <ParamField path="enabled" type="boolean" default="true">
      Whether redraw detection is on when you pass an object.
    </ParamField>
    <ParamField path="thresholds" type="object">
      <Expandable title="properties">
        <ParamField path="screen" type="number | false">
          Set to `false` to skip the screen check. Any other value leaves it on. The 0.1% change threshold is fixed.
        </ParamField>
        <ParamField path="network" type="boolean" default="false">
          Also wait for network traffic in the sandbox to settle.
        </ParamField>
      </Expandable>
    </ParamField>
  </Expandable>
</ParamField>

<Note>
  Older tests may use `redrawThreshold`, or `diffThreshold`, `screenRedraw`, and `networkMonitor` inside `redraw`. They still work, but are deprecated. Use `redraw` with `thresholds` instead.
</Note>

## Override it for one command

The client's action methods accept a `redraw` object as an option. It applies to that call only:

```javascript
// Wait for this key press even though redraw is off for the client
await testdriver.pressKeys(['enter'], { redraw: { enabled: true } });

// Skip the wait for a click you know changes nothing on screen
await testdriver.click({ x: 640, y: 360, redraw: { enabled: false } });
```

This works on `testdriver.click()`, `hover()`, `type()`, `pressKeys()`, `scroll()`, and `focusApplication()`.

- Pass an object. A per-command `redraw: true` or `redraw: false` is ignored.
- Element methods such as `element.click()` don't take options. They always use the client's setting.

## Watch it work

Redraw emits two events on the client's [event emitter](/events#redraw-events):

- `redraw:status` on every check, with the current screen and network state.
- `redraw:complete` when the wait ends, with `isTimeout` and `timeElapsed`.

```javascript
testdriver.getEmitter().on('redraw:complete', ({ isTimeout, timeElapsed }) => {
  if (isTimeout) {
    console.warn(`Screen didn't settle within ${timeElapsed} ms`);
  }
});
```

## When to use it

Turn redraw on when:

- Clicks open pages, modals, or menus that animate in.
- Scrolling loads more content.
- Typing triggers autocomplete or validation messages.

Leave it off when:

- Your tests already pass reliably without it. Each action takes longer with it on.
- Many actions don't visibly change the screen.
- You already wait with `find()` and a `timeout`, which keeps looking until the element appears.

## Related

- [Options](/options#redraw-detection): every client option
- [Events](/events): the full list of events
- [wait()](/wait): pause for a fixed time
- [Locate elements](/locating-elements): wait for an element to appear with `find()`
