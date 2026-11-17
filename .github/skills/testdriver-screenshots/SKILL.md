---
name: testdriver:screenshots
description: Save screenshots of the sandbox by hand or automatically around each command.
---
<!-- Generated from screenshots.mdx. DO NOT EDIT. -->

TestDriver can save screenshots of the sandbox to your machine while a test runs.

- Call [`screenshot()`](/screenshot) to save one at a specific point.
- Turn on `autoScreenshots` to save one before and after each command, named after the line that ran it.

Both kinds are saved as PNG files in `.testdriver/screenshots/<test file>/`.

## Save a screenshot by hand

Call `screenshot()` with an optional file name. It resolves to the absolute path of the saved file:

```javascript tests/login.test.mjs
import { describe, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Login', () => {
  it('loads the login page', async (context) => {
    const testdriver = TestDriver(context);
    await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });

    const filePath = await testdriver.screenshot('login-page');
    console.log(filePath);
    // /path/to/project/.testdriver/screenshots/login.test/login-page.png
  });
});
```

- TestDriver adds `.png` if the name doesn't end with it.
- Without a name, the file is called `screenshot-<timestamp>.png`.

See [screenshot()](/screenshot) for the full reference.

## Save screenshots automatically

Set `autoScreenshots: true` when you create the client:

```javascript
const testdriver = TestDriver(context, { autoScreenshots: true });
```

TestDriver then saves a screenshot before each command and another after it. When a command fails, it saves an `error` screenshot instead of the `after` one. A failed screenshot never fails the command.

Automatic screenshots are off by default because each one is an extra capture from the sandbox.

### Which commands are captured

- `find()` and `findAll()`.
- Methods you call on the client, such as `testdriver.click()`, `type()`, `pressKeys()`, `scroll()`, `hover()`, `wait()`, `assert()`, `extract()`, `exec()`, and `focusApplication()`.

<Note>
  Methods you call on an element, such as `element.click()` or `element.hover()`, aren't captured. The `find()` that returned the element is.
</Note>

### File names

Each automatic screenshot is named:

```text
<sequence>-<command>-<phase>-L<line>-<description>.png
```

| Part | Meaning | Example |
| --- | --- | --- |
| `sequence` | Three-digit counter, in the order screenshots were taken | `001` |
| `command` | The method that ran | `find`, `type`, `assert` |
| `phase` | `before`, `after`, or `error` | `before` |
| `L<line>` | The line in your test file that called the command | `L15` |
| `description` | Taken from the command's arguments, as below | `email-input` |

The description comes from:

- The description passed to `find()` or `findAll()`.
- The first 20 characters typed by `type()`, unless you pass `secret: true`.
- The keys passed to `pressKeys()`, joined with `+`.
- The direction passed to `scroll()`.
- The first 30 characters of the text passed to `assert()` or `extract()`.

TestDriver lowercases it, drops anything other than letters, digits, spaces, and hyphens, turns spaces into hyphens, and keeps the first 30 characters.

### Example

This test:

```javascript
await testdriver.find('Email input field').click(); // line 15
await testdriver.type('user@example.com');          // line 16
await testdriver.assert('the email is filled in');  // line 17
```

saves:

```text
.testdriver/screenshots/login.test/
  001-find-before-L15-email-input-field.png
  002-find-after-L15-email-input-field.png
  003-type-before-L16-userexamplecom.png
  004-type-after-L16-userexamplecom.png
  005-assert-before-L17-the-email-is-filled-in.png
  006-assert-after-L17-the-email-is-filled-in.png
```

## Where screenshots are saved

Screenshots go in a folder named after the test file, without its last extension:

| Test file | Folder |
| --- | --- |
| `tests/login.test.mjs` | `.testdriver/screenshots/login.test/` |
| `tests/checkout.spec.js` | `.testdriver/screenshots/checkout.spec/` |

The `.testdriver` folder is created in the directory you run the tests from.

TestDriver deletes a test file's screenshot folder when that file's first test connects to a sandbox. Each folder only holds screenshots from the latest run. Tests in the same file running at the same time don't delete each other's screenshots.

## Review the screenshots

Open the folder after a run, or ask your AI assistant to find and show screenshots by line number. [Debug a failing test](/debugging-with-screenshots#inspect-screenshots-with-your-ai-assistant) explains how to do that with the TestDriver MCP server.

## Related

- [screenshot()](/screenshot): the reference for manual screenshots
- [Debug a failing test](/debugging-with-screenshots): use replays and screenshots to find out why a test failed
- [Dashcam](/dashcam): the video recording of each run
- [Options](/options#preview-and-recording): every client option
