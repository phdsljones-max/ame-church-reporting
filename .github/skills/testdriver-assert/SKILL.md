---
name: testdriver:assert
description: Check a plain-language statement about the screen, and fail the test if it's false.
---
<!-- Generated from assert.mdx. DO NOT EDIT. -->

Check that something is true on screen. The AI looks at the current screen and decides whether your statement holds.

```javascript
await testdriver.assert('the dashboard shows a welcome message');
```

For writing good assertions, see [Make assertions](/making-assertions).

## Signature

```typescript
testdriver.assert(assertion: string, options?: AssertOptions): Promise<boolean>
```

## Parameters

<ParamField path="assertion" type="string" required>
  A statement about the screen that should be true, such as `'the cart shows 1 item'`.
</ParamField>

<ParamField path="options" type="AssertOptions">
  <Expandable title="properties">
    <ParamField path="threshold" type="number" default="0.05">
      How much the screen may differ from a cached passing run (0 to 1) and still reuse its result. Defaults to the client's `cache.thresholds.assert`, which is `0.05`. `-1` turns caching off for this call. See [Caching](/caching).
    </ParamField>
    <ParamField path="cacheKey" type="string">
      Store and look up the cached result under this key instead of the client's.
    </ParamField>
    <ParamField path="ai" type="AIConfig">
      Sampling settings for this call, such as `{ temperature: 0 }`. Overrides the client's [`ai` option](/options#param-ai).
    </ParamField>
    <ParamField path="os" type="string">
      The OS to store the cached result under. Set automatically from the client.
    </ParamField>
    <ParamField path="resolution" type="string">
      The resolution to store the cached result under. Set automatically from the client.
    </ParamField>
  </Expandable>
</ParamField>

## Returns

`Promise<boolean>`. Resolves to `true` when the statement is true.

## Errors

When the statement is false, `assert()` throws, so the test fails at that line. The error message starts with `AI Assertion failed:`, followed by your statement and the AI's explanation.

Inside `ai()`, assertions don't throw. They resolve to `false` so the AI can keep working.

## Examples

### Check the result of an action

```javascript
await testdriver.find('Add to cart button').click();
await testdriver.assert('the cart icon shows 1 item');
```

### Check text in a field

```javascript
await testdriver.find('Username input field').click();
await testdriver.type('standard_user');
await testdriver.assert('the username field contains "standard_user"');
```

### Use it with expect()

`assert()` already fails the test when the statement is false. An `expect()` makes the check visible to anyone reading the test:

```javascript
const loggedIn = await testdriver.assert('the dashboard is visible');
expect(loggedIn).toBe(true);
```

### Wait for something before asserting

`assert()` checks the screen once. For something that takes time to appear, wait for it with [`find()`](/find) first:

```javascript
await testdriver.find('Order confirmation heading', { timeout: 30000 });
await testdriver.assert('the confirmation shows an order number');
```

## Complete example

```javascript tests/login.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Login', () => {
  it('shows an error when the form is empty', async (context) => {
    const testdriver = TestDriver(context);
    await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });

    await testdriver.assert('the login form is empty');

    await testdriver.find('Sign in button below the password field').click();

    const result = await testdriver.assert('an error says the fields are required');
    expect(result).toBe(true);
  });
});
```

## Related

- [Make assertions](/making-assertions): write assertions that catch real regressions
- [extract()](/extract): read a value off the screen to compare yourself
- [find()](/find): wait for an element before asserting
- [Caching](/caching): how assertion results are reused
