---
name: testdriver:scroll
description: Scroll the page up or down with the mouse wheel.
---
<!-- Generated from scroll.mdx. DO NOT EDIT. -->

Scroll the page up or down with the mouse wheel:

```javascript
await testdriver.scroll('down', { amount: 1000 });
```

If the page doesn't move, click somewhere on it first to give it focus.

## Signature

```typescript
testdriver.scroll(direction?: 'up' | 'down', options?: { amount?: number }): Promise<void>
```

## Parameters

<ParamField path="direction" type="'up' | 'down'" default="down">
  Which way to scroll. `'left'` and `'right'` aren't supported: TestDriver logs an error and doesn't scroll.
</ParamField>

<ParamField path="options" type="object">
  <Expandable title="properties">
    <ParamField path="amount" type="number" default="300">
      How far to scroll. Larger values scroll further.
    </ParamField>
  </Expandable>
</ParamField>

## Errors

Throws an error if `direction` isn't `'up'`, `'down'`, `'left'` or `'right'`.

If the screen doesn't change after the scroll, TestDriver logs a warning instead of throwing. This usually means the page didn't have focus.

## Scroll until text appears

`testdriver.scrollUntilText()` scrolls in steps until it finds some text on screen:

```javascript
await testdriver.scrollUntilText({ text: 'Privacy policy' });
await testdriver.find('Privacy policy link in the footer').click();
```

<ParamField path="options" type="object" required>
  <Expandable title="properties">
    <ParamField path="text" type="string" required>
      The text to look for.
    </ParamField>
    <ParamField path="direction" type="'up' | 'down'" default="down">
      Which way to scroll.
    </ParamField>
    <ParamField path="maxDistance" type="number" default="10000">
      How far to scroll in total before giving up. Each step scrolls 500.
    </ParamField>
    <ParamField path="invert" type="boolean" default="false">
      Scroll until the text is no longer on screen.
    </ParamField>
  </Expandable>
</ParamField>

It throws an error if the text doesn't appear within `maxDistance`. `testdriver.scrollUntilImage({ description })` works the same way for an image you describe.

## Examples

### Focus the page, then scroll

```javascript
await testdriver.find('the page heading').click();
await testdriver.scroll('down', { amount: 1000 });
```

### Load more results in an infinite list

```javascript
for (let i = 0; i < 3; i++) {
  await testdriver.scroll('down', { amount: 1000 });
}
await testdriver.assert('more than 20 results are listed');
```

### Use the keyboard instead

Some apps don't respond to the mouse wheel. Press Page Down with [`pressKeys()`](/press-keys):

```javascript
await testdriver.pressKeys(['pagedown']);
```

## Complete example

```javascript tests/scroll.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Scroll', () => {
  it('scrolls the heading out of view', async (context) => {
    const testdriver = TestDriver(context);
    await testdriver.provision.chrome({ url: 'https://www.webhamster.com/' });

    // Click the page so it has focus before scrolling
    await testdriver.find('The Hamster Dance, large heading at the top of the page').click();
    await testdriver.scroll('down', { amount: 1000 });

    const result = await testdriver.assert(
      "the text 'The Hamster Dance' isn't visible in the page content",
    );
    expect(result).toBe(true);
  });
});
```

## Related

- [pressKeys()](/press-keys): scroll with Page Down, Home and End
- [find()](/find): locate an element after scrolling to it
- [Perform actions](/performing-actions): every kind of action in one guide
