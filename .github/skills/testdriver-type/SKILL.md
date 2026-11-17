---
name: testdriver:type
description: Type text into the field that has keyboard focus, with optional masking for secrets.
---
<!-- Generated from type.mdx. DO NOT EDIT. -->

Type text into whatever has keyboard focus. Click the field first:

```javascript
await testdriver.find('Email input field').click();
await testdriver.type('user@example.com');
```

`type()` is a client method. Elements don't have a `type()` method.

## Signature

```typescript
testdriver.type(text: string | number, options?: { secret?: boolean }): Promise<void>
```

## Parameters

<ParamField path="text" type="string | number" required>
  The text to type. Numbers are converted to strings.
</ParamField>

<ParamField path="options" type="object">
  <Expandable title="properties">
    <ParamField path="secret" type="boolean" default="false">
      Keep the text out of TestDriver's logs and test results. They show `****` instead. Use it for passwords, tokens and other sensitive values.
    </ParamField>
  </Expandable>
</ParamField>

<Warning>
  `secret: true` doesn't hide what appears on screen. If the field shows its contents, the text is visible in the Dashcam recording.
</Warning>

## Errors

Throws an error if `text` is `undefined` or `null`. This usually means an environment variable isn't set.

## Examples

### Type a password

Read secrets from environment variables, not from your test code. See [Secrets](/secrets).

```javascript
await testdriver.find('Password input field').click();
await testdriver.type(process.env.TD_PASSWORD, { secret: true });
```

### Replace the text in a field

`type()` adds to what's already in the field. Select the old text first to replace it:

```javascript
await testdriver.find('Search input').click();
await testdriver.pressKeys(['ctrl', 'a']);
await testdriver.type('wireless headphones');
```

### Type several lines

`type()` doesn't press Enter for you. Use [`pressKeys()`](/press-keys) between lines:

```javascript
await testdriver.find('Comment text area').click();
await testdriver.type('First line');
await testdriver.pressKeys(['enter']);
await testdriver.type('Second line');
```

## Complete example

```javascript tests/login.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Login', () => {
  it('signs in with a username and password', async (context) => {
    const testdriver = TestDriver(context);
    await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });

    // The sandbox login page shows its test password on screen
    const password = await testdriver.extract('the password');

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

- [pressKeys()](/press-keys): press Enter, Tab and shortcuts
- [click()](/click): focus a field before you type
- [Secrets](/secrets): keep credentials out of your test code
- [Perform actions](/performing-actions): every kind of action in one guide
