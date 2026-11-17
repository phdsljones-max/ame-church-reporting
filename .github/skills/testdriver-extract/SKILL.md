---
name: testdriver:extract
description: Read a value off the screen with AI and get it back as a string.
---
<!-- Generated from extract.mdx. DO NOT EDIT. -->

Read a value off the screen, such as an order number or a price. Describe what you want, and the AI returns it as a string.

```javascript
const orderNumber = await testdriver.extract('the order confirmation number');
```

[`assert()`](/assert) tells you whether something is true. `extract()` gives you the value itself, so you can compare it, log it, or type it somewhere else.

## Signature

```typescript
testdriver.extract(description: string): Promise<string>
testdriver.extract(options: { description: string }): Promise<string>
```

Both forms do the same thing.

## Parameters

<ParamField path="description" type="string" required>
  What to read from the screen, such as `'the total price in the order summary'`. Say what format you want, too: `'the cart total as a number, without the dollar sign'`.
</ParamField>

## Returns

`Promise<string>`. The value the AI read, with no extra text. Convert it yourself when you need a number or another type.

## Errors

`extract()` throws if the AI service fails, for example when it's temporarily unavailable.

It doesn't throw when the value isn't on screen. Check the result before you rely on it.

## Examples

### Compare a value with expect()

```javascript
const message = await testdriver.extract('the success message text');
expect(message).toContain('successfully');
```

### Read a number

```javascript
const total = await testdriver.extract('the cart total as a number, without the dollar sign');
expect(Number(total)).toBeGreaterThan(0);
```

### Check the format of a generated value

```javascript
const confirmation = await testdriver.extract('the confirmation number');
expect(confirmation).toMatch(/^ORD-\d{6}$/);
```

### Pass a value to the next step

```javascript
const resetCode = await testdriver.extract('the password reset code');

await testdriver.find('Reset code input field').click();
await testdriver.type(resetCode);
```

### Read text that appears on hover

```javascript
await testdriver.find('info icon next to the price').hover();

const tooltip = await testdriver.extract('the tooltip text');
expect(tooltip).toContain('tax included');
```

## How it works

1. TestDriver takes a screenshot of the sandbox.
2. It sends the screenshot and your description to the AI.
3. The AI returns only the value you asked for.

Results aren't cached. Every call reads the current screen.

## Complete example

```javascript tests/login.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Login', () => {
  it('signs in with the password shown on the page', async (context) => {
    const testdriver = TestDriver(context);
    await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });

    // The sandbox login page shows its test password on screen
    const password = await testdriver.extract('the password');
    expect(password).not.toBe('');

    await testdriver.find('Username input field').click();
    await testdriver.type('standard_user');

    await testdriver.find('Password input field').click();
    await testdriver.type(password, { secret: true });

    await testdriver.find('Sign in button below the password field').click();

    const result = await testdriver.assert('the product list is shown');
    expect(result).toBe(true);
  });
});
```

## Related

- [assert()](/assert): check a statement about the screen
- [Make assertions](/making-assertions): choose between `assert()` and `extract()`
- [find()](/find): locate an element to act on
- [parse()](/parse): list every element on screen
