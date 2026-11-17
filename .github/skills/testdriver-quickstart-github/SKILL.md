---
name: testdriver:quickstart-github
description: Get an AI code review on every pull request, backed by a real run of your app.
---
<!-- Generated from quickstart-github.mdx. DO NOT EDIT. -->

Install the TestDriver GitHub app, and the TestDriver agent reviews every pull request in your repository.

- It reads the diff for bugs.
- When a user would see the change, it runs your app in a real sandbox to prove what it finds.
- It writes and maintains end-to-end tests whenever you ask.

There's nothing to install locally.

## Before you begin

- **A GitHub repository** where you can install apps (you own it, or you're an admin of its organization).
- **A TestDriver account.** You create one or sign in during installation.
- **A paid plan or trial for automatic reviews.** On the free plan, the agent still reviews a pull request when you @mention it. See [pricing](https://testdriver.ai/pricing).

<Steps>
  <Step title="Install the GitHub app">

    Open [TestDriver on GitHub](https://go.testdriver.ai/github). Install the app on the repositories you want reviewed, and sign in to TestDriver when prompted.

    You can add more repositories later from your GitHub settings.

  </Step>
  <Step title="Get your first tests">

    Choose a repository to set up. TestDriver opens a **Set up TestDriver** issue in it.

    The agent picks up the issue, writes a few sample tests for your app, and runs them. It opens a pull request with the tests and their recordings. Review it and merge it like any other pull request.

  </Step>
  <Step title="Open a pull request">

    From now on, every pull request you open gets a review without anyone asking. The agent reads the change and runs it when there's something to drive.

    It posts a single review comment with:

    - A summary
    - A walkthrough of the changed files
    - Any bugs it found, each labelled `observed` (seen during a run) or `suspected` (inferred from the code)

    Pushing new commits triggers a fresh review.

    The review is a comment, so it never approves or blocks a merge. To fail a pull request when a test breaks, [run your tests in CI](/ci-cd).

  </Step>
  <Step title="Ask for more with @testdriverai">

    Mention the agent on any issue or pull request to ask a follow-up question or request a new test:

    ```text
    @testdriverai Write a test that logs in, adds the first product to the cart, and confirms the cart badge shows 1.
    ```

    The agent replies in the thread and posts screenshots as it works. When it's done, it opens a pull request with the test.

    <Tip>
      Describe what a user does and what they should see, not how the page is built. "Confirm the cart badge shows 1" works better than "check `#cart-count`".
    </Tip>

  </Step>
</Steps>

## Next steps

<CardGroup cols={2}>
  <Card title="How the agent works" icon="hand-horns" href="/agent">
    What the agent does on pull requests, issues, and mentions.
  </Card>
  <Card title="Prevent regressions" icon="shield-check" href="/copilot/auto-healing">
    Run tests in CI and have the agent fix them when your app changes.
  </Card>
  <Card title="Run tests in CI/CD" icon="code-branch" href="/ci-cd">
    Run your TestDriver tests in GitHub Actions.
  </Card>
  <Card title="Set up a project" icon="wrench" href="/quickstart-manual">
    Write and run tests yourself in your own repository.
  </Card>
</CardGroup>
