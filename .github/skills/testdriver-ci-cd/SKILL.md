---
name: testdriver:ci-cd
description: Run TestDriver tests on every push and pull request in GitHub Actions or any CI provider.
---
<!-- Generated from ci-cd.mdx. DO NOT EDIT. -->

import { EnterpriseBadge, EnterpriseCta } from '/snippets/enterprise.mdx';

TestDriver tests are ordinary Vitest files, so any CI provider can run them with `npx vitest run`. Each test starts its own cloud sandbox, and every run is recorded in the [TestDriver console](https://console.testdriver.ai).

You need two things in CI:

- **Authentication.** On GitHub Actions, use the TestDriver action with OIDC. Elsewhere, store your API key as a secret named `TD_API_KEY`.
- **Your test command,** `npx vitest run`.

## GitHub Actions

The [`testdriverai/action`](https://github.com/testdriverai/action) authenticates with GitHub's OIDC token, so you don't store an API key in GitHub. It exchanges the token for your team's key and exports `TD_API_KEY` for later steps. It doesn't run tests itself.

<Steps>
  <Step title="Authorize the TestDriver GitHub app">

    Install the [TestDriver GitHub app](/quickstart-github) on your organization. This links the organization to your TestDriver team. If you authorized the app before OIDC support was added, authorize it again once.

  </Step>
  <Step title="Add the workflow">

    `npx testdriverai init` writes this file for you:

    ```yaml .github/workflows/testdriver.yml
    name: TestDriver tests

    on:
      push:
        branches: [main]
      pull_request:
        branches: [main]

    jobs:
      test:
        runs-on: ubuntu-latest
        permissions:
          id-token: write # lets the job mint an OIDC token
          contents: read

        steps:
          - uses: actions/checkout@v4

          - uses: actions/setup-node@v4
            with:
              node-version: '20'
              cache: 'npm'

          - run: npm ci

          - name: Authenticate to TestDriver
            uses: testdriverai/action@stable
            with:
              api-key: ${{ secrets.TD_API_KEY }} # optional fallback

          - name: Run tests
            run: npx vitest run
    ```

  </Step>
</Steps>

The job needs `id-token: write`, or the action can't mint the OIDC token.

The `api-key` input is a fallback. The action uses it only when OIDC authentication fails, for example on a fork or before the app is authorized. Leave the secret unset if you don't need it.

<AccordionGroup>
  <Accordion title="Action inputs">

    | Input | Default | Description |
    | --- | --- | --- |
    | `channel` | `stable` | TestDriver release channel: `stable`, `canary`, `test`, or `dev`. Selects the API the action talks to. |
    | `api-root` | | An explicit API URL. Overrides `channel`. |
    | `api-key` | | A TestDriver API key to use if OIDC authentication fails. |

  </Accordion>
  <Accordion title="Use a stored key instead of OIDC">

    If OIDC isn't available, skip the action and pass the key directly:

    1. Copy an API key from the [API keys page](https://console.testdriver.ai/team/api-keys).
    2. In your repository, go to **Settings → Secrets and variables → Actions** and add a secret named `TD_API_KEY`.
    3. Pass it to the test step:

    ```yaml
    - name: Run tests
      run: npx vitest run
      env:
        TD_API_KEY: ${{ secrets.TD_API_KEY }}
    ```

  </Accordion>
</AccordionGroup>

## Other CI providers

Copy an API key from the [API keys page](https://console.testdriver.ai/team/api-keys). Store it as a secret named `TD_API_KEY` in your CI provider, then use the config for your provider.

<Warning>
  Never commit your API key to the repository. Keep it in your CI provider's secret store.
</Warning>

<Tabs>
  <Tab title="GitLab CI">

    Add `TD_API_KEY` under **Settings → CI/CD → Variables**, with **Mask variable** checked. GitLab exposes project variables to every job.

    ```yaml .gitlab-ci.yml
    testdriver:
      image: node:20
      script:
        - npm ci
        - npx vitest run
    ```

  </Tab>
  <Tab title="CircleCI">

    Add `TD_API_KEY` under **Project Settings → Environment Variables**. CircleCI exposes project variables to every job.

    ```yaml .circleci/config.yml
    version: 2.1

    jobs:
      test:
        docker:
          - image: cimg/node:lts
        steps:
          - checkout
          - run: npm ci
          - run: npx vitest run

    workflows:
      test:
        jobs:
          - test
    ```

  </Tab>
  <Tab title="Azure Pipelines">

    Add `TD_API_KEY` as a pipeline variable and mark it secret. Azure doesn't expose secret variables to scripts automatically, so map it with `env`.

    ```yaml azure-pipelines.yml
    trigger:
      - main

    pool:
      vmImage: ubuntu-latest

    steps:
      - task: NodeTool@0
        inputs:
          versionSpec: '20.x'

      - script: npm ci
        displayName: Install dependencies

      - script: npx vitest run
        displayName: Run TestDriver tests
        env:
          TD_API_KEY: $(TD_API_KEY)
    ```

  </Tab>
  <Tab title="Jenkins">

    Add a **Secret text** credential with the ID `td-api-key` under **Manage Jenkins → Credentials**.

    ```groovy Jenkinsfile
    pipeline {
        agent { docker { image 'node:20' } }

        environment {
            TD_API_KEY = credentials('td-api-key')
        }

        stages {
            stage('Test') {
                steps {
                    sh 'npm ci'
                    sh 'npx vitest run'
                }
            }
        }
    }
    ```

  </Tab>
</Tabs>

## Split tests across jobs

Vitest runs test files in parallel within one job. To spread a large suite across several jobs, use Vitest's `--shard` flag:

```yaml .github/workflows/testdriver.yml
jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - uses: testdriverai/action@stable
      - run: npx vitest run --shard=${{ matrix.shard }}/4
```

Other providers work the same way. Run `npx vitest run --shard=<index>/<total>` in each parallel job.

## Run on Linux and Windows

Set `TD_OS` to choose the sandbox's operating system. TestDriver reads it when it creates the sandbox, so your tests don't need any changes:

```yaml
strategy:
  fail-fast: false
  matrix:
    td-os: [linux, windows]

steps:
  # ...checkout, setup-node, npm ci, testdriverai/action
  - run: npx vitest run
    env:
      TD_OS: ${{ matrix.td-os }}
```

Linux is the default.

<EnterpriseCta feature="Windows sandboxes" plural />

An `os` option passed to `TestDriver()` takes priority over `TD_OS`. To branch on the platform inside a test, read `process.env.TD_OS`:

```javascript
const isWindows = process.env.TD_OS === 'windows';

await testdriver.exec({
  language: isWindows ? 'pwsh' : 'sh',
  code: isWindows ? 'Get-ChildItem $HOME' : 'ls ~',
});
```

## Concurrency limits

Your plan sets how many sandboxes can run at once. When a job asks for a sandbox at that limit, it waits for a free slot instead of failing.

- The SDK retries every 10 seconds.
- By default, it gives up after 60 seconds with a concurrency-limit error.
- Set `TD_CONCURRENCY_MAX_WAIT` (in seconds) to wait longer, or to `0` to fail on the first refusal.

```yaml
- run: npx vitest run
  env:
    TD_CONCURRENCY_MAX_WAIT: '300' # wait up to 5 minutes for a slot
```

Raise the wait when you run more parallel jobs than your plan has slots. If jobs regularly give up waiting, run fewer at once with `--maxWorkers` or add slots to your plan.

## View results

Each run is recorded in the [TestDriver console](https://console.testdriver.ai), with a video replay, logs, and pass or fail status. When a run finishes, the SDK prints a link to it:

```text
TESTDRIVER_RUN_URL=https://console.testdriver.ai/runs/abc123
```

## Next steps

<CardGroup cols={2}>
  <Card title="Run tests" icon="play" href="/copilot/running-tests">
    Run tests locally, in parallel, and watch them live.
  </Card>
  <Card title="Add TestDriver to GitHub" icon="github" href="/quickstart-github">
    Get an AI code review on every pull request.
  </Card>
  <Card title="Hosted plans" icon="cloud" href="/hosted">
    Compare plans, testing minutes, and concurrency.
  </Card>
  <Card title="Speed up reruns with caching" icon="brain" href="/caching">
    Reuse element locations from passing runs.
  </Card>
</CardGroup>
