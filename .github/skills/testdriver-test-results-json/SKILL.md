---
name: testdriver:test-results-json
description: Read each test's result, replay link, and run details from a JSON file.
---
<!-- Generated from test-results-json.mdx. DO NOT EDIT. -->

TestDriver writes a JSON file for each test after it finishes.

- It has the test's result, error, and links to its report and replay.
- It also records versions, sandbox details, and how many `find()` calls hit the cache.
- Use it in CI scripts instead of parsing console output.

## Turn it on

The TestDriver Vitest reporter writes the files. `npx testdriverai init` adds it to `vitest.config.js` for you:

```javascript vitest.config.js
import { defineConfig } from 'vitest/config';
import TestDriver from 'testdriverai/vitest';

export default defineConfig({
  test: {
    testTimeout: 300000,
    hookTimeout: 300000,
    reporters: ['default', TestDriver()],
    setupFiles: ['testdriverai/vitest/setup'],
  },
});
```

The reporter records each run in TestDriver, so it needs your API key in `TD_API_KEY`. If it can't record the run, it doesn't write the files.

## Where the files go

```text
.testdriver/results/<test file>/<test id>.json
```

- `<test file>` is the test file's path relative to the project root, such as `tests/login.test.mjs`.
- `<test id>` is Vitest's ID for the test, with characters other than letters, digits, `_`, `.`, and `-` replaced by `_`. Read the test's name from `test.name` inside the file.

The folder isn't cleared between runs. Delete `.testdriver/results` before a run if you only want the latest results.

## Example

```json .testdriver/results/tests/login.test.mjs/1223128da3_0_0.json
{
  "versions": {
    "sdk": "7.11.228",
    "vitest": "4.0.8",
    "api": "7.11.228",
    "runnerBefore": "2.4.1",
    "runnerAfter": "2.4.1",
    "runnerWasUpdated": false
  },
  "test": {
    "file": "tests/login.test.mjs",
    "name": "shows an error for an empty form",
    "suite": "Login",
    "passed": false,
    "caseId": "6712f0c4e1a2b3c4d5e6f701",
    "runId": "6712f0b9e1a2b3c4d5e6f700",
    "error": "AI Assertion failed: an error says the fields are required",
    "errorStack": "Error: AI Assertion failed: ..."
  },
  "urls": {
    "api": "https://api.testdriver.ai",
    "console": "https://console.testdriver.ai",
    "vnc": null,
    "testRun": "https://console.testdriver.ai/runs/6712f0b9e1a2b3c4d5e6f700/6712f0c4e1a2b3c4d5e6f701"
  },
  "replay": {
    "url": "https://console.testdriver.ai/replay/6789abcdef0123456789abcd?share=k3y",
    "gifUrl": "https://api.testdriver.ai/replay/6789abcdef0123456789abcd/gif?shareKey=k3y",
    "embedUrl": "https://console.testdriver.ai/replay/6789abcdef0123456789abcd?share=k3y&embed=true",
    "markdown": "[![Test Recording](https://api.testdriver.ai/replay/6789abcdef0123456789abcd/gif?shareKey=k3y)](https://console.testdriver.ai/replay/6789abcdef0123456789abcd?share=k3y)"
  },
  "date": "2026-10-21T14:30:00.000Z",
  "team": {
    "id": "team_abc123",
    "sessionId": "sess_xyz789"
  },
  "infrastructure": {
    "sandboxId": "sbx-123",
    "instanceId": null,
    "os": "linux",
    "amiId": null,
    "e2bTemplateId": null,
    "imageVersion": null
  },
  "realtime": {
    "channel": "sandbox:sbx-123",
    "messageCount": 42
  },
  "interactions": {
    "total": 3,
    "cached": 1,
    "byType": { "find": 3 }
  }
}
```

Values that TestDriver doesn't know are `null`.

## Fields

### versions

| Field | Type | Description |
| --- | --- | --- |
| `versions.sdk` | `string \| null` | TestDriver SDK version |
| `versions.vitest` | `string \| null` | Vitest version |
| `versions.api` | `string \| null` | TestDriver API version |
| `versions.runnerBefore` | `string \| null` | Sandbox runner version when the sandbox started |
| `versions.runnerAfter` | `string \| null` | Runner version after any update during setup |
| `versions.runnerWasUpdated` | `boolean` | Whether the runner was updated during setup |

### test

| Field | Type | Description |
| --- | --- | --- |
| `test.file` | `string \| null` | Test file path, relative to the directory you ran the tests from |
| `test.name` | `string \| null` | The test's name |
| `test.suite` | `string \| null` | The enclosing `describe` names, outermost first, joined with ` > ` |
| `test.passed` | `boolean` | Whether the test passed |
| `test.caseId` | `string \| null` | ID of this test's result in TestDriver |
| `test.runId` | `string \| null` | ID of the whole run in TestDriver |
| `test.error` | `string \| null` | The error message, if the test failed |
| `test.errorStack` | `string \| null` | The error's stack trace, if the test failed |

### urls

| Field | Type | Description |
| --- | --- | --- |
| `urls.api` | `string \| null` | The TestDriver API the test used |
| `urls.console` | `string \| null` | The TestDriver console |
| `urls.vnc` | `string \| null` | The sandbox's VNC address |
| `urls.testRun` | `string \| null` | This test's report in the console |

### replay

The test's [Dashcam](/dashcam) recording.

| Field | Type | Description |
| --- | --- | --- |
| `replay.url` | `string \| null` | The replay link |
| `replay.gifUrl` | `string \| null` | An animated GIF of the recording |
| `replay.embedUrl` | `string \| null` | The replay link with `&embed=true`, for embedding |
| `replay.markdown` | `string \| null` | Markdown for the GIF, linked to the replay, ready to paste into a pull request comment or README |

`gifUrl`, `embedUrl`, and `markdown` are filled in only when the replay link includes a `?share=` key.

### date, team, and infrastructure

| Field | Type | Description |
| --- | --- | --- |
| `date` | `string` | When the test finished, as an ISO 8601 string |
| `team.id` | `string \| null` | Your team's ID |
| `team.sessionId` | `string \| null` | The SDK session ID |
| `infrastructure.sandboxId` | `string \| null` | The sandbox's ID |
| `infrastructure.instanceId` | `string \| null` | The sandbox's instance ID |
| `infrastructure.os` | `string \| null` | `"linux"` or `"windows"` |
| `infrastructure.amiId` | `string \| null` | The machine image the sandbox started from |
| `infrastructure.e2bTemplateId` | `string \| null` | The sandbox template the sandbox started from |
| `infrastructure.imageVersion` | `string \| null` | The sandbox image version |

### realtime and interactions

| Field | Type | Description |
| --- | --- | --- |
| `realtime.channel` | `string \| null` | The realtime channel used to talk to the sandbox |
| `realtime.messageCount` | `number` | Messages sent on that channel |
| `interactions.total` | `number` | Number of `find()` and `findAll()` calls |
| `interactions.cached` | `number` | How many of those were answered from the [cache](/caching) |
| `interactions.byType` | `object` | Counts per method, such as `{ "find": 3, "findAll": 1 }` |

## Use the results in CI

This GitHub Actions step adds a table of results to the job summary:

```yaml
- name: Run tests
  run: npx vitest run

- name: Summarize results
  if: always()
  run: |
    echo '| Test | Result | Report |' >> "$GITHUB_STEP_SUMMARY"
    echo '| --- | --- | --- |' >> "$GITHUB_STEP_SUMMARY"
    find .testdriver/results -name '*.json' -exec cat {} + \
      | jq -rs '.[] | "| \(.test.name) | \(if .test.passed then "Passed" else "Failed" end) | \(.urls.testRun) |"' \
      >> "$GITHUB_STEP_SUMMARY"
```

To read the results in Node.js:

```javascript scripts/report.mjs
import fs from 'node:fs';
import path from 'node:path';

const dir = '.testdriver/results';
const results = fs
  .readdirSync(dir, { recursive: true })
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));

const failed = results.filter((result) => !result.test.passed);
console.log(`${results.length - failed.length} passed, ${failed.length} failed`);

for (const result of failed) {
  console.log(`FAIL ${result.test.name}: ${result.test.error}`);
  console.log(`  Report: ${result.urls.testRun}`);
}
```

## Related

- [Dashcam](/dashcam): how the replay is recorded
- [Run in CI/CD](/ci-cd): run your tests on every pull request
- [Run tests](/copilot/running-tests): run tests locally and in parallel
