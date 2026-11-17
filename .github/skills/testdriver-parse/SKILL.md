---
name: testdriver:parse
description: List every UI element on screen, with its type, text, and position.
---
<!-- Generated from parse.mdx. DO NOT EDIT. -->

Detect every element on the current screen and get back a list with each one's type, text, and position.

```javascript
const { elements } = await testdriver.parse();
console.log(`Found ${elements.length} elements`);
```

`parse()` uses [OmniParser v2](https://github.com/microsoft/OmniParser). It works from the screenshot alone, so it doesn't need a DOM or accessibility tree.

To act on one specific element, use [`find()`](/find) instead. Use `parse()` when you need an inventory of the whole screen.

<Note>
  `parse()` requires an Enterprise or self-hosted plan.
</Note>

## Signature

```typescript
testdriver.parse(): Promise<ParseResult>
```

## Parameters

None. `parse()` analyzes the screen as it is when you call it.

## Returns

<ResponseField name="ParseResult" type="object">
  <Expandable title="properties">
    <ResponseField name="elements" type="ParsedElement[]">
      One entry per detected element.
      <Expandable title="ParsedElement">
        <ResponseField name="index" type="number">
          The element's position in the list, starting at `0`.
        </ResponseField>
        <ResponseField name="type" type="string">
          What OmniParser detected, such as `'text'` or `'icon'`.
        </ResponseField>
        <ResponseField name="content" type="string">
          The element's text, or a short description of an icon.
        </ResponseField>
        <ResponseField name="interactivity" type="boolean">
          `true` when OmniParser thinks the element can be clicked.
        </ResponseField>
        <ResponseField name="bbox" type="object">
          The corners in pixels: `{ x0, y0, x1, y1 }`, where `(x0, y0)` is top-left and `(x1, y1)` is bottom-right.
        </ResponseField>
        <ResponseField name="boundingBox" type="object">
          The same box as `{ left, top, width, height }`, in pixels.
        </ResponseField>
      </Expandable>
    </ResponseField>
    <ResponseField name="annotatedImageUrl" type="string | null">
      A URL of the screenshot with every detected element outlined.
    </ResponseField>
    <ResponseField name="imageWidth" type="number">
      The width of the analyzed screenshot, in pixels.
    </ResponseField>
    <ResponseField name="imageHeight" type="number">
      The height of the analyzed screenshot, in pixels.
    </ResponseField>
  </Expandable>
</ResponseField>

## Errors

`parse()` throws if the screen analysis fails. The error message comes from the TestDriver API.

## Examples

### List what's on screen

```javascript
const { elements } = await testdriver.parse();

for (const element of elements) {
  console.log(`[${element.type}] "${element.content}" clickable=${element.interactivity}`);
}
```

### Find the clickable elements

```javascript
const { elements } = await testdriver.parse();
const clickable = elements.filter((element) => element.interactivity);
```

### Click an element by its text

```javascript
const { elements } = await testdriver.parse();
const signIn = elements.find((element) => element.content.includes('Sign in'));

if (signIn) {
  const x = Math.round((signIn.bbox.x0 + signIn.bbox.x1) / 2);
  const y = Math.round((signIn.bbox.y0 + signIn.bbox.y1) / 2);
  await testdriver.click({ x, y });
}
```

Clicking by coordinates breaks when the layout changes. Prefer `find()` for clicks.

### See what was detected

```javascript
const { annotatedImageUrl } = await testdriver.parse();
console.log(annotatedImageUrl);
```

## Complete example

```javascript tests/login-form.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Login page', () => {
  it('shows the username and password fields', async (context) => {
    const testdriver = TestDriver(context);
    await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });

    const { elements } = await testdriver.parse();
    const text = elements.map((element) => element.content.toLowerCase()).join(' ');

    expect(text).toContain('username');
    expect(text).toContain('password');
    expect(elements.some((element) => element.interactivity)).toBe(true);
  });
});
```

See the [parse example](/examples/parse) for another complete test.

## Related

- [find()](/find): locate one element and act on it
- [extract()](/extract): read one value off the screen
- [click()](/click): click a point by its coordinates
