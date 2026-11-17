---
name: testdriver:debugging-with-screenshots
description: Find out why a test failed from its replay and step-by-step screenshots.
---
<!-- Generated from debugging-with-screenshots.mdx. DO NOT EDIT. -->

When a test fails, look at what the sandbox showed instead of guessing from the error.

- Every run records a replay you can step through.
- With automatic screenshots on, TestDriver also saves an image before and after each `testdriver` method call, named after the line of code that ran it.

## Watch the replay

Every test run prints a link to its report when it finishes:

```text
TESTDRIVER_RUN_URL=https://console.testdriver.ai/runs/abc123
```

The report plays a recording of the run next to a list of every command it ran, such as `find()`, `click()`, and `assert()`.

Select a command to see the screen as it was when that command ran, and what the AI decided. This is the most reliable view of a failure. It shows what TestDriver saw, not what you expected on screen.

Use it to answer the usual questions:

- **Was the right page showing?** You see right away if a `find()` or `assert()` ran on the wrong page or before the page loaded.
- **Was the element on screen?** If `find()` couldn't locate an element, check whether it was hidden, scrolled out of view, or labelled differently.
- **Did the click land?** Compare the screen before and after a `click()` to see whether anything changed.

## Save a screenshot at every step

To inspect a run locally, turn on automatic screenshots. TestDriver saves a screenshot before and after each `testdriver` method call and each `find()`, plus one when a call fails. Actions on an element, like `element.click()`, aren't captured:

```javascript
const testdriver = TestDriver(context, { autoScreenshots: true });
```

Screenshots are saved to `.testdriver/screenshots/<test file>/`. Each name records:

- The order.
- The command.
- The phase.
- The line of your test that ran it.

For example:

```text
.testdriver/screenshots/login.test/
  001-find-before-L15-email-input.png
  002-find-after-L15-email-input.png
  003-type-before-L17-userexamplecom.png
  004-assert-error-L20-the-dashboard-is-visible.png
```

Automatic screenshots are off by default. TestDriver clears each test file's folder at the start of its next run.

To save a screenshot at a specific point instead, call [`screenshot()`](/screenshot). For the full naming format, see [Screenshots](/screenshots).

## Inspect screenshots with your AI assistant

With the [local TestDriver MCP server](/mcp-setup#run-the-server-locally), your AI assistant can list and view these screenshots. Ask in plain language:

```text
The login test failed at line 42. Show me the screenshots from just before and after that line.
```

The assistant uses two MCP tools to answer:

- **`list_local_screenshots`** finds screenshots by test file, line or line range, command, phase (`before`, `after`, or `error`), sequence, or a filename pattern.
- **`view_local_screenshot`** opens one of the screenshots it found, so both you and the assistant can see it.

These tools read the `.testdriver/` folder on the machine running the MCP server. They don't work with the hosted server at `mcp.testdriver.ai`.

<Accordion title="list_local_screenshots parameters">

  <ParamField path="directory" type="string">
    Test file folder or subfolder to search, such as `login.test`. Searches everything when omitted.
  </ParamField>
  <ParamField path="line" type="number">
    Exact line number in the test file. `42` matches screenshots named `L42`.
  </ParamField>
  <ParamField path="lineRange" type="object">
    Line range to match, inclusive: `{ start: 35, end: 45 }`.
  </ParamField>
  <ParamField path="action" type="string">
    Command name, such as `click`, `find`, `type`, or `assert`.
  </ParamField>
  <ParamField path="phase" type="string">
    `"before"`, `"after"`, or `"error"` (taken when a command fails).
  </ParamField>
  <ParamField path="pattern" type="string">
    Regular expression to match against filenames, such as `"login|signin"`.
  </ParamField>
  <ParamField path="sequence" type="number">
    Exact sequence number.
  </ParamField>
  <ParamField path="sequenceRange" type="object">
    Sequence range to match, inclusive: `{ start: 1, end: 10 }`.
  </ParamField>
  <ParamField path="limit" type="number" default="50">
    Maximum number of results.
  </ParamField>
  <ParamField path="sortBy" type="string" default="modified">
    `"modified"` (newest first), `"sequence"` (execution order), or `"line"`.
  </ParamField>

  `view_local_screenshot` takes one parameter, `path`: the full path of a screenshot returned by `list_local_screenshots`.

</Accordion>

## Common causes

<AccordionGroup>
  <Accordion title="find() acted before the page was ready">

    The screenshot shows a loading state or the previous page.

    Pass a `timeout` so `find()` keeps checking the screen while the page loads, for example `testdriver.find('Dashboard heading', { timeout: 30000 })`. See [Waiting for elements](/guide/best-practices-polling).

  </Accordion>
  <Accordion title="find() picked the wrong element">

    The screenshot shows a click on a similar-looking element.

    Add the element's visible label, position, or color to the description, such as "the blue Sign In button in the header". See [Locate elements](/locating-elements).

  </Accordion>
  <Accordion title="An assertion failed even though the page looks right">

    Read the AI's reasoning for the assertion in the report.

    Assertions that mention exact wording or several conditions at once fail more often. Check one thing at a time, in plain language. See [Make assertions](/making-assertions).

  </Accordion>
  <Accordion title="There are no screenshots in .testdriver/screenshots">

    Automatic screenshots are off by default. Set `autoScreenshots: true` when you create the client, or call `screenshot()` at the points you care about.

    Also check that you're looking in the project folder you ran the test from.

  </Accordion>
</AccordionGroup>

## Next steps

<CardGroup cols={2}>
  <Card title="Prevent regressions" icon="shield-check" href="/copilot/auto-healing">
    Catch regressions in CI and repair tests when your UI changes.
  </Card>
  <Card title="Errors" icon="triangle-exclamation" href="/errors">
    The errors TestDriver throws and how to handle them.
  </Card>
  <Card title="Screenshots" icon="camera" href="/screenshots">
    Naming, folders, and options for saved screenshots.
  </Card>
  <Card title="Dashcam" icon="video" href="/dashcam">
    How runs are recorded, and how to add your own logs.
  </Card>
</CardGroup>
