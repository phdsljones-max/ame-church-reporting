---
name: testdriver:generating-tests
description: Describe a flow in plain language, and the agent writes and runs the test.
---
<!-- Generated from generating-tests.mdx. DO NOT EDIT. -->

Describe a flow in plain language, and the TestDriver agent writes the test for you.

- The agent runs in your AI coding assistant.
- It runs the flow in a live sandbox and writes a Vitest test.
- It finds elements by looking at the screen, so you never write selectors.

## Before you begin

Install TestDriver in an AI coding assistant that can edit files in your repository:

- **Claude Code:** [install the plugin](/quickstart-claude).
- **VS Code or Cursor:** [install the extension](/quickstart-vscode).
- **Any other assistant:** run `npx testdriverai init` in your repository and choose your assistant. See [Set up a project](/quickstart-manual).

## Start the agent

Ask for the TestDriver agent by name in your assistant's chat:

```text
Use the testdriver agent to write a test that logs in to https://testdriver-sandbox.vercel.app/login
```

In VS Code, you can also pick **testdriver** from the agent dropdown in the Copilot chat panel.

If your assistant doesn't support agent files, give it the [TestDriver agent instructions](https://github.com/testdriverai/testdriverai/blob/main/ai/agents/testdriver.md?plain=1) directly.

## Describe the test

Write the flow as the steps a user takes and what they should see at the end.

Explicit steps make a test faster, cheaper, and more reliable than one where the agent works out the flow itself:

```text
Write a TestDriver test that does the following:

1. Open https://practicetestautomation.com/practice-test-login/
2. Type "student" into the Username field
3. Type "Password123" into the Password field
4. Click the Submit button
5. Verify the new page says "Logged In Successfully"
```

## Watch and steer the run

The agent sends a screenshot after every action, so you see what it sees.

- In clients that support MCP Apps, each screenshot appears inline in the chat, with the targeted element highlighted.
- With the [TestDriver extension](/quickstart-vscode) in VS Code or Cursor, the sandbox also plays live in a panel beside your code.

If the agent gets stuck or takes a wrong turn, tell it what to do next:

```text
A cookie banner is covering the form. Accept it, then continue.
```

You can also ask for more checks at any point:

```text
Also assert that the page shows a Log out button.
```

## What the agent does

1. **Starts a session.** It provisions a sandbox (Linux by default) and opens your app, for example Chrome at the URL you gave it.
2. **Performs each step.** It finds each element from a description, acts on it, and checks the screenshot to confirm the step worked.
3. **Writes code as it goes.** After each successful action, it appends the matching SDK code to a test file under `tests/`. The file always reflects what has actually run.
4. **Runs the test.** It runs the file with `vitest run` and keeps fixing it until it passes.

## Review the generated test

The result is an ordinary Vitest file. Read, edit, commit, and run it in CI like any other test:

```javascript tests/login.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Practice login', () => {
  it('logs in with valid credentials', async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({
      url: 'https://practicetestautomation.com/practice-test-login/',
    });

    const usernameField = await testdriver.find('Username input field');
    await usernameField.click();
    await testdriver.type('student');

    const passwordField = await testdriver.find('Password input field');
    await passwordField.click();
    await testdriver.type('Password123', { secret: true });

    const submitButton = await testdriver.find('Submit button');
    await submitButton.click();

    const result = await testdriver.assert('the page says "Logged In Successfully"');
    expect(result).toBe(true);
  });
});
```

Before you commit, check two things:

- Each `find()` description would still pick the right element if the page changed.
- The assertions cover what you care about.

<Tip>
  If the test calls `ai()`, which works out a step on its own at run time, ask the agent to replace it with explicit `find()`, `click()`, and `type()` steps before you commit. Explicit steps run faster and do the same thing every time.
</Tip>

## Tips for better tests

<AccordionGroup>
  <Accordion title="Describe elements by what they look like">

    "The blue Sign In button in the header" works better than "the button". Include the visible label. Add position or color when several elements look alike. See [Locate elements](/locating-elements).

  </Accordion>
  <Accordion title="Mention loading and animations">

    If part of your app loads slowly, say so. For example: "wait for the loading spinner to disappear before continuing". The agent then waits instead of acting too early.

  </Accordion>
  <Accordion title="Assert after each important step">

    Assert after each meaningful action, such as "the item appears in the cart". When the test fails later, you see where the regression starts.

  </Accordion>
  <Accordion title="Build long flows in pieces">

    Don't describe a long workflow all at once. Have the agent get the first part passing, then describe the next.

  </Accordion>
</AccordionGroup>

## Next steps

<CardGroup cols={2}>
  <Card title="Run tests" icon="play" href="/copilot/running-tests">
    Choose a device, preview mode, and how to run your tests.
  </Card>
  <Card title="Speed up reruns with caching" icon="bolt" href="/caching">
    Reuse what TestDriver found so reruns skip the AI.
  </Card>
  <Card title="Make assertions" icon="circle-check" href="/making-assertions">
    Write checks that catch the regressions you care about.
  </Card>
  <Card title="Run in CI/CD" icon="code-branch" href="/ci-cd">
    Run generated tests on every pull request.
  </Card>
</CardGroup>
