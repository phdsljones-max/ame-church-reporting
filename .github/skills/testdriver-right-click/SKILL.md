---
name: testdriver:right-click
description: Right-click an element you found, usually to open a context menu.
---
<!-- Generated from right-click.mdx. DO NOT EDIT. -->

Right-click an element you've located with [`find()`](/find), then pick an item from the menu that opens:

```javascript
await testdriver.find('report.pdf in the file list').rightClick();
await testdriver.find('Rename in the context menu').click();
```

## element.rightClick()

Right-clicks the element at the point where `find()` located it. It's the same as `element.click('right-click')`.

```typescript
element.rightClick(): Promise<void>
```

It takes no parameters.

### Errors

Throws an `ElementNotFoundError` if `find()` didn't locate the element. See [click()](/click#errors) for how to check `found()` first.

## Right-click at coordinates

The client has no `rightClick()` method. To right-click a point on the screen, pass `action: 'right-click'` to [`testdriver.click()`](/click#testdriver-click-options):

```javascript
await testdriver.click({ x: 640, y: 360, action: 'right-click' });
```

Prefer `element.rightClick()`, which keeps working when the layout or screen size changes.

## Examples

### Open a link in a new tab

```javascript
await testdriver.find('Documentation link in the page footer').rightClick();
await testdriver.find('Open link in new tab in the context menu').click();
```

### Rename a file in VS Code

```javascript
await testdriver.find('index.js in the Explorer sidebar').rightClick();
await testdriver.find('Rename in the context menu').click();
await testdriver.type('main.js');
await testdriver.pressKeys(['enter']);
```

## Complete example

```javascript tests/context-menu.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Context menu', () => {
  it('opens the browser context menu on the page', async (context) => {
    const testdriver = TestDriver(context);
    await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });

    await testdriver.find('the page heading').rightClick();

    const result = await testdriver.assert('a context menu with a "Back" item is open');
    expect(result).toBe(true);
  });
});
```

## Related

- [click()](/click): single clicks, and clicks at coordinates
- [doubleClick()](/double-click): open files and select words
- [find()](/find): locate the element to right-click
- [Perform actions](/performing-actions): every kind of action in one guide
