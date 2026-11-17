---
name: testdriver:press-keys
description: Press a key or a keyboard shortcut, like Enter, Tab or Ctrl+A.
---
<!-- Generated from press-keys.mdx. DO NOT EDIT. -->

Press a single key or a keyboard shortcut in the sandbox:

```javascript
await testdriver.pressKeys(['enter']);
await testdriver.pressKeys(['ctrl', 'a']);
```

To enter text, use [`type()`](/type) instead.

## Signature

```typescript
testdriver.pressKeys(keys: KeyboardKey[]): Promise<void>
```

## Parameters

<ParamField path="keys" type="KeyboardKey[]" required>
  The keys to press, as a shortcut. TestDriver presses them in order, holds them all down, then releases them in reverse order. So `['ctrl', 'shift', 'i']` is Ctrl+Shift+I.

  Each name must be a valid `KeyboardKey`. See [Key names](#key-names).
</ParamField>

Because the keys are pressed together, `['enter', 'enter']` doesn't press Enter twice. Call `pressKeys()` once per key press instead.

## Key names

Key names are lowercase. The most common ones:

| Kind | Names |
| --- | --- |
| Letters, digits, symbols | `'a'`–`'z'`, `'0'`–`'9'`, and single characters like `'/'` or `'.'` |
| Editing | `'enter'`, `'tab'`, `'space'`, `'backspace'`, `'delete'`, `'escape'` |
| Navigation | `'up'`, `'down'`, `'left'`, `'right'`, `'home'`, `'end'`, `'pageup'`, `'pagedown'` |
| Modifiers | `'ctrl'`, `'shift'`, `'alt'`, `'win'`, and left/right forms like `'ctrlleft'` |
| Function keys | `'f1'`–`'f24'` |

The full list is the `KeyboardKey` type in `sdk.d.ts`, which your editor autocompletes.

<Note>
  Sandboxes run Linux by default, or Windows. Use `'ctrl'` for shortcuts like copy and paste, not `'command'`.
</Note>

## Examples

### Move between form fields

```javascript
await testdriver.find('Email input field').click();
await testdriver.type('user@example.com');
await testdriver.pressKeys(['tab']);
await testdriver.type(process.env.TD_PASSWORD, { secret: true });
await testdriver.pressKeys(['enter']);
```

### Replace the text in a field

```javascript
await testdriver.find('Search input').click();
await testdriver.pressKeys(['ctrl', 'a']);
await testdriver.type('wireless headphones');
```

### Go to a URL in Chrome

```javascript
await testdriver.pressKeys(['ctrl', 'l']);
await testdriver.type('https://testdriver-sandbox.vercel.app/login');
await testdriver.pressKeys(['enter']);
```

## Complete example

```javascript tests/keyboard-login.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Login', () => {
  it('submits the form from the keyboard', async (context) => {
    const testdriver = TestDriver(context);
    await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });

    // The sandbox login page shows its test password on screen
    const password = await testdriver.extract('the password');

    await testdriver.find('Username input field').click();
    await testdriver.type('standard_user');
    await testdriver.pressKeys(['tab']);
    await testdriver.type(password, { secret: true });
    await testdriver.pressKeys(['enter']);

    const result = await testdriver.assert('the product list is shown');
    expect(result).toBe(true);
  });
});
```

## Related

- [type()](/type): enter text into the focused field
- [click()](/click): focus a field before you type or press keys
- [Perform actions](/performing-actions): every kind of action in one guide
