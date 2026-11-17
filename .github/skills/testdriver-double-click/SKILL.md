---
name: testdriver:double-click
description: Double-click an element you found, for example to open a file or select a word.
---
<!-- Generated from double-click.mdx. DO NOT EDIT. -->

Double-click an element you've located with [`find()`](/find):

```javascript
await testdriver.find('report.pdf in the file list').doubleClick();
```

## element.doubleClick()

Double-clicks the element at the point where `find()` located it. It's the same as `element.click('double-click')`.

```typescript
element.doubleClick(): Promise<void>
```

It takes no parameters.

### Errors

Throws an `ElementNotFoundError` if `find()` didn't locate the element. See [click()](/click#errors) for how to check `found()` first.

## Double-click at coordinates

The client has no `doubleClick()` method. To double-click a point on the screen, pass `action: 'double-click'` to [`testdriver.click()`](/click#testdriver-click-options):

```javascript
await testdriver.click({ x: 640, y: 360, action: 'double-click' });
```

Prefer `element.doubleClick()`, which keeps working when the layout or screen size changes.

## Examples

### Open a file in VS Code

```javascript
await testdriver.find('package.json in the Explorer sidebar').doubleClick();
await testdriver.assert('package.json is open in the editor');
```

### Select a word

```javascript
await testdriver.find('the word "Checkout" in the page heading').doubleClick();
await testdriver.pressKeys(['ctrl', 'c']);
```

## Complete example

```javascript tests/open-file.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('VS Code', () => {
  it('opens a file from the Explorer', async (context) => {
    const testdriver = TestDriver(context);
    await testdriver.exec({
      language: 'sh',
      code: 'mkdir -p /tmp/my-project && echo "{}" > /tmp/my-project/package.json',
    });
    await testdriver.provision.vscode({ workspace: '/tmp/my-project' });

    await testdriver.find('package.json in the Explorer sidebar').doubleClick();

    const result = await testdriver.assert('package.json is open in the editor');
    expect(result).toBe(true);
  });
});
```

## Related

- [click()](/click): single clicks, and clicks at coordinates
- [rightClick()](/right-click): open a context menu
- [find()](/find): locate the element to double-click
- [Perform actions](/performing-actions): every kind of action in one guide
