---
name: testdriver:reusable-code
description: Share login steps and other common flows between tests with helpers and page objects.
---
<!-- Generated from reusable-code.mdx. DO NOT EDIT. -->

When several tests repeat the same steps, move those steps into shared code.

- **Helper functions** wrap one flow, such as signing in.
- **Page objects** group every action for one screen in a class.

Both are plain JavaScript modules. They take the `testdriver` client as an argument, so they work in any test.

## Write a helper function

Put the shared steps in a function that takes the client. This helper signs in to the TestDriver demo store:

```javascript tests/helpers/auth.js
export async function signIn(testdriver, username = 'standard_user') {
  const usernameField = await testdriver.find('Username input field');
  await usernameField.click();
  await testdriver.type(username);

  // The demo store shows its password on the login page
  const password = await testdriver.extract('the password shown on the login page');

  const passwordField = await testdriver.find('Password input field');
  await passwordField.click();
  await testdriver.type(password, { secret: true });

  const signInButton = await testdriver.find('Sign in button below the password field');
  await signInButton.click();
}
```

Import it and call it with your test's client:

```javascript tests/cart.test.mjs
import { expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';
import { signIn } from './helpers/auth.js';

it('shows an empty cart after signing in', async (context) => {
  const testdriver = TestDriver(context);
  await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });

  await signIn(testdriver);

  const cartIcon = await testdriver.find('Shopping cart icon in the top right corner');
  await cartIcon.click();

  const result = await testdriver.assert('the cart is empty');
  expect(result).toBe(true);
});
```

Pass values that change between tests, like the username, as arguments. Keep them out of the descriptions you pass to [`find()`](/find), so the [cache](/caching) can match them on every run.

## Group actions with a page object

A page object is a class with one method per action on a screen. Use one when many tests work with the same screen.

```javascript tests/pages/login-page.js
export class LoginPage {
  constructor(testdriver) {
    this.testdriver = testdriver;
  }

  async enterUsername(username) {
    const usernameField = await this.testdriver.find('Username input field');
    await usernameField.click();
    await this.testdriver.type(username);
  }

  async enterPassword(password) {
    const passwordField = await this.testdriver.find('Password input field');
    await passwordField.click();
    await this.testdriver.type(password, { secret: true });
  }

  async submit() {
    const signInButton = await this.testdriver.find('Sign in button below the password field');
    await signInButton.click();
  }
}
```

```javascript tests/login.test.mjs
import { expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';
import { LoginPage } from './pages/login-page.js';

it('asks for a password when it is missing', async (context) => {
  const testdriver = TestDriver(context);
  await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });

  const loginPage = new LoginPage(testdriver);
  await loginPage.enterUsername('standard_user');
  await loginPage.submit();

  const result = await testdriver.assert('a "Please fill out this field" message is visible near the password field');
  expect(result).toBe(true);
});
```

Start with helper functions. Move to page objects when several tests repeat the same actions on one screen.

## Organize your files

A layout that keeps shared code apart from tests:

<FileTree>
  <Folder name="tests" defaultOpen>
    <Folder name="helpers" defaultOpen>
      <File name="auth.js" />
    </Folder>
    <Folder name="pages" defaultOpen>
      <File name="login-page.js" />
    </Folder>
    <Folder name="fixtures" defaultOpen>
      <File name="usernames.js" />
    </Folder>
    <File name="cart.test.mjs" />
    <File name="login.test.mjs" />
  </Folder>
</FileTree>

By default, Vitest runs only files named `*.test.*` or `*.spec.*`, so helpers, page objects, and [fixtures](/variables#reuse-test-data-with-fixtures) aren't run as tests.

## Next steps

<CardGroup cols={2}>
  <Card title="Use variables and test data" icon="square-root-variable" href="/variables">
    Feed helpers with environment variables and fixtures.
  </Card>
  <Card title="Use secrets" icon="key" href="/secrets">
    Keep the credentials your helpers type out of logs.
  </Card>
  <Card title="Locate elements" icon="crosshairs" href="/locating-elements">
    Write descriptions that find the right element.
  </Card>
  <Card title="Click an icon example" icon="mouse-pointer" href="/examples/click-icon">
    A complete test that uses a login helper.
  </Card>
</CardGroup>
