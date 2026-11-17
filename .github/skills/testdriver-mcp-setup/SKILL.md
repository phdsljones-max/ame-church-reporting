---
name: testdriver:mcp-setup
description: Connect Claude, Cursor, VS Code, ChatGPT, or any MCP client to TestDriver with one URL.
---
<!-- Generated from mcp-setup.mdx. DO NOT EDIT. -->

Connect your AI client to TestDriver's hosted [Model Context Protocol](https://modelcontextprotocol.io) server, and you can drive a real sandbox from chat.

- Open your app.
- Find elements, click, type, and assert.
- Get a screenshot after every step.

There's nothing to install and no API key to copy. Add one URL and sign in through your browser:

```text
https://mcp.testdriver.ai/mcp
```

## Before you begin

- **An MCP client** that supports remote servers, such as Claude, Claude Code, Cursor, VS Code, or ChatGPT.
- **A TestDriver account.** [Sign up at console.testdriver.ai](https://console.testdriver.ai). The free plan includes 30 testing minutes and needs no credit card.

## Add the server

<Tabs>
  <Tab title="Claude">

    1. Open **Settings → Connectors → Add custom connector**.
    2. Paste `https://mcp.testdriver.ai/mcp`.
    3. Click **Connect**, and sign in to TestDriver when the browser opens.

  </Tab>
  <Tab title="Claude Code">

    ```bash
    claude mcp add --transport http testdriver https://mcp.testdriver.ai/mcp
    ```

    Then run `/mcp` in a Claude Code session to sign in and confirm the tools are connected.

  </Tab>
  <Tab title="VS Code">

    Add this to `.vscode/mcp.json` in your project:

    ```json .vscode/mcp.json
    {
      "servers": {
        "testdriver": {
          "type": "http",
          "url": "https://mcp.testdriver.ai/mcp"
        }
      }
    }
    ```

    VS Code asks you to sign in the first time it uses the server.

  </Tab>
  <Tab title="Cursor">

    Add this to `.cursor/mcp.json` in your project, or to `~/.cursor/mcp.json` for all projects:

    ```json .cursor/mcp.json
    {
      "mcpServers": {
        "testdriver": {
          "url": "https://mcp.testdriver.ai/mcp"
        }
      }
    }
    ```

  </Tab>
  <Tab title="ChatGPT">

    1. Open **Settings → Connectors → Create**.
    2. Paste `https://mcp.testdriver.ai/mcp` as the MCP server URL.
    3. Choose **OAuth** for authentication, and sign in to TestDriver.

  </Tab>
  <Tab title="Other clients">

    Any client that supports the Streamable HTTP transport and OAuth sign-in can connect. Point it at the URL:

    ```json
    {
      "mcpServers": {
        "testdriver": {
          "url": "https://mcp.testdriver.ai/mcp"
        }
      }
    }
    ```

  </Tab>
</Tabs>

## Sign in

The first time your client connects, it opens a browser window where you sign in to TestDriver.

Every tool call afterward runs against the team you signed in with. Its usage counts toward that team's plan.

Clients find the sign-in page automatically. The server uses OAuth 2.1 and publishes its authorization details as [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728) protected-resource metadata at `https://mcp.testdriver.ai/.well-known/oauth-protected-resource`.

## Try it

Ask your client to drive a browser:

```text
Use TestDriver to open example.com and assert that the page heading is visible.
```

The agent starts a sandbox, opens Chrome, and returns a screenshot after each action.

Every connection gets its own sandbox. Several people or chats can run at once without affecting each other.

## Available tools

| Tools | What they do |
| --- | --- |
| `session_start`, `session_status`, `session_extend` | Start a sandbox, check how long it has left, and keep it alive longer |
| `find`, `findall`, `find_and_click` | Locate elements from a plain-language description |
| `click`, `hover`, `type`, `press_keys`, `scroll` | Act on the screen with the mouse and keyboard |
| `assert`, `check` | Ask yes-or-no questions about what's on screen |
| `screenshot`, `wait`, `exec`, `focus_application` | Capture the screen, pause, run a command, or switch apps |
| `list_test_runs`, `get_test_run_detail` | Look up past test runs and their results |

Each action also returns the SDK code for that step. The agent uses it to assemble a runnable [Vitest](https://vitest.dev) test as it works.

To turn that test into a file you run locally and in CI, [set up a project](/quickstart-manual).

## Run the server locally

Run the server as a local stdio process for headless automation, or to authenticate with an API key instead of a browser sign-in:

```bash
npx -p testdriverai testdriverai-mcp
```

It reads your API key from the `TD_API_KEY` environment variable. Create a key at [console.testdriver.ai/team/api-keys](https://console.testdriver.ai/team/api-keys).

Then configure your client to start the server:

```json .mcp.json
{
  "mcpServers": {
    "testdriver": {
      "type": "stdio",
      "command": "npx",
      "args": ["-p", "testdriverai", "testdriverai-mcp"],
      "env": { "TD_API_KEY": "${TD_API_KEY}" }
    }
  }
}
```

<Tip>
  `npx testdriverai init` writes this config for your client, along with the TestDriver agent, skills, an example test, and a GitHub Actions workflow. See [Set up a project](/quickstart-manual).
</Tip>

## Troubleshooting

<AccordionGroup>
  <Accordion title="The TestDriver tools don't appear in my client">

    Check that the URL is exactly `https://mcp.testdriver.ai/mcp`. Then restart your client, since most clients read their MCP configuration only at startup.

  </Accordion>
  <Accordion title="The browser sign-in never finishes">

    Your client needs to support OAuth 2.1 with Dynamic Client Registration.

    Clients that only support local (stdio) servers can't connect to the hosted URL. [Run the server locally](#run-the-server-locally) with an API key instead.

  </Accordion>
  <Accordion title="The sandbox expired in the middle of a session">

    A sandbox shuts down after 5 minutes with no activity.

    Ask the agent to call `session_extend` to keep it alive, or `session_start` to get a new one.

  </Accordion>
  <Accordion title="I ran out of testing minutes">

    Sandbox time counts against your plan's testing minutes. Check your usage and upgrade at [console.testdriver.ai/usage](https://console.testdriver.ai/usage).

  </Accordion>
</AccordionGroup>

## Next steps

<CardGroup cols={2}>
  <Card title="Generate tests" icon="wand-magic-sparkles" href="/generating-tests">
    Prompts that get the best tests out of the agent.
  </Card>
  <Card title="Set up a project" icon="wrench" href="/quickstart-manual">
    Save generated tests and run them locally and in CI.
  </Card>
  <Card title="Provision apps" icon="rocket" href="/provision">
    Launch browsers, extensions, and desktop apps in the sandbox.
  </Card>
  <Card title="Run in CI/CD" icon="code-branch" href="/ci-cd">
    Run your tests on every pull request.
  </Card>
</CardGroup>
