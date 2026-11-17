---
name: testdriver:quickstart-vscode
description: Set up TestDriver in your editor and watch tests run in a live preview panel.
---
<!-- Generated from quickstart-vscode.mdx. DO NOT EDIT. -->

Install the TestDriver extension, and your editor's AI assistant can write and run end-to-end tests. You watch the sandbox in a panel beside your code.

The extension:

- Signs you in.
- Sets up your project and MCP server.
- Opens the live preview automatically whenever a test runs.

## Before you begin

- **VS Code 1.85 or later with GitHub Copilot**, or **Cursor**.
- **Node.js 20.19 or later**, which runs the MCP server and your tests.
- **A workspace folder open** in the editor, since the extension sets up TestDriver in it.

<Steps>
  <Step title="Install the extension">

    Install [TestDriver.ai from the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=testdriver.testdriver), or search for **TestDriver.ai** in the Extensions view.

    In Cursor, the extension may not appear in search. If so, download it with **Download Extension** on the Marketplace page. Then run **Extensions: Install from VSIX** from the Command Palette and choose the file.

  </Step>
  <Step title="Sign in">

    Run **TestDriver: Sign In** from the Command Palette. It opens your browser, signs you in to TestDriver, and saves your API key in the editor.

  </Step>
  <Step title="Set up your project">

    Run **TestDriver: Initialize Project**. It writes your API key to `.env` and runs `npx testdriverai init`, which installs the SDK and adds:

    - An example test
    - The TestDriver agent and skills
    - A Vitest config
    - A GitHub Actions workflow

  </Step>
  <Step title="Connect the MCP server">

    Run **TestDriver: Install MCP Server** and choose where to save it: `.vscode/mcp.json` for VS Code or `.cursor/mcp.json` for Cursor.

    If it asks whether to overwrite an existing TestDriver entry, choose **Yes**. This version of the config turns on the live preview panel.

  </Step>
  <Step title="Write your first test">

    In VS Code, run **TestDriver: Chat with Agent**. It opens Copilot chat with the TestDriver agent and a sample prompt.

    In Cursor, open the chat and ask:

    ```text
    Use TestDriver to write a test that logs in to https://testdriver-sandbox.vercel.app/login and adds an item to the cart.
    ```

    The live preview panel opens as the agent starts the sandbox. The agent writes the test under `tests/` as it goes.

  </Step>
</Steps>

## Extension commands

| Command | What it does |
| --- | --- |
| **TestDriver: Sign In** | Signs in through your browser and saves your API key |
| **TestDriver: Set API Key** | Saves an API key you paste in instead |
| **TestDriver: Initialize Project** | Runs `npx testdriverai init` in the workspace |
| **TestDriver: Install MCP Server** | Adds the TestDriver MCP server to `.vscode/mcp.json` or `.cursor/mcp.json` |
| **TestDriver: Chat with Agent** | Opens the TestDriver agent in Copilot chat (VS Code) |
| **TestDriver: Turn into Repeatable Test** | Asks Copilot to turn your session into a test with a GitHub Actions workflow |
| **TestDriver: Open Live Preview** / **Close Live Preview** | Opens or closes the sandbox preview panel |
| **TestDriver: Open Getting Started** | Opens the extension's setup walkthrough |

The preview panel opens automatically when a test starts. To turn that off, set `testdriverai.autoOpenPreview` to `false` in your settings.

## Next steps

<CardGroup cols={2}>
  <Card title="Generate tests with AI" icon="compass" href="/generating-tests">
    Prompt the agent and steer it while it works.
  </Card>
  <Card title="Run tests" icon="play" href="/copilot/running-tests">
    Run tests from the editor or the terminal.
  </Card>
  <Card title="Make assertions" icon="circle-check" href="/making-assertions">
    Check what's on screen in plain language.
  </Card>
  <Card title="Run in CI/CD" icon="code-branch" href="/ci-cd">
    Run your tests on every pull request.
  </Card>
</CardGroup>
