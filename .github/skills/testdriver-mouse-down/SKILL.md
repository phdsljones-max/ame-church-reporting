---
name: testdriver:mouse-down
description: Press and hold the left mouse button on an element, to start a drag.
---
<!-- Generated from mouse-down.mdx. DO NOT EDIT. -->

Press the left mouse button on an element and keep it held down. Use it with [`hover()`](/hover) and [`mouseUp()`](/mouse-up) to drag and drop:

```javascript
await testdriver.find('Task card titled "Write docs"').mouseDown();
await testdriver.find('Done column').hover();
await testdriver.find('Done column').mouseUp();
```

## element.mouseDown()

Moves the mouse to the point where [`find()`](/find) located the element, then presses the left button. The button stays down until you call `mouseUp()`. It's the same as `element.click('mouseDown')`.

```typescript
element.mouseDown(): Promise<void>
```

It takes no parameters.

### Errors

Throws an `ElementNotFoundError` if `find()` didn't locate the element. See [click()](/click#errors) for how to check `found()` first.

## Press at coordinates

The client has no `mouseDown()` method. To press the button at a point on the screen, pass `action: 'mouseDown'` to [`testdriver.click()`](/click#testdriver-click-options):

```javascript
await testdriver.click({ x: 200, y: 300, action: 'mouseDown' });
await testdriver.click({ x: 600, y: 300, action: 'mouseUp' });
```

Prefer the element methods, which keep working when the layout or screen size changes.

## Examples

### Reorder a list

```javascript
await testdriver.find('drag handle on the first task in the list').mouseDown();
await testdriver.find('the third task in the list').mouseUp();
```

### Draw on a canvas

```javascript
await testdriver.find('top-left corner of the drawing canvas').mouseDown();
await testdriver.find('center of the drawing canvas').hover();
await testdriver.find('bottom-right corner of the drawing canvas').mouseUp();
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

- [mouseUp()](/mouse-up): release the button
- [hover()](/hover): move the mouse while the button is down
- [click()](/click): a full press and release
- [Perform actions](/performing-actions): every kind of action in one guide
