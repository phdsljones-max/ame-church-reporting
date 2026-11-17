---
name: testdriver:quickstart-manual
description: Add TestDriver to your own project and run your first Vitest test.
---
<!-- Generated from quickstart-manual.mdx. DO NOT EDIT. -->

Add TestDriver to a new or existing project, then run your first test.

- **Fastest:** run `npx testdriverai init` and let it create every file for you.
- **By hand:** follow the steps below to see exactly what each file does.

<Tip>
  Only want to drive TestDriver from chat? [MCP setup](/mcp-setup) needs one URL and nothing installed.
</Tip>

## Set up with init

Run `init` in your project folder:

```bash
npx testdriverai init
```

It signs you in and saves your API key to `.env`. It then adds:

- A `package.json`, if you don't have one
- `vitest.config.js` with the TestDriver reporter
- An example test in `tests/`
- A GitHub Actions workflow
- The TestDriver agent and MCP server for your AI client

`init` keeps your existing `package.json`, Vitest config, tests, and workflow. It only adds to `.gitignore` and to MCP config files.

Then run the example:

```bash
npx vitest run
```

## Set up by hand

<Steps>
  <Step title="Add your API key">

    Create an API key at [console.testdriver.ai/team/api-keys](https://console.testdriver.ai/team/api-keys). The free plan includes 30 testing minutes and needs no credit card.

    Save the key in a `.env` file at your project root. The SDK loads it automatically:

    ```bash .env
    TD_API_KEY=your_api_key
    ```

    Add `.env` to `.gitignore` so the key isn't committed.

  </Step>
  <Step title="Install dependencies">

    Install Vitest and TestDriver as dev dependencies:

    ```bash
    npm install --save-dev vitest testdriverai
    ```

    TestDriver needs Node.js 20.19 or later. It only runs on [Vitest](https://vitest.dev), not Jest, Mocha, or other runners.

  </Step>
  <Step title="Configure Vitest">

    Create `vitest.config.js` at your project root, or add these settings to your existing config:

    ```js vitest.config.js
    import { defineConfig } from 'vitest/config';
    import TestDriver from 'testdriverai/vitest';

    export default defineConfig({
      test: {
        // Sandboxes take time to boot and tear down. Both values are required.
        testTimeout: 300000,
        hookTimeout: 300000,
        reporters: ['default', TestDriver()],
        setupFiles: ['testdriverai/vitest/setup'],
      },
    });
    ```

    - **`TestDriver()`** is the reporter. It records each run in the TestDriver console, with its recording.
    - **`setupFiles`** links your tests to the reporter, so each test's recording attaches to the run.
    - **The timeouts** must be long. Vitest's defaults (5 seconds for tests, 10 for hooks) are too short for a real machine.

  </Step>
  <Step title="Write a test">

    Create `tests/search.test.js`:

    ```js tests/search.test.js
    import { test, expect } from 'vitest';
    import { TestDriver } from 'testdriverai/vitest/hooks';

    test('search shows results', async (context) => {
      // Connects to a sandbox and records the session
      const testdriver = TestDriver(context);

      // Launch Chrome at a URL
      await testdriver.provision.chrome({ url: 'https://duckduckgo.com' });

      // Locate elements by describing them
      const searchBox = await testdriver.find('search input field');
      await searchBox.click();

      // Type into the focused element and submit
      await testdriver.type('testdriver.ai');
      await testdriver.pressKeys(['enter']);

      // Ask a yes/no question about the screen
      const result = await testdriver.assert('search results are displayed');
      expect(result).toBeTruthy();
    });
    ```

    If your `package.json` doesn't set `"type": "module"`, name the file `search.test.mjs` instead.

  </Step>
  <Step title="Run the test">

    ```bash
    npx vitest run
    ```

    A sandbox starts, Chrome opens, and a live preview appears in your browser.

    When the run finishes, open the `TESTDRIVER_RUN_URL` link at the end of the output. It shows the recording and each step.

  </Step>
</Steps>

## Connect an AI assistant

To write tests with an AI assistant, add the TestDriver agent and MCP server to your project. `--no-sample-test` skips the example test files:

```bash
npx testdriverai init --client cursor,claude-code,vscode --no-sample-test
```

Your existing config and tests stay as they are. For Claude Code or VS Code, you can use the [plugin](/quickstart-claude) or [extension](/quickstart-vscode) instead.

## Next steps

<CardGroup cols={2}>
  <Card title="Launch apps" icon="rocket" href="/provision">
    Start Chrome, extensions, VS Code, or desktop apps.
  </Card>
  <Card title="Perform actions" icon="arrow-pointer" href="/performing-actions">
    Click, type, scroll, and wait for a changing UI.
  </Card>
  <Card title="Make assertions" icon="circle-check" href="/making-assertions">
    Check what's on screen in plain language.
  </Card>
  <Card title="Run in CI/CD" icon="code-branch" href="/ci-cd">
    Run your tests on every pull request.
  </Card>
</CardGroup>
