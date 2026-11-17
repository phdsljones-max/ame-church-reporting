---
name: testdriver:self-hosted
description: Run TestDriver sandboxes on your own infrastructure for a flat license fee instead of testing minutes.
---
<!-- Generated from self-hosted.mdx. DO NOT EDIT. -->

import { EnterpriseBadge, EnterpriseCta } from '/snippets/enterprise.mdx';

On the Enterprise plan, your tests run on machines in your own infrastructure instead of TestDriver's cloud.

<EnterpriseCta feature="Self-hosting" />

- You pay a flat license fee per parallel test, with no testing minutes to meter.
- Your app and test data stay in your environment.
- You use your own AI provider key and your own VM images.

## What runs where

Self-hosting moves the machines that run your tests. TestDriver still hosts the rest.

| Component | Where it runs |
| --- | --- |
| Test sandboxes and runners | Your AWS account, or your own machines |
| AI calls | Your own Gemini API key |
| TestDriver API | TestDriver |
| Console, recordings, and reports | TestDriver, at [console.testdriver.ai](https://console.testdriver.ai) |

## Ways to run sandboxes

<CardGroup cols={2}>
  <Card title="AWS" icon="aws" href="/aws-setup">
    Start a fresh Windows EC2 instance for each test with CloudFormation.
  </Card>
  <Card title="Your own machine" icon="display" href="/bring-your-own-machine">
    Run the runner on a laptop, lab machine, or on-prem VM.
  </Card>
</CardGroup>

Self-hosted teams that use their own AI key can't use TestDriver's managed Windows sandboxes. Run Windows tests on your own instances instead.

## Use your own AI key

Self-hosted teams send AI requests through their own Google Gemini key. Add it on the [API keys page](https://console.testdriver.ai/team/api-keys) under **Business API Keys**.

<Note>
  The key must be a [Gemini Enterprise Agent Platform express mode API key](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/api-keys?usertype=expressmode). Google AI Studio keys aren't supported.
</Note>

The same page has optional fields for an OpenRouter key and an E2B key.

## Use custom VM images

Build a VM image with your apps, dependencies, and test data preinstalled, so tests skip setup steps.

1. Start from the TestDriver base image, which TestDriver shares with your AWS account.
2. Install your software with the TestDriver Packer scripts, or by hand over RDP.
3. Build your own AMI.
4. Set `AMI_ID` to your AMI when you run tests. See [AWS setup](/aws-setup#create-a-custom-ami).

You can customize, for example:

- Applications, browsers, and developer tools.
- User accounts, proxies, and certificates.
- Fonts, language packs, and locales.
- Seeded databases and test fixtures.

## Debug on the machine

Self-hosted sandboxes run in your account, so you can connect to a running instance over RDP while a test runs. See [Connect to an instance](/aws-setup#connect-to-an-instance).

## Air-gapped deployment

For regulated environments, TestDriver can also deploy the API and console inside your network, on AWS, Azure, GCP, or on-premises. [Contact TestDriver](https://testdriver.ai/enterprise) to discuss it.

## Pricing

- A flat monthly fee that includes 2 parallel tests and 5 seats.
- Unlimited testing, with no per-minute fees.
- Extra parallel licenses are $250 per month each. Extra seats are $100 per month each.
- Setup help and support from TestDriver engineers in a shared Slack or Teams channel.
- A 30-day pilot with a money-back guarantee.

See [testdriver.ai/enterprise](https://testdriver.ai/enterprise) for current pricing and terms.

## Hosted or self-hosted

| | Hosted | Self-hosted |
| --- | --- | --- |
| **Billing** | Testing minutes | Flat license fee |
| **Sandboxes** | TestDriver's cloud | Your AWS account or machines |
| **AI key** | TestDriver's | Your own Gemini key |
| **VM images** | Standard | Your own |
| **Video replays** | Yes | Yes |
| **RDP into the machine** | No | Yes, while tests run |
| **Mac desktop apps** | No | Yes |
| **Support** | Community or private | Dedicated engineers |

## Get started

<Card title="Talk to TestDriver" icon="calendar" href="https://testdriver.ai/enterprise">
  Plan a self-hosted deployment with the TestDriver team.
</Card>
