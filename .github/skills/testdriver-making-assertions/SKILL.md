---
name: testdriver:making-assertions
description: Check that your app reached the right state, in plain language or with expect().
---
<!-- Generated from making-assertions.mdx. DO NOT EDIT. -->

An assertion checks that your app did the right thing after a step. TestDriver gives you two ways to check:

- [`assert()`](/assert) asks the AI whether a statement about the screen is true, and fails the test if it isn't.
- [`extract()`](/extract) reads a value off the screen, so you can compare it yourself with `expect()`.

```javascript
await testdriver.find('Add to cart button').click();
await testdriver.assert('the cart icon shows 1 item');
```

## Check the screen with assert()

Pass `assert()` a statement that should be true. The AI looks at the current screen and decides.

```javascript tests/login.test.mjs
import { describe, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Login', () => {
  it('signs in with valid credentials', async (context) => {
    const testdriver = TestDriver(context);
    await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });

    // The sandbox login page shows its test password on screen
    const password = await testdriver.extract('the password shown on the login page');

    await testdriver.find('Username input field').click();
    await testdriver.type('standard_user');
    await testdriver.find('Password input field').click();
    await testdriver.type(password, { secret: true });
    await testdriver.find('Sign in button below the password field').click();

    await testdriver.assert('the product list is shown');
  });
});
```

When the statement is true, `assert()` resolves to `true`. When it's false, `assert()` throws and the test fails at that line. The error message starts with `AI Assertion failed:` and includes the AI's explanation.

## Write statements the AI can judge

The AI judges only what's visible on screen right now. Write statements a person could confirm by looking.

- **Name the thing and its state.** `'the Submit button is disabled'`, not `'the form is invalid'`.
- **Quote exact text** when the wording matters: `'the banner says "Order placed"'`.
- **Check one thing per assertion.** Two short assertions tell you exactly which part failed.
- **Assert outcomes, not steps.** Check what the user should see after an action, such as a confirmation message.

```javascript
// Visibility
await testdriver.assert('the login form is visible');
await testdriver.assert('the loading spinner is not visible');

// Exact text
await testdriver.assert('the error message says "Invalid email address"');

// State of a control
await testdriver.assert('the "Remember me" checkbox is checked');
await testdriver.assert('the Country dropdown shows "United States"');
```

## Compare exact values with extract()

Use `extract()` when you need the value itself, for example a number to compare or reuse. It returns a string, so convert it before comparing numbers:

```javascript
import { expect } from 'vitest';

const itemCount = await testdriver.extract('the number of items shown on the cart icon');
expect(Number(itemCount)).toBe(1);
```

Prefer `assert()` for yes-or-no checks. Reach for `extract()` when the test needs a value it can't know in advance, such as an order number:

```javascript
const orderNumber = await testdriver.extract('the order confirmation number');
expect(orderNumber).toMatch(/^A-\d+$/);
```

## Check state before and after an action

An assertion after an action only proves the end state. Assert the starting state too, so the test catches an action that did nothing:

```javascript
await testdriver.assert('the cart is empty');

await testdriver.find('Add to cart button under the TestDriver Hat').click();

await testdriver.assert('the cart icon shows 1 item');
```

To check that a value changed, extract it on both sides of the action:

```javascript
const before = await testdriver.extract('the cart total');

await testdriver.find('Add to cart button under the TestDriver Hat').click();

const after = await testdriver.extract('the cart total');
expect(after).not.toBe(before);
```

## Wait before you assert

`assert()` checks the screen once, at the moment you call it. If the result takes time to appear, wait for it with [`find()`](/find) first:

```javascript
await testdriver.find('Place order button').click();

// Keep looking for up to 30 seconds while the confirmation page loads
await testdriver.find('Order confirmation heading', { timeout: 30000 });
await testdriver.assert('the confirmation shows an order number');
```

See [Perform actions](/performing-actions#wait-for-a-changing-ui) for other ways to wait.

## How assertions are cached

`assert()` results are [cached](/caching) like `find()` results. When the screen matches a passing earlier run, TestDriver reuses that result instead of asking the AI.

`extract()` is never cached. It reads the screen every time.

To always ask the AI for one assertion, pass `threshold: -1`:

```javascript
await testdriver.assert('the clock shows the current time', { threshold: -1 });
```

## Next steps

<CardGroup cols={2}>
  <Card title="assert()" icon="check-circle" href="/assert">
    Every option, return value, and error.
  </Card>
  <Card title="extract()" icon="wand-magic-sparkles" href="/extract">
    Read values off the screen as strings.
  </Card>
  <Card title="Perform actions" icon="arrow-pointer" href="/performing-actions">
    Click, type, and wait for a changing UI.
  </Card>
  <Card title="Debug with screenshots" icon="bug" href="/debugging-with-screenshots">
    See what the screen showed when an assertion failed.
  </Card>
</CardGroup>
