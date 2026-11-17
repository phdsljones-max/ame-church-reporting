---
name: testdriver:hosted
description: Run tests on TestDriver's cloud sandboxes, billed by testing minutes, with no infrastructure to manage.
---
<!-- Generated from hosted.mdx. DO NOT EDIT. -->

import { EnterpriseBadge, EnterpriseCta } from '/snippets/enterprise.mdx';

By default, your tests run on TestDriver's cloud. Each test gets a fresh sandbox, and you don't manage any machines.

- Hosted is the default. When you follow the [Quickstart](/quickstart), you're using it.
- You're billed in **testing minutes**: the time a sandbox is running.
- Your plan sets how many sandboxes can run at the same time.

## Plans

| | Free | Pro | Team |
| --- | --- | --- | --- |
| **Price** | $0 | $24 per seat per month | $600 per month |
| **Testing minutes included** | 30 | 360 | 10,000 |
| **Extra minutes** | Not available | $0.08 per minute | $0.08 per minute |
| **Sandboxes at once** | 2 | 4 | 8 |
| **Users** | Unlimited | One per seat | 5 |
| **Test analytics** | No | Yes | Yes |
| **CPU, RAM, and network profiles** | No | Yes | Yes |
| **Support** | Community | Community | Private |

<EnterpriseCta feature="Windows sandboxes, custom screen resolutions, and self-hosting" plural />

Pro starts with a 14-day free trial. Start a plan from the [TestDriver console](https://console.testdriver.ai/checkout/pro).

On the Free plan, new sandboxes are refused once you've used your 30 minutes. Upgrade to keep testing.

<Note>
  If you install TestDriver from GitHub Marketplace, GitHub bills you instead. The **Open Source** plan is free with 300 testing minutes per month. The **Team** plan is $20 per seat per month with 120 testing minutes per seat.
</Note>

## How testing minutes are counted

Testing minutes run while a sandbox is running. That includes sandboxes started by:

- Your test runs, locally and in CI.
- The TestDriver agent, when it reviews a pull request or writes a test.

A sandbox kept running with [`keepAlive`](/customizing-devices#keep-a-sandbox-alive) uses minutes until it shuts down. Keep `keepAlive` as short as you need.

## Concurrency

Each running sandbox uses one of your plan's slots. A slot frees up when its sandbox shuts down.

When every slot is busy, a new test waits for a free slot instead of failing. The SDK retries every 10 seconds, for up to 60 seconds by default. Set `TD_CONCURRENCY_MAX_WAIT` to change the wait. See [Concurrency limits](/ci-cd#concurrency-limits).

To stay within your slots, limit how many test files Vitest runs at once:

```bash
npx vitest run --maxWorkers=4
```

In GitHub Actions, a `concurrency` group stops two runs on the same branch from competing for slots. A new push cancels the older run:

```yaml .github/workflows/testdriver.yml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## When to self-host

Consider [self-hosting](/self-hosted) when you need to:

- Run tests on your own infrastructure, without per-minute billing.
- Use your own AI provider keys.
- Run custom VM images with your software preinstalled.
- Run more tests in parallel than the hosted plans allow.

## Next steps

<CardGroup cols={2}>
  <Card title="Quickstart" icon="play" href="/quickstart">
    Run your first test on a hosted sandbox.
  </Card>
  <Card title="Run tests in CI/CD" icon="code-branch" href="/ci-cd">
    Run your tests on every push and pull request.
  </Card>
  <Card title="Self-hosted" icon="server" href="/self-hosted">
    Run sandboxes on your own infrastructure.
  </Card>
  <Card title="Run tests" icon="play" href="/copilot/running-tests">
    Run tests locally and in parallel.
  </Card>
</CardGroup>
