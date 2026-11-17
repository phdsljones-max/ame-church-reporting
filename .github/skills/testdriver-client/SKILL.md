---
name: testdriver:client
description: Create a TestDriver client, connect it to a sandbox, and disconnect when you're done.
---
<!-- Generated from client.mdx. DO NOT EDIT. -->

import { EnterpriseBadge, EnterpriseCta } from '/snippets/enterprise.mdx';

Every test talks to its sandbox through a TestDriver client. There are two ways to create one:

- **`TestDriver(context)`** from `testdriverai/vitest/hooks`. Use this in Vitest tests. It connects and disconnects for you.
- **`new TestDriver()`** from `testdriverai`. Use this outside Vitest's per-test hooks, when you manage the connection yourself.

```javascript
import { TestDriver } from 'testdriverai/vitest/hooks';

test('opens the login page', async (context) => {
  const testdriver = TestDriver(context);
  await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });
});
```

## TestDriver(context, options)

Creates a client for the current Vitest test.

```typescript
TestDriver(context: TestContext, options?: TestDriverOptions): TestDriver
```

### Parameters

<ParamField path="context" type="TestContext" required>
  The context Vitest passes to your test function, as in `async (context) => { ... }`. TestDriver throws if it's missing.
</ParamField>

<ParamField path="options" type="TestDriverOptions">
  Client options, such as `os`, `preview`, `cache`, or `keepAlive`. See [Options](/options) for the full list.

  <Expandable title="hook-only options">
    <ParamField path="apiKey" type="string">
      Your TestDriver API key. Defaults to the `TD_API_KEY` environment variable, which TestDriver also loads from `.env`.
    </ParamField>
    <ParamField path="debugOnFailure" type="boolean" default="false">
      If the test fails, keep its sandbox running instead of disconnecting, and print the sandbox id so you can reconnect to it.
    </ParamField>
  </Expandable>
</ParamField>

### What it does

- **Connects automatically.** It authenticates and connects to a sandbox in the background. Your first command waits for the connection.
- **Disconnects automatically** when the test finishes.
- **Returns one client per test.** Calling it again in the same test returns the same client. A retried test gets a new one.
- **Reads `TD_OS`.** If you don't pass `os`, it uses the `TD_OS` environment variable, then Linux.

### Returns

A connected `TestDriver` client.

## new TestDriver(apiKey, options)

Creates a client that you connect and disconnect yourself.

```typescript
new TestDriver(apiKey?: string, options?: TestDriverOptions)
new TestDriver(options?: TestDriverOptions)
```

### Parameters

<ParamField path="apiKey" type="string">
  Your TestDriver API key. Defaults to `TD_API_KEY`, which TestDriver loads from `.env`. Create one at [console.testdriver.ai/team/api-keys](https://console.testdriver.ai/team/api-keys).
</ParamField>

<ParamField path="options" type="TestDriverOptions">
  Client options. See [Options](/options).
</ParamField>

### Example

Share one sandbox across a test file by connecting in `beforeAll`:

```javascript tests/dashboard.test.mjs
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import TestDriver from 'testdriverai';

describe('Dashboard', () => {
  let testdriver;

  beforeAll(async () => {
    testdriver = new TestDriver({ os: 'linux' });
    await testdriver.connect();
    await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });
  });

  afterAll(async () => {
    await testdriver.disconnect();
  });

  it('shows the login form', async () => {
    const result = await testdriver.assert('a login form is visible');
    expect(result).toBe(true);
  });
});
```

## connect(options)

Connects the client to a sandbox. By default, it creates a new sandbox.

```typescript
testdriver.connect(options?: ConnectOptions): Promise<SandboxInstance>
```

`connect()` authenticates first if needed. You don't need to call `auth()` yourself.

### Parameters

<ParamField path="options" type="ConnectOptions">
  <Expandable title="properties">
    <ParamField path="sandboxId" type="string">
      Reconnect to this existing sandbox instead of creating one.
    </ParamField>
    <ParamField path="requireSandbox" type="boolean" default="false">
      With `sandboxId`, throw if that sandbox is gone, instead of creating a new, empty one in its place.
    </ParamField>
    <ParamField path="reconnect" type="boolean">
      Reconnect to the last sandbox this project used, recorded in `.testdriver/last-sandbox`. Provision calls are skipped, because the app is already running. Throws if there's no previous sandbox.
    </ParamField>
    <ParamField path="newSandbox" type="boolean" default="true">
      Create a new sandbox. Set to `false` when you pass `sandboxId` or `reconnect`.
    </ParamField>
    <ParamField path="keepAlive" type="number" default="60000">
      Milliseconds to keep the sandbox running after `disconnect()`, so you can reconnect. Capped at 30 minutes. `0` uses the default.
    </ParamField>
    <ParamField path="os" type="string" default="linux">
      `"linux"` or `"windows"`. <EnterpriseBadge /> Windows is available on Enterprise plans.
    </ParamField>
    <ParamField path="preview" type="string" default="browser">
      Where to show the live run: `"browser"`, `"ide"` (needs the TestDriver extension), or `"none"`.
    </ParamField>
    <ParamField path="reuseConnection" type="boolean" default="true">
      Reuse a recent connection if one is available.
    </ParamField>
    <ParamField path="ip" type="string">
      Connect directly to a running sandbox at this IP address, for self-hosted machines. <EnterpriseBadge />
    </ParamField>
    <ParamField path="sandboxAmi" type="string">
      Custom AMI ID for the sandbox, for self-hosted AWS deployments. <EnterpriseBadge />
    </ParamField>
    <ParamField path="sandboxInstance" type="string">
      EC2 instance type for the sandbox, for self-hosted AWS deployments. <EnterpriseBadge />
    </ParamField>
    <ParamField path="e2bTemplateId" type="string">
      E2B template ID to create the sandbox from.
    </ParamField>
    <ParamField path="headless" type="boolean" default="false">
      Deprecated. Use `preview: "none"` instead.
    </ParamField>
  </Expandable>
</ParamField>

### Returns

<ResponseField name="SandboxInstance" type="object">
  <Expandable title="properties">
    <ResponseField name="instanceId" type="string">
      The sandbox's ID.
    </ResponseField>
    <ResponseField name="ip" type="string">
      The sandbox's IP address.
    </ResponseField>
    <ResponseField name="vncPort" type="number">
      The port for the sandbox's remote display.
    </ResponseField>
  </Expandable>
</ResponseField>

### Errors

Throws `Already connected` if the client is already connected. Create a new client to connect again.

### Example

```javascript
const testdriver = new TestDriver();

// Reattach to a sandbox you kept alive earlier
const sandbox = await testdriver.connect({ sandboxId: 'sandbox-abc123', newSandbox: false });
console.log(sandbox.instanceId);
```

## disconnect()

Disconnects from the sandbox. The sandbox keeps running for the `keepAlive` time, then shuts down.

```typescript
testdriver.disconnect(): Promise<void>
```

The Vitest hook calls this for you.

## auth()

Authenticates with the TestDriver API and resolves to a session token.

```typescript
testdriver.auth(): Promise<string>
```

You rarely need it, because `connect()` calls it when needed.

## getInstance()

Returns the connected sandbox's details, or `null` if the client isn't connected.

```typescript
testdriver.getInstance(): SandboxInstance | null
```

## getSessionId()

Returns the current session ID, or `null`. Include it when you report a problem.

```typescript
testdriver.getSessionId(): string | null
```

## getLastSandboxId()

Returns the most recent sandbox, or `null` if there isn't one. It reads from the connected client, or from `.testdriver/last-sandbox`.

```typescript
testdriver.getLastSandboxId(): { sandboxId: string; os?: 'windows' | 'linux'; createdAt?: number } | null
```

## setLogging(enabled)

Turns console logging on or off while the test runs.

```typescript
testdriver.setLogging(enabled: boolean): void
```

## getEmitter()

Returns the client's event emitter, so you can react to what TestDriver does.

```typescript
testdriver.getEmitter(): EventEmitter2
```

```javascript
const emitter = testdriver.getEmitter();

emitter.on('log:warn', (message) => console.warn('TestDriver warning:', message));
emitter.on('error:sdk', (error) => console.error('TestDriver API error:', error.message));
```

See [Events](/events) for every event name.

## Related

- [Options](/options): every option you can pass to the client
- [Launch apps](/provision): start Chrome, extensions, and desktop apps once connected
- [Run tests](/copilot/running-tests#reuse-a-sandbox-while-you-iterate): reuse a sandbox between runs
- [Events](/events): listen for commands, logs, and errors
