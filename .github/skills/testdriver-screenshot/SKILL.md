---
name: testdriver:screenshot
description: Save a screenshot of the sandbox screen to a PNG file in your project.
---
<!-- Generated from screenshot.mdx. DO NOT EDIT. -->

Save what the sandbox screen shows right now as a PNG file. Use it to record a checkpoint you want to look at later.

```javascript
const screenshotPath = await testdriver.screenshot('cart-before-checkout');
```

To capture every step without calling it yourself, turn on `autoScreenshots` instead. See [Screenshots](/screenshots).

## Signature

```typescript
testdriver.screenshot(filename?: string): Promise<string>
```

## Parameters

<ParamField path="filename" type="string">
  The file name. TestDriver adds `.png` if it's missing. Without it, the file is named `screenshot-<timestamp>.png`.
</ParamField>

## Returns

`Promise<string>`. The absolute path of the saved file.

## Where files are saved

Screenshots go to `.testdriver/screenshots/<test file>/` in the directory you run tests from. `<test file>` is the test file's name without its last extension, so `tests/login.test.mjs` saves to `.testdriver/screenshots/login.test/`.

```text
.testdriver/screenshots/login.test/
  cart-before-checkout.png
  screenshot-1729512345678.png
```

<Warning>
  TestDriver clears each test file's folder at the start of every run. Copy any screenshot you want to keep.
</Warning>

Add the folder to `.gitignore`:

```text .gitignore
.testdriver/screenshots/
```

## Examples

### Save a named checkpoint

```javascript
await testdriver.find('Checkout button').click();
await testdriver.screenshot('checkout-page');
```

### Log the path

```javascript
const screenshotPath = await testdriver.screenshot();
console.log(screenshotPath);
// /Users/you/my-app/.testdriver/screenshots/login.test/screenshot-1729512345678.png
```

## Complete example

```javascript tests/login.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Login', () => {
  it('shows an error for an empty form', async (context) => {
    const testdriver = TestDriver(context);
    await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });

    await testdriver.screenshot('login-empty');

    await testdriver.find('Sign in button below the password field').click();
    await testdriver.screenshot('login-error');

    const result = await testdriver.assert('an error says the fields are required');
    expect(result).toBe(true);
  });
});
```

## Related

- [Screenshots](/screenshots): capture every step automatically with `autoScreenshots`
- [Debug a failing test](/debugging-with-screenshots): view saved screenshots from your AI client
- [Dashcam](/dashcam): watch a video replay of the whole test
