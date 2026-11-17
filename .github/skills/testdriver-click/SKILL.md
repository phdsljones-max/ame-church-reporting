---
name: testdriver:click
description: Click an element you found, or click a point on the screen.
---
<!-- Generated from click.mdx. DO NOT EDIT. -->

Click an element you've located with [`find()`](/find):

```javascript
const signInButton = await testdriver.find('Sign in button');
await signInButton.click();
```

Or chain it straight onto `find()`:

```javascript
await testdriver.find('Sign in button').click();
```

## element.click(action)

Clicks the element at the point where `find()` located it.

```typescript
element.click(action?: ClickAction): Promise<void>
```

### Parameters

<ParamField path="action" type="ClickAction" default="click">
  The mouse action to perform:

  - `'click'`: a left click
  - `'double-click'`: a double click, same as [`doubleClick()`](/double-click)
  - `'right-click'`: a right click, same as [`rightClick()`](/right-click)
  - `'hover'`: move the mouse there without clicking, same as [`hover()`](/hover)
  - `'mouseDown'` and `'mouseUp'`: press or release the button, for dragging. See [mouseDown()](/mouse-down).
</ParamField>

### Errors

Throws an `ElementNotFoundError` if `find()` didn't locate the element. Check `found()` first when the element might not be there:

```javascript
const banner = await testdriver.find('cookie consent banner', { timeout: 0 });
if (banner.found()) {
  await testdriver.find('Accept all cookies button').click();
}
```

## testdriver.click(options)

Clicks a point on the screen by its coordinates. Prefer `element.click()`, which keeps working when the layout or screen size changes.

```typescript
testdriver.click(options: { x: number; y: number; action?: ClickAction }): Promise<void>
```

### Parameters

<ParamField path="options" type="object" required>
  <Expandable title="properties">
    <ParamField path="x" type="number" required>
      Distance from the left edge of the screen, in pixels.
    </ParamField>
    <ParamField path="y" type="number" required>
      Distance from the top edge of the screen, in pixels.
    </ParamField>
    <ParamField path="action" type="ClickAction" default="click">
      The mouse action, as for `element.click()`. `'hover'` doesn't move the mouse here; use [`testdriver.hover({ x, y })`](/hover) instead.
    </ParamField>
  </Expandable>
</ParamField>

```javascript
await testdriver.click({ x: 640, y: 360 });
await testdriver.click({ x: 640, y: 360, action: 'right-click' });
```

<Note>
  The older form `testdriver.click(x, y, action)` still works. Use the options object in new tests.
</Note>

## Examples

### Open a context menu

```javascript
await testdriver.find('report.pdf in the file list').click('right-click');
await testdriver.find('Rename in the context menu').click();
```

### Open a file

```javascript
await testdriver.find('report.pdf in the file list').click('double-click');
```

### Drag an item

```javascript
await testdriver.find('Task card titled "Write docs"').mouseDown();
await testdriver.find('Done column').hover();
await testdriver.find('Done column').mouseUp();
```

## Complete example

```javascript tests/login.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Login', () => {
  it('shows an error for an empty form', async (context) => {
    const testdriver = TestDriver(context);
    await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });

    await testdriver.find('Sign in button below the password field').click();

    const result = await testdriver.assert('an error says the fields are required');
    expect(result).toBe(true);
  });
});
```

## Related

- [find()](/find): locate the element to click
- [doubleClick()](/double-click), [rightClick()](/right-click), and [hover()](/hover): shortcuts for the other actions
- [mouseDown()](/mouse-down) and [mouseUp()](/mouse-up): drag and drop
- [Perform actions](/performing-actions): every kind of action in one guide
