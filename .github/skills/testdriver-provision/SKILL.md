---
name: testdriver:provision
description: Start Chrome, a Chrome extension, VS Code, an Electron app, or an installer in the sandbox.
---
<!-- Generated from provision.mdx. DO NOT EDIT. -->

Start the app you want to test with a `provision` method. Call one at the beginning of each test.

```javascript
await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });
```

Every provision method:

- Launches or installs the app in the sandbox. The Chrome methods also wait until Chrome is ready.
- Starts the [Dashcam](/dashcam) recording, unless you turned it off with `dashcam: false`.
- Does nothing when the client was created with `reconnect: true`, because the app is already running.

| Method | Use it to test |
| --- | --- |
| [`chrome()`](#chrome-options) | A website |
| [`chromeExtension()`](#chromeextension-options) | A Chrome extension |
| [`vscode()`](#vscode-options) | VS Code or a VS Code extension |
| [`installer()`](#installer-options) | A desktop app you download and install |
| [`electron()`](#electron-options) | An Electron app |
| [`dashcam()`](#dashcam-options) | Custom recording settings |

## chrome(options)

Opens Chrome at a URL.

```typescript
testdriver.provision.chrome(options?: ProvisionChromeOptions): Promise<void>
```

<ParamField path="options" type="ProvisionChromeOptions">
  <Expandable title="properties">
    <ParamField path="url" type="string" default="http://testdriver-sandbox.vercel.app/">
      The page to open.
    </ParamField>
    <ParamField path="maximized" type="boolean" default="true">
      Start with the window maximized.
    </ParamField>
    <ParamField path="guest" type="boolean" default="false">
      Use Chrome's guest profile, with no saved data.
    </ParamField>
  </Expandable>
</ParamField>

Chrome also records the site's network traffic in the Dashcam replay.

```javascript
await testdriver.provision.chrome({ url: 'https://example.com', guest: true });
```

## chromeExtension(options)

Opens Chrome with an extension loaded.

```typescript
testdriver.provision.chromeExtension(options: ProvisionChromeExtensionOptions): Promise<void>
```

<ParamField path="options" type="ProvisionChromeExtensionOptions" required>
  Pass either `extensionId` or `extensionPath`. It throws if you pass neither.

  <Expandable title="properties">
    <ParamField path="extensionId" type="string">
      A Chrome Web Store extension ID. TestDriver downloads the extension into the sandbox.
    </ParamField>
    <ParamField path="extensionPath" type="string">
      The path to an unpacked extension **inside the sandbox**. Nothing is copied from your machine, so get the files there first, for example with [`exec()`](/exec).
    </ParamField>
    <ParamField path="maximized" type="boolean" default="true">
      Start with the window maximized.
    </ParamField>
  </Expandable>
</ParamField>

From the Chrome Web Store:

```javascript
await testdriver.provision.chromeExtension({
  extensionId: 'cjpalhdlnbpafiamejdnhcphjbkeiagm', // uBlock Origin
});
```

From source:

```javascript
await testdriver.exec({
  language: 'sh',
  code: 'git clone https://github.com/your-org/your-extension.git /tmp/your-extension',
});
await testdriver.provision.chromeExtension({ extensionPath: '/tmp/your-extension' });
```

## vscode(options)

Opens VS Code, optionally with a folder and extensions.

```typescript
testdriver.provision.vscode(options?: ProvisionVSCodeOptions): Promise<void>
```

<ParamField path="options" type="ProvisionVSCodeOptions">
  <Expandable title="properties">
    <ParamField path="workspace" type="string">
      A folder or `.code-workspace` file in the sandbox to open.
    </ParamField>
    <ParamField path="extensions" type="string[]" default="[]">
      Marketplace extension IDs to install before VS Code opens.
    </ParamField>
  </Expandable>
</ParamField>

```javascript
await testdriver.provision.vscode({
  workspace: '/tmp/my-project',
  extensions: ['esbenp.prettier-vscode'],
});
```

## installer(options)

Downloads a file into the sandbox, installs it, and returns the downloaded file's path.

```typescript
testdriver.provision.installer(options: ProvisionInstallerOptions): Promise<string>
```

<ParamField path="options" type="ProvisionInstallerOptions" required>
  <Expandable title="properties">
    <ParamField path="url" type="string" required>
      Where to download the file from.
    </ParamField>
    <ParamField path="filename" type="string">
      The name to save the file as. By default, it comes from the download.
    </ParamField>
    <ParamField path="appName" type="string">
      The app to bring to the front after installing.
    </ParamField>
    <ParamField path="launch" type="boolean" default="true">
      Start the app after installing it.

      - **`.deb` on Linux:** starts the app from its `.desktop` entry. If there isn't one and you set `appName`, it starts the package's first `/usr/bin` program.
      - **`.sh` scripts:** runs the script.
      - **Everywhere:** focuses `appName`, if you set it.

      With `false`, packages are still installed, and a script is only made executable.
    </ParamField>
  </Expandable>
</ParamField>

TestDriver picks the install method from the file extension:

| OS | Extension | What happens |
| --- | --- | --- |
| Windows | `.msi` | Installed quietly with `msiexec` |
| Windows | `.exe` | Run with `/S` for a silent install |
| Linux | `.deb` | Installed with `dpkg`. Missing dependencies are installed with `apt-get`, and the step fails if the package still isn't fully installed |
| Linux | `.rpm` | Installed with `rpm` |
| Linux | `.AppImage` | Made executable |
| Linux | `.sh` | Made executable and run (only made executable with `launch: false`) |
| macOS | `.dmg`, `.pkg` | Copied to Applications, or installed with `installer` |

Other file types are downloaded but not installed.

```javascript
// Install bat, then check that it runs (bat has no window, so nothing is launched)
await testdriver.provision.installer({
  url: 'https://github.com/sharkdp/bat/releases/download/v0.24.0/bat_0.24.0_amd64.deb',
});
const output = await testdriver.exec({ language: 'sh', code: 'bat --version' });
console.log(output); // for example "bat 0.24.0"
```

Install a desktop app and start it:

```javascript
// Installs Yaak and its dependencies, starts it, and brings its window to the front
await testdriver.provision.installer({
  url: 'https://github.com/mountain-loop/yaak/releases/download/v2026.9.0/yaak_2026.9.0_amd64.deb',
  appName: 'Yaak',
});
```

## electron(options)

Opens an Electron app that's already in the sandbox.

```typescript
testdriver.provision.electron(options: ProvisionElectronOptions): Promise<void>
```

<ParamField path="options" type="ProvisionElectronOptions" required>
  <Expandable title="properties">
    <ParamField path="appPath" type="string" required>
      The path to the app in the sandbox. It throws if this is missing.
    </ParamField>
    <ParamField path="args" type="string[]" default="[]">
      Extra command-line arguments for the app.
    </ParamField>
  </Expandable>
</ParamField>

```javascript
await testdriver.provision.electron({ appPath: '/tmp/my-electron-app', args: ['--no-sandbox'] });
```

## dashcam(options)

Starts the Dashcam recording with your own settings. The other provision methods start it for you, so call this only to change the log file, the log name, or the recording's title.

```typescript
testdriver.provision.dashcam(options?: ProvisionDashcamOptions): Promise<void>
```

<ParamField path="options" type="ProvisionDashcamOptions">
  <Expandable title="properties">
    <ParamField path="logPath" type="string">
      A log file in the sandbox to include in the replay. Defaults to `/tmp/testdriver.log` on Linux, or `C:\Users\testdriver\testdriver.log` on Windows.
    </ParamField>
    <ParamField path="logName" type="string" default="TestDriver Log">
      The log's name in the replay.
    </ParamField>
    <ParamField path="webLogs" type="boolean" default="true">
      Record network traffic. It covers the site opened with `chrome()`, or all traffic otherwise.
    </ParamField>
    <ParamField path="title" type="string">
      A title for the recording.
    </ParamField>
  </Expandable>
</ParamField>

```javascript
await testdriver.provision.dashcam({ title: 'Checkout flow', logPath: '/tmp/my-app.log', logName: 'App log' });
```

## Complete example

```javascript tests/extension.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Loom extension', () => {
  it('appears in the extensions menu', async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chromeExtension({
      extensionId: 'liecbddmkiiihnedobmlmillhodjkdmb',
    });

    await testdriver.find('puzzle-piece extensions icon in the Chrome toolbar').click();

    const loom = await testdriver.find('Loom in the extensions dropdown');
    expect(loom.found()).toBe(true);
  });
});
```

## Related

- [Client & connection](/client): create and connect the client
- [exec()](/exec): run commands in the sandbox, for example to fetch files before provisioning
- [Dashcam](/dashcam): how runs are recorded
- [Examples](/examples/installer): complete tests that install and launch apps
