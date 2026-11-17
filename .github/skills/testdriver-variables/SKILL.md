---
name: testdriver:variables
description: Drive tests with environment variables, shared fixtures, and generated data.
---
<!-- Generated from variables.mdx. DO NOT EDIT. -->

Keep the values your tests type and visit out of the test code. There are three common sources:

- **Environment variables** for settings that change between environments, such as the app URL.
- **Fixtures** for a known set of test data you reuse across tests.
- **Generated data** for values that must be unique on every run.

To keep passwords and tokens out of logs as well, see [Use secrets](/secrets).

## Read environment variables

Read settings from `process.env` so the same test runs against dev, staging, or production.

```javascript tests/home.test.mjs
import { expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

const appUrl = process.env.APP_URL ?? 'https://testdriver-sandbox.vercel.app';

it('shows the login form', async (context) => {
  const testdriver = TestDriver(context);
  await testdriver.provision.chrome({ url: `${appUrl}/login` });

  const result = await testdriver.assert('a login form is visible');
  expect(result).toBe(true);
});
```

Set the variable when you run the tests:

```bash
APP_URL=https://staging.example.com npx vitest run
```

TestDriver loads a `.env` file in your project root automatically, so you can also keep local values there:

```bash .env
APP_URL=https://staging.example.com
```

## Reuse test data with fixtures

Put shared test data in its own module and import it wherever you need it.

```javascript tests/fixtures/usernames.js
export const usernames = [
  { label: 'a typical username', value: 'standard_user' },
  { label: 'a username with a dot', value: 'jane.doe' },
  { label: 'a 32-character username', value: 'user_with_a_32_character_name_01' },
];
```

Use Vitest's `it.for()` to run the same test once per fixture. Unlike `it.each()`, `it.for()` passes the test `context` as the second argument, which `TestDriver(context)` needs.

```javascript tests/login.test.mjs
import { expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';
import { usernames } from './fixtures/usernames.js';

it.for(usernames)('accepts $label', async (username, context) => {
  const testdriver = TestDriver(context);
  await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });

  const usernameField = await testdriver.find('Username input field');
  await usernameField.click();
  await testdriver.type(username.value);

  const result = await testdriver.assert(`the username field contains "${username.value}"`);
  expect(result).toBe(true);
});
```

Each fixture becomes its own test with its own sandbox.

## Generate unique data

When a test creates records, such as new accounts, generate fresh values on every run so they don't collide with earlier runs. [Faker](https://fakerjs.dev) is a common choice:

```bash
npm install --save-dev @faker-js/faker
```

```javascript tests/signup.test.mjs
import { faker } from '@faker-js/faker';
import { expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

it('creates an account', async (context) => {
  const testdriver = TestDriver(context);
  await testdriver.provision.chrome({ url: `${process.env.APP_URL}/signup` });

  const email = faker.internet.email();

  const emailField = await testdriver.find('Email input field');
  await emailField.click();
  await testdriver.type(email);

  const passwordField = await testdriver.find('Password input field');
  await passwordField.click();
  await testdriver.type(faker.internet.password({ length: 12 }), { secret: true });

  const createAccountButton = await testdriver.find('Create account button below the form');
  await createAccountButton.click();

  const result = await testdriver.assert('a welcome message is visible');
  expect(result).toBe(true);
});
```

## Keep values out of descriptions

Pass changing values to [`type()`](/type), not to [`find()`](/find).

The [cache](/caching) matches `find()` descriptions exactly. A description that contains a generated value misses the cache on every run:

```javascript
// Misses the cache whenever the email changes
const emailField = await testdriver.find(`input next to ${email}`);
```

Describe the element itself, and type the value after you click it:

```javascript
// Same description every run, so it can be cached
const emailField = await testdriver.find('Email input field');
await emailField.click();
await testdriver.type(email);
```

## Next steps

<CardGroup cols={2}>
  <Card title="Use secrets" icon="key" href="/secrets">
    Keep passwords and tokens out of code and logs.
  </Card>
  <Card title="Reuse code" icon="recycle" href="/reusable-code">
    Share helpers like a login step across tests.
  </Card>
  <Card title="Run in CI/CD" icon="code-branch" href="/ci-cd">
    Pass environment variables to tests in your pipeline.
  </Card>
  <Card title="Caching" icon="brain" href="/caching">
    Write descriptions that reuse cached locations.
  </Card>
</CardGroup>
