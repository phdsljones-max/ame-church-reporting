---
name: testdriver:mouse-up
description: Release the left mouse button on an element, to finish a drag.
---
<!-- Generated from mouse-up.mdx. DO NOT EDIT. -->

Release the mouse button you pressed with [`mouseDown()`](/mouse-down). Call it on the element where the drag should end:

```javascript
await testdriver.find('Task card titled "Write docs"').mouseDown();
await testdriver.find('Done column').mouseUp();
```

## element.mouseUp()

Moves the mouse to the point where [`find()`](/find) located the element, then releases the left button. Because the mouse moves before the release, the app sees a drag rather than a jump. It's the same as `element.click('mouseUp')`.

```typescript
element.mouseUp(): Promise<void>
```

It takes no parameters.

### Errors

Throws an `ElementNotFoundError` if `find()` didn't locate the element. See [click()](/click#errors) for how to check `found()` first.

## Release at coordinates

The client has no `mouseUp()` method. To release the button at a point on the screen, pass `action: 'mouseUp'` to [`testdriver.click()`](/click#testdriver-click-options):

```javascript
await testdriver.click({ x: 600, y: 300, action: 'mouseUp' });
```

Prefer `element.mouseUp()`, which keeps working when the layout or screen size changes.

## Examples

### Drop a file into an upload area

```javascript
await testdriver.find('invoice.pdf in the file list').mouseDown();
await testdriver.find('Drop files here area').hover();
await testdriver.find('Drop files here area').mouseUp();
```

### Resize a panel

```javascript
await testdriver.find('divider between the sidebar and the editor').mouseDown();
await testdriver.find('middle of the editor area').mouseUp();
```

## Complete example

```javascript tests/drag-and-drop.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Drag and drop', () => {
  it('moves a task to the Done column', async (context) => {
    const testdriver = TestDriver(context);
    await testdriver.provision.chrome({ url: 'https://your-app.example.com/board' });

    await testdriver.find('Task card titled "Write docs"').mouseDown();
    await testdriver.find('Done column').hover();
    await testdriver.find('Done column').mouseUp();

    const result = await testdriver.assert('the "Write docs" card is in the Done column');
    expect(result).toBe(true);
  });
});
```

## Related

- [mouseDown()](/mouse-down): press the button
- [hover()](/hover): move the mouse while the button is down
- [click()](/click): a full press and release
- [Perform actions](/performing-actions): every kind of action in one guide
