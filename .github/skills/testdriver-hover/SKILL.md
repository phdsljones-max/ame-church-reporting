---
name: testdriver:hover
description: Move the mouse over an element or a point without clicking, to reveal tooltips and menus.
---
<!-- Generated from hover.mdx. DO NOT EDIT. -->

Move the mouse onto an element without clicking. Use it to reveal tooltips, dropdown menus and hover styles.

```javascript
await testdriver.find('Products menu in the top navigation').hover();
await testdriver.find('Laptops in the Products dropdown').click();
```

## element.hover()

Moves the mouse to the point where [`find()`](/find) located the element. It's the same as `element.click('hover')`.

```typescript
element.hover(): Promise<void>
```

It takes no parameters.

### Errors

Throws an `ElementNotFoundError` if `find()` didn't locate the element. See [click()](/click#errors) for how to check `found()` first.

## testdriver.hover(options)

Moves the mouse to a point on the screen by its coordinates. Prefer `element.hover()`, which keeps working when the layout or screen size changes.

```typescript
testdriver.hover(options: { x: number; y: number }): Promise<void>
```

<ParamField path="options" type="object" required>
  <Expandable title="properties">
    <ParamField path="x" type="number" required>
      Distance from the left edge of the screen, in pixels.
    </ParamField>
    <ParamField path="y" type="number" required>
      Distance from the top edge of the screen, in pixels.
    </ParamField>
  </Expandable>
</ParamField>

```javascript
await testdriver.hover({ x: 640, y: 360 });
```

<Note>
  The older form `testdriver.hover(x, y)` still works. Use the options object in new tests.
</Note>

## Examples

### Read a tooltip

```javascript
await testdriver.find('help icon next to the Password label').hover();
const tooltip = await testdriver.extract('the text of the tooltip');
```

### Check a hover style

```javascript
await testdriver.find('Sign in button').hover();
await testdriver.assert('the Sign in button is highlighted');
```

### Drag an item

`hover()` moves the mouse while the button is held down by [`mouseDown()`](/mouse-down):

```javascript
await testdriver.find('Task card titled "Write docs"').mouseDown();
await testdriver.find('Done column').hover();
await testdriver.find('Done column').mouseUp();
```

## Complete example

```javascript tests/hover.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Hover', () => {
  it('highlights the sign in button on hover', async (context) => {
    const testdriver = TestDriver(context);
    await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });

    await testdriver.find('Sign in button below the password field').hover();

    const result = await testdriver.assert('the mouse pointer is over the Sign in button');
    expect(result).toBe(true);
  });
});
```

## Related

- [find()](/find): locate the element to hover over
- [click()](/click): click after a menu opens
- [mouseDown()](/mouse-down) and [mouseUp()](/mouse-up): drag and drop
- [Perform actions](/performing-actions): every kind of action in one guide
