---
name: testdriver:agent
description: How the TestDriver agent reviews pull requests, builds tests, and answers @mentions on GitHub.
---
<!-- Generated from agent.mdx. DO NOT EDIT. -->

The TestDriver agent is an AI teammate that lives in your GitHub repository.

- It reviews every pull request's code for bugs.
- For user-visible changes, it drives your app in a real sandbox and reports what happened.
- It writes, runs, and maintains your end-to-end tests.

To install it, see [Add TestDriver to GitHub](/quickstart-github).

## What the agent does

The agent does two jobs:

- **Code review.** It reviews pull requests like a senior engineer. It reads the diff for logic errors, security problems, and regressions. When it can, it runs the change in a sandbox to prove what it finds.
- **Test building.** It writes new TestDriver tests, debugs and fixes failing ones, and keeps them up to date.

It declines work outside that scope:

- It doesn't edit your application code.
- It doesn't fix product bugs.
- It doesn't act as a general coding assistant.

When it finds a bug in a pull request, it reports the bug instead of pushing a fix.

## How it responds on each surface

The agent behaves differently depending on what woke it up:

| Event | Trigger | What the agent does |
| --- | --- | --- |
| Pull request opened, or new commits pushed | Automatic | Reviews the change and posts one review comment |
| Issue opened | Automatic | Acts on the request in the issue, or onboards a new user |
| @mention on an issue or pull request | You mention the agent | Works with you interactively in the thread |

Automatic turns are unsolicited, so the agent posts only when it has something useful to say.

When you @mention it, someone is waiting. It always replies and narrates its progress.

## Pull request reviews

The agent reviews a pull request without being asked when it's opened or gets new commits.

<Steps>
  <Step title="Triage the change">

    The agent reads the changed files and decides whether there's anything to review or run.

    A pull request that only touches lockfiles, generated output, or formatting gets an 👀 reaction and no comment.

  </Step>
  <Step title="Read the code">

    It reviews the diff like a senior engineer. It opens surrounding files only when the diff isn't enough on its own.

    It looks for:

    - Logic errors
    - Unhandled error paths
    - Security problems
    - Race conditions
    - Broken contracts for callers
    - Risky logic with no tests

    It skips style issues that a linter would catch.

  </Step>
  <Step title="Run the change">

    This step runs if the change has a user-visible surface and your installation is signed in to TestDriver. The agent:

    - Starts a sandbox.
    - Drives the exact flow the diff touches.
    - Runs any existing tests that cover it.
    - Writes and runs a new test for the change.

    While it works, a single comment on the pull request shows the latest screenshot. The comment finishes with the run recording.

  </Step>
  <Step title="Post the review">

    It posts one review comment with:

    - A summary and verdict
    - A short walkthrough of each meaningful file
    - Its findings

    On a re-review after a push, it reassesses its earlier findings against the new code. It drops the fixed ones and checks the new commits for regressions.

  </Step>
</Steps>

### What's in a finding

Each finding has:

- A file and line
- A severity: `critical`, `major`, `minor`, or `nit`
- A category
- A suggested replacement, when the fix is small and certain

Findings are also labelled by how the agent found them:

- **`observed`**: the agent saw the bug happen during a run in the sandbox.
- **`suspected`**: the agent inferred the bug from reading the code.

If a run confirms a suspected finding, the agent upgrades it to `observed` instead of listing it twice.

If the change looks correct, the review says so in a sentence and has no findings.

### The review never blocks a merge

Reviews are posted as GitHub `COMMENT` reviews. The agent never approves a pull request or requests changes, so it can't gate a merge.

### Tests from a review

During a review, the agent may write a test worth keeping: one that passes, or one that cleanly reproduces a bug.

It opens a separate pull request for that test and links it from the review. The pull request uses a `testdriver/session/…` branch and targets your default branch.

It never pushes to the branch it's reviewing.

### Pull requests the agent skips

- **Draft pull requests** get no review until they're marked ready for review.
- **Pull requests opened by bots** are never reviewed. This includes the agent's own test pull requests, so it doesn't review its own work.
- **Teams without a subscription** don't get automatic reviews, because automatic review is a paid feature. If your team has used its allowance, the pull request gets one short notice explaining why there's no review.

## Issues

When an issue is opened, the agent reads its title and description:

- **If the issue describes a test task**, the agent does it. It asks you to sign in only if a step needs it.
- **If the issue is empty** and you look like a new user, the agent introduces itself. It walks you through signing in to TestDriver and creating your first test.
- **If the agent can't help with the issue**, such as a product bug report or a feature request, it stays silent instead of posting an off-topic reply.

Whenever the agent creates or changes a test file, it finishes by opening a pull request with the test.

## @mentions

Mention the agent on an issue or pull request to start an interactive conversation. Because you asked directly, the agent:

- Posts progress updates and sandbox screenshots as it works.
- Answers follow-up questions in the thread.
- Opens a pull request with any test it writes.

On a pull request, an @mention gets you this play-by-play instead of the quiet automatic review.

### Sign out

To revoke your installation's TestDriver sign-in, mention the agent with `logout`:

```text
@testdriverai logout
```

`sign out` and `disconnect` work too.

The agent revokes the installation's shared sign-in and shuts down its live sandbox. The next person to mention it is asked to sign in again.

## Signing in

Reading a diff doesn't need a TestDriver account, but running your app does.

When your installation isn't signed in, the agent still reviews pull requests by reading the code. It marks every finding `suspected`.

Signing in lets it run each change, so findings it proves become `observed`.

## Related

<CardGroup cols={2}>
  <Card title="Add TestDriver to GitHub" icon="github" href="/quickstart-github">
    Install the GitHub app and get your first review.
  </Card>
  <Card title="Run tests in CI/CD" icon="code-branch" href="/ci-cd">
    Run your TestDriver suite in GitHub Actions and other CI systems.
  </Card>
</CardGroup>
