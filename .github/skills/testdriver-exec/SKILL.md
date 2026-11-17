---
name: testdriver:exec
description: Run a shell or PowerShell command in the sandbox and get its output.
---
<!-- Generated from exec.mdx. DO NOT EDIT. -->

Run a command in the sandbox, for example to create test files, install software, or launch an app. `exec()` returns the command's output.

```javascript
const files = await testdriver.exec({ language: 'sh', code: 'ls ~/Downloads' });
```

- On Linux sandboxes, use `'sh'`. The command runs in Bash.
- On Windows sandboxes, use `'pwsh'`. The command runs in PowerShell.

## Signature

```typescript
testdriver.exec(options: ExecOptions): Promise<string>
```

## Parameters

<ParamField path="options" type="ExecOptions" required>
  <Expandable title="properties">
    <ParamField path="code" type="string" required>
      The command or script to run. It can span several lines.
    </ParamField>
    <ParamField path="language" type="'sh' | 'pwsh'" default="pwsh">
      The shell to run it in. The default is `'pwsh'`, so set `'sh'` on Linux, which is the default sandbox. On a Windows sandbox, `'sh'` switches to `'pwsh'` with a warning.
    </ParamField>
    <ParamField path="timeout" type="number" default="300000">
      How long the command may run, in milliseconds. The default is 5 minutes.
    </ParamField>
    <ParamField path="silent" type="boolean" default="false">
      Keep the command and its output out of the test log.
    </ParamField>
  </Expandable>
</ParamField>

Commands run in one shell session that stays open for the whole test. A `cd` or an environment variable you set carries over to the next `exec()` call.

## Returns

`Promise<string>`. The command's standard output, with leading and trailing whitespace trimmed. Output over 5 MB is cut off.

## Errors

`exec()` throws when:

- The command exits with a non-zero code. The message is `Command failed with exit code <code>: <stderr>`.
- The command runs longer than `timeout`.

To allow a failure, catch the error:

```javascript
try {
  await testdriver.exec({ language: 'sh', code: 'pkill -f my-app' });
} catch (error) {
  // pkill exits with 1 when no process matched
}
```

## Examples

### Create a file the test needs

```javascript
await testdriver.exec({
  language: 'sh',
  code: 'echo "name,email" > ~/Desktop/contacts.csv',
});
```

### Read a value and check it

```javascript
const version = await testdriver.exec({ language: 'sh', code: 'node --version' });
expect(version).toMatch(/^v\d+/);
```

### Install software on Windows

```javascript
await testdriver.exec({
  language: 'pwsh',
  code: 'choco install firefox -y',
  timeout: 600000,
  silent: true,
});
```

### Launch an app on Windows

```javascript
await testdriver.exec({ language: 'pwsh', code: 'Start-Process notepad' });
await testdriver.focusApplication('Notepad');
```

To open Chrome, VS Code, Electron apps, or installers, use [`provision`](/provision) instead. It launches the app and waits for it.

## Positional form

Older tests pass the options as arguments:

```typescript
testdriver.exec(language: 'sh' | 'pwsh', code: string, timeout?: number, silent?: boolean): Promise<string>
```

```javascript
await testdriver.exec('sh', 'ls ~/Downloads', 5000);
```

It behaves the same. Use the options object in new tests.

<Note>
  `language: 'js'` is also accepted. It runs the code in Node on your own machine, not in the sandbox, and returns the value you assign to a `result` variable. Write the JavaScript directly in your test instead.
</Note>

## Complete example

```javascript tests/download.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Downloads', () => {
  it('opens a file created in the sandbox', async (context) => {
    const testdriver = TestDriver(context);
    await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });

    await testdriver.exec({
      language: 'sh',
      code: 'echo "<h1>Hello from exec</h1>" > /tmp/hello.html',
    });

    const contents = await testdriver.exec({ language: 'sh', code: 'cat /tmp/hello.html' });
    expect(contents).toContain('Hello from exec');

    await testdriver.pressKeys(['ctrl', 'l']);
    await testdriver.type('file:///tmp/hello.html');
    await testdriver.pressKeys(['enter']);

    const result = await testdriver.assert('the page shows "Hello from exec"');
    expect(result).toBe(true);
  });
});
```

## Related

- [Launch apps](/provision): open Chrome, VS Code, and installers
- [focusApplication()](/focus-application): bring a launched app to the front
- [Customize devices](/customizing-devices): set up the sandbox before your test
