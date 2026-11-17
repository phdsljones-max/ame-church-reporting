---
name: testdriver:performing-actions
description: Click, type, scroll, and read the screen, and wait for a changing UI.
---
<!-- Generated from performing-actions.mdx. DO NOT EDIT. -->

A TestDriver test acts on the screen the way a person does, with the real mouse and keyboard.

- Find an element by describing it.
- Click it, type into it, or scroll past it.
- Wait for a UI that loads, animates, or changes as you use it.

## Find an element, then act on it

`find()` returns an element, and the element has methods for mouse actions:

```javascript
const submitButton = await testdriver.find('Submit button');
await submitButton.click();
```

You can also chain the action straight onto `find()`:

```javascript
await testdriver.find('Submit button').click();
```

| Method | What it does |
| --- | --- |
| [`click()`](/click) | Left-clicks the element |
| [`doubleClick()`](/double-click) | Double-clicks the element |
| [`rightClick()`](/right-click) | Right-clicks the element, for example to open a context menu |
| [`hover()`](/hover) | Moves the mouse over the element without clicking |
| [`mouseDown()`](/mouse-down) and [`mouseUp()`](/mouse-up) | Press and release the mouse button separately, for dragging |

If `find()` can't locate the element, it returns an element whose `found()` is `false`. Calling one of these methods on it throws an `ElementNotFoundError`.

See [Locate elements](/locating-elements) to write descriptions that find the right element.

## Type text

[`type()`](/type) types into whatever has keyboard focus, so click the field first:

```javascript
const emailField = await testdriver.find('Email input field');
await emailField.click();
await testdriver.type('user@example.com');
```

Pass `secret: true` for passwords and other sensitive values. TestDriver then doesn't log or store the text:

```javascript
await testdriver.find('Password input field').click();
await testdriver.type(process.env.TD_PASSWORD, { secret: true });
```

See [Secrets](/secrets) for keeping credentials out of your test code.

## Press keys and shortcuts

[`pressKeys()`](/press-keys) takes an array of keys and presses them together:

```javascript
await testdriver.pressKeys(['enter']);
await testdriver.pressKeys(['ctrl', 'a']);
await testdriver.pressKeys(['ctrl', 'shift', 'i']);
```

## Scroll

[`scroll()`](/scroll) scrolls the page up or down with the mouse wheel. The default `amount` is 300:

```javascript
await testdriver.scroll('down', { amount: 1000 });
```

If scrolling doesn't move the page, click somewhere on it first. That gives the page focus instead of another window.

## Read values from the screen

[`extract()`](/extract) reads information off the screen in plain language and returns it as a string. Use it for values the test needs later:

```javascript
const orderNumber = await testdriver.extract('the order confirmation number');
console.log(orderNumber); // for example "A-10482"
```

## Wait for a changing UI

Most timing problems come from acting before the app is ready. Wait for what the next step depends on, not for a fixed time.

### Wait for an element with find()

`find()` already waits. It checks the screen every 5 seconds, for up to 10 seconds, until the element appears.

For something slower, such as a page that loads after a form submits, raise the `timeout`:

```javascript
await testdriver.find('Submit button').click();

// Keep looking for up to 30 seconds while the next page loads
const confirmation = await testdriver.find('Order confirmation message', { timeout: 30000 });
```

Set `timeout: 0` to check once without waiting. For example, check whether an optional banner is showing:

```javascript
const cookieBanner = await testdriver.find('cookie consent banner', { timeout: 0 });
if (cookieBanner.found()) {
  await testdriver.find('Accept all cookies button').click();
}
```

### Pause with wait()

[`wait()`](/wait) pauses for a fixed number of milliseconds. Use it only when there's nothing specific to wait for, such as an animation:

```javascript
await testdriver.find('Menu toggle').click();
await testdriver.wait(1000);
```

### Wait for the screen to settle with redraw detection

For apps with a lot of animation or loading states, turn on redraw detection. After each action, TestDriver waits until the screen stops changing:

```javascript
const testdriver = TestDriver(context, { redraw: true });
```

Redraw detection is off by default because it adds a short delay after every action.

To also wait for network activity to finish, enable network monitoring:

```javascript
const testdriver = TestDriver(context, {
  redraw: { thresholds: { network: true } },
});
```

See [Redraw](/redraw) for every option.

## Next steps

<CardGroup cols={2}>
  <Card title="Make assertions" icon="circle-check" href="/making-assertions">
    Check the result of your actions in plain language.
  </Card>
  <Card title="Locate elements" icon="crosshairs" href="/locating-elements">
    Write descriptions that find the right element.
  </Card>
  <Card title="Debug a failing test" icon="bug" href="/debugging-with-screenshots">
    See what the screen showed at each step.
  </Card>
  <Card title="Prevent regressions" icon="shield-check" href="/copilot/auto-healing">
    Catch regressions in CI and repair tests when your UI changes.
  </Card>
</CardGroup>
