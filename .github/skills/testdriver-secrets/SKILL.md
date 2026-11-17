---
name: testdriver:secrets
description: Keep passwords and tokens out of your test code and TestDriver's logs.
---
<!-- Generated from secrets.mdx. DO NOT EDIT. -->

Store credentials outside your code, and mark them as secret when you type them.

- Read passwords and tokens from environment variables, never from the test file.
- Type them with `secret: true` so TestDriver doesn't log or store them.

## Type a secret

Pass `{ secret: true }` to [`type()`](/type) for any sensitive value. Click the field first, then type:

```javascript tests/login.test.mjs
import { expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

it('signs in', async (context) => {
  const testdriver = TestDriver(context);
  await testdriver.provision.chrome({ url: `${process.env.APP_URL}/login` });

  const usernameField = await testdriver.find('Username input field');
  await usernameField.click();
  await testdriver.type(process.env.TEST_USERNAME);

  const passwordField = await testdriver.find('Password input field');
  await passwordField.click();
  await testdriver.type(process.env.TEST_PASSWORD, { secret: true });

  const signInButton = await testdriver.find('Sign in button below the password field');
  await signInButton.click();

  const result = await testdriver.assert('the dashboard is visible');
  expect(result).toBe(true);
});
```

## What `secret: true` hides

With `secret: true`, TestDriver replaces the text with `****`:

- In the SDK's console output.
- In the record of the action that TestDriver stores for the test run.

With [`autoScreenshots`](/options#param-auto-screenshots) on, the typed text is also left out of screenshot file names.

The text is still typed into the sandbox, so `secret: true` can't hide what the screen shows. If the field displays its contents, the value appears in the [Dashcam](/dashcam) recording and in screenshots. Password fields usually mask what you type, but plain text fields don't.

## Store secrets locally

TestDriver loads a `.env` file in your project root automatically. Put your local credentials there:

```bash .env
TD_API_KEY=your_api_key
APP_URL=https://staging.example.com
TEST_USERNAME=qa@example.com
TEST_PASSWORD=your_test_password
```

Add `.env` to `.gitignore` so it's never committed:

```bash .gitignore
.env
```

## Store secrets in CI

In GitHub Actions, store each credential as a repository secret:

<Steps>
  <Step title="Open your repository's secrets">
    In GitHub, go to **Settings** > **Secrets and variables** > **Actions**.
  </Step>
  <Step title="Add each secret">
    Click **New repository secret** and add `TEST_USERNAME` and `TEST_PASSWORD`.
  </Step>
  <Step title="Pass them to the test step">
    Map the secrets to environment variables in your workflow:

    ```yaml .github/workflows/testdriver.yml
    - name: Run TestDriver tests
      run: npx vitest run
      env:
        APP_URL: https://staging.example.com
        TEST_USERNAME: ${{ secrets.TEST_USERNAME }}
        TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
    ```
  </Step>
</Steps>

You don't need to store your TestDriver API key this way. The `testdriverai/action` step authenticates with GitHub OIDC. See [Run in CI/CD](/ci-cd) for the full workflow.

## Checklist

- Type passwords, tokens, and other sensitive values with `secret: true`.
- Read credentials from environment variables, not from the test file.
- Keep `.env` out of version control.
- Use test accounts with only the access your tests need.

## Next steps

<CardGroup cols={2}>
  <Card title="Use variables and test data" icon="square-root-variable" href="/variables">
    Drive tests with environment variables and fixtures.
  </Card>
  <Card title="type()" icon="keyboard" href="/type">
    Every option for typing text.
  </Card>
  <Card title="Run in CI/CD" icon="code-branch" href="/ci-cd">
    Authenticate and run tests in your pipeline.
  </Card>
  <Card title="Reuse code" icon="recycle" href="/reusable-code">
    Put your login steps in a shared helper.
  </Card>
</CardGroup>
