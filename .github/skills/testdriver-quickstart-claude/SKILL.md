---
name: testdriver:quickstart-claude
description: Install the TestDriver connector from the Claude directory, and Claude Code can drive a live sandbox.
---
<!-- Generated from quickstart-claude.mdx. DO NOT EDIT. -->

Install the TestDriver connector, and Claude Code can write, run, and debug end-to-end tests in a live sandbox.

The connector is the fastest way to get started: one click, a browser sign-in, and no API key to copy. Connectors you install on claude.ai are available automatically in Claude Code, Claude Desktop, and claude.ai chat.

## Before you begin

- **[Claude Code](https://code.claude.com)**, signed in with the same account you use on claude.ai.
- **A TestDriver account.** [Sign up at console.testdriver.ai](https://console.testdriver.ai). The free plan includes 30 testing minutes and needs no credit card.

<Steps>
  <Step title="Install the connector">

    Open the TestDriver listing in the Claude directory:

    [**claude.ai/directory/testdriver**](https://claude.ai/directory/testdriver)

    Click **Connect**, and sign in to TestDriver when the browser opens.

  </Step>
  <Step title="Check the connection">

    Start a Claude Code session and run `/mcp`. The `testdriver` server should be listed as connected.

    If it isn't, make sure Claude Code is signed in to the same account where you installed the connector, then restart the session.

  </Step>
  <Step title="Write your first test">

    Ask Claude Code to drive a browser:

    ```text
    Use TestDriver to write a test that logs in to https://testdriver-sandbox.vercel.app/login and adds an item to the cart.
    ```

    Claude starts a sandbox, performs each step, and gets a screenshot after every action. Each tool call also returns the SDK code for that step, which Claude assembles into a runnable [Vitest](https://vitest.dev) test.

    To save and run those tests locally and in CI, [set up a project](/quickstart-manual).

  </Step>
</Steps>

## Alternative: install the plugin

Prefer everything to run locally, or want the `testdriver` agent and skills bundled in? Install the TestDriver plugin instead. It bundles three things:

- The TestDriver MCP server, run locally over stdio
- The `testdriver` agent, which builds tests step by step
- Skills that teach Claude the TestDriver SDK

The plugin requires **Node.js 20.19 or later** and a **TestDriver API key**. Create one at [console.testdriver.ai/team/api-keys](https://console.testdriver.ai/team/api-keys).

<Steps>
  <Step title="Set your API key">

    The plugin's MCP server reads your key from the `TD_API_KEY` environment variable. Add it to your shell profile (such as `~/.zshrc`) so every Claude Code session can use it:

    ```bash
    export TD_API_KEY="your_api_key"
    ```

    Open a new terminal, or run `source ~/.zshrc`, before you start Claude Code.

  </Step>
  <Step title="Install the plugin">

    TestDriver is a community plugin. In Claude Code, run `/plugin`, open the **Discover** tab, search for **TestDriver**, and install it.

    You can also install it from TestDriver's own marketplace:

    ```text
    /plugin marketplace add testdriverai/testdriverai
    /plugin install testdriver@testdriver
    ```

  </Step>
  <Step title="Check the connection">

    Run `/mcp` in Claude Code. The `testdriver` server should be listed as connected.

    If it isn't, check that `TD_API_KEY` is set in the terminal you started Claude Code from.

  </Step>
  <Step title="Write your first test">

    Ask for the TestDriver agent by name:

    ```text
    Use the testdriver agent to write a test that logs in to https://testdriver-sandbox.vercel.app/login and adds an item to the cart.
    ```

    The agent starts a sandbox and performs each step. It writes the code into a test file under `tests/`, then runs it with Vitest until it passes.

  </Step>
</Steps>

<Tip>
  Using another MCP client, or want to add the hosted server by URL instead? See [MCP Setup](/mcp-setup).
</Tip>

## Next steps

<CardGroup cols={2}>
  <Card title="Generate tests with AI" icon="compass" href="/generating-tests">
    Prompt the agent and steer it while it works.
  </Card>
  <Card title="Make assertions" icon="circle-check" href="/making-assertions">
    Check what's on screen in plain language.
  </Card>
  <Card title="Run tests" icon="play" href="/copilot/running-tests">
    Run your tests locally and choose a device.
  </Card>
  <Card title="Run in CI/CD" icon="code-branch" href="/ci-cd">
    Run your tests on every pull request.
  </Card>
</CardGroup>
