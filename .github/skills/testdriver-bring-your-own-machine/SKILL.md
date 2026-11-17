---
name: testdriver:bring-your-own-machine
description: Run the TestDriver runner on a laptop, desktop, or VM you control, and point your tests at it.
---
<!-- Generated from bring-your-own-machine.mdx. DO NOT EDIT. -->

import { EnterpriseBadge, EnterpriseCta } from '/snippets/enterprise.mdx';

Run your tests on a machine you control instead of a cloud sandbox. It can be a laptop, a lab machine, or a VM in your own data center.

Use it when the cloud can't reproduce the machine under test, for example:

- Specific hardware, or a device plugged in over USB.
- A licensed desktop app.
- An app that only reaches your internal network.

The machine runs the TestDriver **runner**. Your test sends commands to it through the TestDriver API.

<EnterpriseCta feature="Running tests on your own machines" />

<Note>
  The runner only makes outbound connections, to the TestDriver API and to Ably for realtime messages. You don't need to open an inbound port.
</Note>

For Windows EC2 instances that start and stop automatically, use the [AWS setup](/aws-setup) instead.

## Before you begin

The machine needs:

- **Node.js 18 or newer.**
- **Python 3** with `pyautogui` and `Pillow`. The runner uses them for the mouse, keyboard, and screenshots.
- **An unlocked desktop session.** The runner drives the real screen, so turn off sleep, screen savers, and lock timers.
- **Outbound HTTPS and WebSocket access** to `api.testdriver.ai` and `*.ably.io`.
- **`curl` and `jq`**, to register the machine in step 2.

You also need your TestDriver API key in `TD_API_KEY`. Copy it from the [API keys page](https://console.testdriver.ai/team/api-keys).

<Tabs>
  <Tab title="macOS">

    ```bash
    pip3 install pyautogui Pillow
    ```

    macOS blocks synthetic input and screen capture until you allow them. Open **System Settings → Privacy & Security** and add the terminal app that starts the runner to both lists:

    - **Accessibility**, so the runner can move the mouse and type.
    - **Screen Recording**, so the runner can take screenshots.

    Quit and reopen the terminal after you change these settings.

  </Tab>
  <Tab title="Linux">

    ```bash
    sudo apt-get install -y python3-pip python3-xlib
    pip3 install pyautogui Pillow
    ```

    The runner needs an X11 display. It uses `:0` unless `DISPLAY` is set. On a server without a desktop, start a virtual display first:

    ```bash
    sudo apt-get install -y xvfb xfce4 dbus-x11
    Xvfb :0 -screen 0 1366x768x24 &
    DISPLAY=:0 startxfce4 &
    ```

    Turn off screen blanking so the desktop stays visible:

    ```bash
    export DISPLAY=:0
    xset s off && xset s noblank && xset -dpms
    ```

  </Tab>
  <Tab title="Windows">

    ```powershell
    pip install pyautogui Pillow
    ```

    Run the runner in a console or RDP session that stays signed in. If the session locks or disconnects, Windows tears down the desktop and automation stops. Set the machine to sign in automatically and turn off the lock screen.

  </Tab>
</Tabs>

## Step 1: Install the runner

```bash
npm install -g @testdriverai/runner
```

This installs the `testdriver-sandbox-agent` command, which connects the machine to a TestDriver session.

## Step 2: Register the machine

Ask the API for a session on this machine. Replace `192.168.1.50` with the machine's IP address, and set `os` to `windows` on a Windows machine:

```bash
curl -sS -X POST https://api.testdriver.ai/api/v7/sandbox/authenticate \
  -H "Content-Type: application/json" \
  -d "{
    \"apiKey\": \"$TD_API_KEY\",
    \"apiRoot\": \"https://api.testdriver.ai\",
    \"ip\": \"192.168.1.50\",
    \"os\": \"linux\",
    \"keepAlive\": 900000
  }" > td-session.json
```

The response includes a sandbox ID and an `agentConfig` object with everything the runner needs. Write `agentConfig` to the runner's config file, and print the sandbox ID:

```bash
jq '.agentConfig' td-session.json > /tmp/testdriver-agent.json
chmod 600 /tmp/testdriver-agent.json
jq -r '.sandboxId' td-session.json
```

On Windows, run these commands in Git Bash and write the file to `/c/Windows/Temp/testdriver-agent.json` instead.

Save the sandbox ID, such as `sb-69cce96e-1e0`, for step 4.

<Warning>
  The config file contains your API key and a session token. Keep it readable only by the user who runs the runner, and never commit it.
</Warning>

To keep the config file somewhere else, set `CONFIG_PATH` to its full path before you start the runner.

A registered machine uses one of your plan's concurrency slots while its session is open.

## Step 3: Start the runner

```bash
testdriver-sandbox-agent
```

The runner reads the config file, connects, and waits for commands:

```text
[2026-10-21T15:04:05.000Z] TestDriver Sandbox Agent starting...
[2026-10-21T15:04:05.100Z] Sandbox ID: sb-69cce96e-1e0
[2026-10-21T15:04:05.100Z] Transport: Ably
[2026-10-21T15:04:06.200Z] Automation module initialized
[2026-10-21T15:04:07.300Z] Agent ready — listening for commands via Ably
```

Leave it running. If the config file doesn't exist yet, the runner waits up to 5 minutes for it.

## Step 4: Point your test at the machine

Pass the machine's `ip` and the `sandboxId` from step 2 to `TestDriver()`. Setting `sandboxId` stops TestDriver from creating a cloud sandbox.

```javascript tests/my-machine.test.mjs
import { describe, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('My machine', () => {
  it('signs in to the desktop app', async (context) => {
    const testdriver = TestDriver(context, {
      ip: process.env.TD_MACHINE_IP,
      sandboxId: process.env.TD_SANDBOX_ID,
    });

    await testdriver.find('Sign in button').click();
    await testdriver.assert('the dashboard is visible');
  });
});
```

On a Windows machine, also pass `os: 'windows'`.

Run the test from any computer:

```bash
TD_MACHINE_IP=192.168.1.50 TD_SANDBOX_ID=sb-69cce96e-1e0 npx vitest run
```

Each registration covers one session. When the test disconnects, the session ends. Repeat steps 2 and 3 before the next run.

## Logs

| Platform | Runner log |
| --- | --- |
| macOS and Linux | `/tmp/testdriver-agent.log` |
| Windows | `C:\Windows\Temp\testdriver-agent.log` |

The runner also writes `testdriver-agent-status.json` in the same folder, with the sandbox ID, process ID, IP address, and start time.

## Security

- **Use a dedicated machine or user account.** The runner can click anything on the desktop and run shell commands sent by your tests.
- **Treat the config file as a secret.** It contains your API key and a session token.
- **Keep VNC private.** If you add a VNC server for debugging, expose it only on localhost or your VPN.
- **Rotate your API key** on the [API keys page](https://console.testdriver.ai/team/api-keys) when you retire or share a machine.

## Troubleshooting

<AccordionGroup>
  <Accordion title="Sandbox has expired and is no longer available">

    The session ended, which happens after a test disconnects or the session's `keepAlive` runs out. Repeat steps 2 and 3 for a fresh sandbox ID, and use the new ID in your test.

  </Accordion>
  <Accordion title="The runner connects, but clicks and screenshots do nothing (macOS)">

    Accessibility or Screen Recording permission is missing. Add your terminal app to both lists in **System Settings → Privacy & Security**, then quit and reopen it.

  </Accordion>
  <Accordion title="Config file not found after 300s">

    The runner couldn't find the config file. Write it on the same machine, readable by the user who starts the runner, or set `CONFIG_PATH` to where it is.

  </Accordion>
  <Accordion title="The test runs in a cloud sandbox instead">

    Check that both `TD_MACHINE_IP` and `TD_SANDBOX_ID` are set when you run the test. If `sandboxId` is undefined, TestDriver creates a cloud sandbox.

  </Accordion>
  <Accordion title="Screenshots are blank or frozen (Linux)">

    `DISPLAY` points at a display with no desktop, or the screen blanked. Start a desktop on that display and turn off blanking with `xset s off && xset s noblank && xset -dpms`.

  </Accordion>
</AccordionGroup>

## Runner environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `CONFIG_PATH` | `/tmp/testdriver-agent.json`, or `C:\Windows\Temp\testdriver-agent.json` on Windows | Where the runner reads its config file |
| `DISPLAY` | `:0` | The X11 display to drive (Linux) |

## Next steps

<CardGroup cols={2}>
  <Card title="Self-host on AWS" icon="aws" href="/aws-setup">
    Start a fresh Windows EC2 instance for each test.
  </Card>
  <Card title="Self-hosted" icon="server" href="/self-hosted">
    What the Enterprise plan includes.
  </Card>
  <Card title="Locate elements" icon="crosshairs" href="/locating-elements">
    Describe elements so TestDriver finds them on any screen.
  </Card>
  <Card title="Make assertions" icon="circle-check" href="/making-assertions">
    Check that your app reached the right state.
  </Card>
</CardGroup>
