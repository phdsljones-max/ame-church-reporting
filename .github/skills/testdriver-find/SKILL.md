---
name: testdriver:find
description: Locate an element on screen by describing it in plain language.
---
<!-- Generated from find.mdx. DO NOT EDIT. -->

Describe an element the way a person would, and `find()` locates it on screen. Then act on it:

```javascript
const signInButton = await testdriver.find('Sign in button below the password field');
await signInButton.click();
```

For writing good descriptions, see [Locate elements](/locating-elements).

## Signature

```typescript
testdriver.find(description: string, options?: FindOptions): ChainableElementPromise
```

## Parameters

<ParamField path="description" type="string" required>
  What the element looks like and where it is, such as `'Add to cart button under the TestDriver Hat'`.
</ParamField>

<ParamField path="options" type="object">
  <Expandable title="properties">
    <ParamField path="timeout" type="number" default="10000">
      How long to keep looking, in milliseconds. `find()` checks the screen every 5 seconds until it finds the element or the time runs out. `0` checks once.
    </ParamField>
    <ParamField path="confidence" type="number">
      The lowest AI confidence to accept, from 0 to 1. A match below it counts as not found.
    </ParamField>
    <ParamField path="verify" type="boolean" default="false">
      Double-check the result with a second AI call. If the check fails, TestDriver locates the element again with a hint and checks once more. If that also fails, the element is returned as not found. Off by default, because it's slower. Cache hits aren't re-checked. Defaults to the client's [`verify` option](/options#param-verify).
    </ParamField>
    <ParamField path="zoom" type="boolean | number" default="false">
      Locate in two passes for more precision. The AI finds the rough area, then locates the element again in a close-up crop of that area. `true` checks one area. A number from 1 to 4 checks up to that many candidate areas. More than one area is an Enterprise feature; on other plans it's treated as `1`.
    </ParamField>
    <ParamField path="type" type="string" default="any">
      What kind of element you mean. TestDriver wraps your description before sending it to the AI:

      - `'text'`: `The text "<description>"`
      - `'image'`: `Image of "<description>"`
      - `'ui'`: `The UI element "<description>"`
      - `'any'`: the description as written
    </ParamField>
    <ParamField path="cacheKey" type="string">
      Store and look up the cached position under this key instead of the client's. See [Caching](/caching).
    </ParamField>
    <ParamField path="cache" type="object">
      Cache settings for this call.
      <Expandable title="properties">
        <ParamField path="thresholds" type="object">
          <Expandable title="properties">
            <ParamField path="screen" type="number" default="0.05">
              How much the screen may differ from the cached run (0 to 1) and still reuse the position. `-1` turns the cache off for this call.
            </ParamField>
            <ParamField path="element" type="number" default="0.8">
              How closely the element must match its cached image (0 to 1).
            </ParamField>
          </Expandable>
        </ParamField>
      </Expandable>
    </ParamField>
    <ParamField path="ai" type="AIConfig">
      Accepted, but `find()` doesn't apply it yet. Set the client's [`ai` option](/options#param-ai) instead.
    </ParamField>
    <ParamField path="cacheThreshold" type="number">
      Legacy. Same as `cache.thresholds.screen`.
    </ParamField>
  </Expandable>
</ParamField>

## Returns

`ChainableElementPromise`. It resolves to an `Element`, and you can also call an action on it directly (see [Chain an action](#chain-an-action)).

The element has these methods and properties:

| Member | What it gives you |
| --- | --- |
| `found()` | `true` if the element was located |
| `click(action?)` | Clicks the element. See [click()](/click). |
| `hover()`, `doubleClick()`, `rightClick()` | The other mouse actions |
| `mouseDown()`, `mouseUp()` | Press and release, for dragging. See [mouseDown()](/mouse-down). |
| `x`, `y` | The point TestDriver clicks, in pixels |
| `coordinates` | The same point as `{ x, y }`, or `null` if not found |
| `confidence` | The AI's confidence, from 0 to 1 |
| `find(description?, options?)` | Locates the element again, optionally with a new description |
| `toJSON()` | Debug details, such as `reasoning` and whether the result came from the `cache` |

## Chain an action

You can call an action on `find()` without awaiting it first:

```javascript
await testdriver.find('Sign in button').click();
```

These chain the same way: `hover()`, `doubleClick()`, `rightClick()`, `mouseDown()`, `mouseUp()`, and `found()`.

## When the element isn't found

`find()` doesn't throw when nothing matches. It returns an element whose `found()` is `false` and whose `coordinates` is `null`.

Acting on that element throws an `ElementNotFoundError`, so a missing element still fails the test at the action:

```javascript
// Throws ElementNotFoundError if the button wasn't found
await testdriver.find('Sign in button').click();
```

To handle an element that may not be there, check `found()`:

```javascript
const banner = await testdriver.find('cookie consent banner', { timeout: 0 });
if (banner.found()) {
  await testdriver.find('Accept all cookies button').click();
}
```

`ElementNotFoundError` is exported from `testdriverai`:

```javascript
import { ElementNotFoundError } from 'testdriverai';
```

## Examples

### Wait for something slow to appear

```javascript
const confirmation = await testdriver.find('Order confirmation heading', { timeout: 30000 });
expect(confirmation.found()).toBe(true);
```

### Make the match stricter

Use `confidence` and `verify` where clicking the wrong element is costly:

```javascript
await testdriver.find('Delete account button', {
  confidence: 0.9,
  verify: true,
}).click();
```

### Find a small target in a crowded screen

```javascript
await testdriver.find('extensions puzzle icon in the Chrome toolbar', { zoom: true }).click();
```

### Disambiguate a short description

```javascript
// Matches the visible word "Total", not a button or icon
const totalLabel = await testdriver.find('Total', { type: 'text' });
```

### Keep the cache when the description changes

A description with a changing value never matches its cached entry. Give it a fixed `cacheKey`:

```javascript
const orderId = '1042';
await testdriver.find(`Order #${orderId} row in the orders table`, {
  cacheKey: 'order-row',
}).click();
```

### Tighten the cache for one call

```javascript
await testdriver.find('Submit button', {
  cache: { thresholds: { screen: 0.01, element: 0.9 } },
});
```

## findAll()

Locates every element that matches a description and returns them as an array.

```typescript
testdriver.findAll(description: string, options?: FindAllOptions): Promise<Element[]>
```

<ParamField path="description" type="string" required>
  What the elements look like, such as `'coffee cup icon'`.
</ParamField>

<ParamField path="options" type="object">
  <Expandable title="properties">
    <ParamField path="cacheKey" type="string">
      Store and look up the cached positions under this key instead of the client's.
    </ParamField>
    <ParamField path="cache" type="object">
      `{ thresholds: { screen } }`. How much the screen may differ from the cached run (0 to 1) and still reuse the positions. Defaults to `0.05`. `-1` turns the cache off for this call.
    </ParamField>
    <ParamField path="cacheThreshold" type="number">
      Legacy. Same as `cache.thresholds.screen`.
    </ParamField>
  </Expandable>
</ParamField>

`findAll()` differs from `find()`:

- It checks the screen once. There's no `timeout`.
- It returns `[]` when nothing matches. It doesn't throw.
- It doesn't support `confidence`, `verify`, `zoom`, or `type`.
- You can't chain an action onto it. Pick an element from the array first.

```javascript
const coffeeIcons = await testdriver.findAll('coffee cup icon');
expect(coffeeIcons.length).toBeGreaterThan(0);

for (const icon of coffeeIcons) {
  await icon.click();
}
```

See the [find all example](/examples/findall-coffee-icons) for a complete test.

## Complete example

```javascript tests/login.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Login', () => {
  it('signs in with valid credentials', async (context) => {
    const testdriver = TestDriver(context);
    await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });

    // The sandbox login page shows its test password on screen
    const password = await testdriver.extract('the password');

    await testdriver.find('Username input field').click();
    await testdriver.type('standard_user');

    await testdriver.find('Password input field').click();
    await testdriver.type(password, { secret: true });

    await testdriver.find('Sign in button below the password field').click();

    const addToCart = await testdriver.find('Add to Cart button under the TestDriver Hat', {
      timeout: 30000,
    });
    expect(addToCart.found()).toBe(true);
  });
});
```

## Related

- [Locate elements](/locating-elements): write descriptions that match reliably
- [click()](/click) and [hover()](/hover): act on what you found
- [Caching](/caching): how element positions are reused
- [Element not found example](/examples/element-not-found): handle a missing element
