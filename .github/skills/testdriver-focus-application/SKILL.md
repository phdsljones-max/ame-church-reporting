---
name: testdriver:focus-application
description: Bring an open application window to the front of the sandbox desktop.
---
<!-- Generated from focus-application.mdx. DO NOT EDIT. -->

Bring an app's window to the front, so your next clicks and keystrokes go to it.

```javascript
await testdriver.focusApplication('Google Chrome');
```

Use it when your test works across several apps, or after a dialog or another window has taken focus.

<Note>
  The [`provision`](/provision) methods focus the app they launch, so you don't need this right after `provision.chrome()`, `provision.vscode()`, `provision.electron()`, or `provision.installer()`.
</Note>

## Signature

```typescript
testdriver.focusApplication(name: string, options?: object): Promise<string>
```

## Parameters

<ParamField path="name" type="string" required>
  The app's name, as it appears in its window title. For example `'Google Chrome'`, `'Notepad'`, or `'Visual Studio Code'`.
</ParamField>

<ParamField path="options" type="object">
  <Expandable title="properties">
    <ParamField path="redraw" type="boolean | object">
      Wait for the screen to settle after focusing. Uses the client's setting when you leave it out. See [Redraw](/redraw).
    </ParamField>
  </Expandable>
</ParamField>

## Returns

`Promise<string>`. Always resolves to `"The application was focused."`.

## Errors

`focusApplication()` doesn't throw when no window matches. It returns the same message either way.

To confirm the right app is in front, follow it with an [`assert()`](/assert):

```javascript
await testdriver.focusApplication('Notepad');
await testdriver.assert('a Notepad window is in the foreground');
```

## How it matches windows

- **Windows:** TestDriver looks for windows whose title contains `name`. It restores a minimized window, then brings it to the front.
- **Linux:** TestDriver runs `jumpapp -f <name>`. If that fails, it activates the first window whose title matches `name`, using `xdotool`.

The app must already be running. Launch it first with [`provision`](/provision) or [`exec()`](/exec).

## Examples

### Switch between two apps

```javascript
const orderNumber = await testdriver.extract('the order number');

await testdriver.focusApplication('Notepad');
await testdriver.type(orderNumber);

await testdriver.focusApplication('Google Chrome');
await testdriver.find('Confirm order button').click();
```

### Launch an app and focus it on Windows

```javascript
await testdriver.exec({ language: 'pwsh', code: 'Start-Process notepad' });
await testdriver.focusApplication('Notepad');
await testdriver.type('Meeting notes');
```

### Return to the browser after a dialog

```javascript
await testdriver.find('Download report button').click();
await testdriver.focusApplication('Google Chrome');
```

## Complete example

```javascript tests/notepad.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Notepad', () => {
  it('types into Notepad', async (context) => {
    // Windows sandboxes are available on Enterprise plans
    const testdriver = TestDriver(context, { os: 'windows' });

    await testdriver.exec({ language: 'pwsh', code: 'Start-Process notepad' });
    await testdriver.focusApplication('Notepad');

    await testdriver.type('Hello from TestDriver');

    const result = await testdriver.assert('Notepad shows "Hello from TestDriver"');
    expect(result).toBe(true);
  });
});
```

## Related

- [Launch apps](/provision): open an app and focus it in one step
- [exec()](/exec): start an app with a shell command
- [pressKeys()](/press-keys): switch windows with keyboard shortcuts
