---
name: testdriver:aws-setup
description: Run each test on a fresh Windows EC2 instance in your AWS account, set up with CloudFormation.
---
<!-- Generated from aws-setup.mdx. DO NOT EDIT. -->

import { EnterpriseBadge, EnterpriseCta } from '/snippets/enterprise.mdx';

Run your Windows tests on EC2 instances in your own AWS account. For each test, TestDriver:

1. Launches a fresh instance from the TestDriver AMI.
2. Installs and starts the runner on it over AWS Systems Manager (SSM).
3. Runs the test, then terminates the instance.

A CloudFormation stack creates the network, security group, IAM role, and launch template the instances need. You deploy it once.

<EnterpriseCta feature="Self-hosting on AWS" />

<Note>
  Self-hosting is part of the Enterprise plan. See [Self-hosted](/self-hosted).
</Note>

## Before you begin

- **Access to the TestDriver AMI.** TestDriver shares it with your AWS account. [Contact TestDriver](https://testdriver.ai/enterprise) with your account ID and region to get the AMI ID.
- **The AWS CLI**, [installed](https://aws.amazon.com/cli/) and signed in, on every machine that runs tests (your laptop and your CI runners).
- **`jq`**, which the instance launch script uses to read AWS responses.
- **A TestDriver project** with your API key in `TD_API_KEY`. See [Set up a project](/quickstart-manual).

## Step 1: Deploy the CloudFormation stack

The template creates:

- A VPC with a public subnet and internet gateway.
- A security group that allows RDP, VNC, and web traffic from the IP range you choose.
- An IAM role and instance profile with SSM access.
- An EC2 launch template, and optionally a key pair.

<Tabs>
  <Tab title="AWS console">

    <Card title="Launch the stack" icon="aws" href="https://console.aws.amazon.com/cloudformation/home#/stacks/create/review?templateURL=https://v7-cloudformation-template.s3.us-east-2.amazonaws.com/cloudformation.yaml" horizontal arrow>
      Open the template in the CloudFormation console.
    </Card>

    Switch the console to the region you'll run tests in, fill in the parameters below, and create the stack.

    When the stack finishes, open its **Outputs** tab and copy `LaunchTemplateId`.

  </Tab>
  <Tab title="AWS CLI">

    The template ships with the SDK. From your project, deploy it with:

    ```bash
    aws cloudformation deploy \
      --region us-east-2 \
      --template-file node_modules/testdriverai/setup/aws/cloudformation.yaml \
      --stack-name testdriver-infrastructure \
      --parameter-overrides \
        AllowedIngressCidr=203.0.113.0/24 \
        InstanceType=c5.xlarge \
        CreateKeyPair=yes \
      --capabilities CAPABILITY_IAM
    ```

    Then get the launch template ID:

    ```bash
    aws cloudformation describe-stacks \
      --region us-east-2 \
      --stack-name testdriver-infrastructure \
      --query 'Stacks[0].Outputs[?OutputKey==`LaunchTemplateId`].OutputValue' \
      --output text
    ```

  </Tab>
</Tabs>

### Stack parameters

| Parameter | Default | Description |
| --- | --- | --- |
| `AllowedIngressCidr` | `0.0.0.0/0` | The IP range allowed to reach the instances over RDP and VNC. Set it to your office or VPN range. |
| `InstanceType` | `c5.xlarge` | The EC2 instance type. Allowed: `c5.xlarge` to `c5.24xlarge`, `c5.metal`, or `i3.metal`. |
| `CreateKeyPair` | `yes` | `yes` creates a new key pair. `no` uses the key named in `ExistingKeyName`. |
| `ExistingKeyName` | | An existing EC2 key pair. Required when `CreateKeyPair` is `no`. |
| `ProjectTag` | `testdriver` | The `Project` tag added to every resource. |
| `NotificationEmail` | | An email address to notify when the stack finishes. Optional. |

<Warning>
  The default `AllowedIngressCidr` of `0.0.0.0/0` opens RDP and VNC to the whole internet. Set it to your own IP range.
</Warning>

## Step 2: Add the AWS setup file to Vitest

Add `testdriverai/vitest/setup-aws` to `setupFiles`. It launches an instance before each test that runs on Windows.

```javascript vitest.config.mjs
import { defineConfig } from 'vitest/config';
import TestDriver from 'testdriverai/vitest';

export default defineConfig({
  test: {
    testTimeout: 900000,
    hookTimeout: 900000,
    reporters: ['default', TestDriver()],
    setupFiles: ['testdriverai/vitest/setup', 'testdriverai/vitest/setup-aws'],
  },
});
```

The 15-minute `hookTimeout` gives a new instance time to boot, pass its status checks, and register with SSM.

## Step 3: Write your test

Your tests don't change. The setup file passes the instance's IP address and ID to `TestDriver()` for you:

```javascript tests/login.test.mjs
import { describe, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Login', () => {
  it('shows the login page', async (context) => {
    const testdriver = TestDriver(context);
    await testdriver.provision.chrome({ url: 'https://testdriver-sandbox.vercel.app/login' });

    await testdriver.assert('the login form is visible');
  });
});
```

## Step 4: Run the tests

Set `TD_OS=windows` to turn on the setup file, along with your launch template and AMI:

```bash
TD_OS=windows \
AWS_REGION=us-east-2 \
AWS_LAUNCH_TEMPLATE_ID=lt-0123456789abcdef0 \
AMI_ID=ami-0123456789abcdef0 \
npx vitest run
```

Each test gets its own instance. The instance is terminated after the test ends, once its recording has stopped. If the test process exits early, TestDriver terminates any instances still running.

When `TD_OS` isn't `windows`, the setup file does nothing and tests run on TestDriver's cloud.

### Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `TD_OS` | | Set to `windows` to launch instances. Required. |
| `AWS_LAUNCH_TEMPLATE_ID` | | `LaunchTemplateId` from the stack outputs. Required. |
| `AMI_ID` | | The TestDriver AMI, or your own AMI built from it. Required. |
| `AWS_REGION` | `us-east-2` | The region of your stack and AMI. |
| `AWS_LAUNCH_TEMPLATE_VERSION` | `$Latest` | The launch template version to use. |
| `RESOLUTION` | `1920x1080` | The instance's screen resolution. |
| `AWS_TAG_PREFIX` | `td` | Prefix for each instance's `Name` tag, followed by a timestamp. |

The AWS CLI reads your credentials from its usual sources, such as `aws configure`, `AWS_PROFILE`, or `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

### AWS permissions

The credentials that run your tests need these actions:

- `ec2:RunInstances`, `ec2:CreateTags`, `ec2:DescribeInstances`, `ec2:DescribeInstanceStatus`, and `ec2:TerminateInstances`
- `iam:PassRole` for the stack's instance role
- `ssm:DescribeInstanceInformation`, `ssm:SendCommand`, and `ssm:GetCommandInvocation`

## Run in GitHub Actions

This workflow authenticates to TestDriver with the [TestDriver action](/ci-cd#github-actions) and to AWS with stored access keys:

```yaml .github/workflows/testdriver-windows.yml
name: Windows tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - uses: testdriverai/action@stable

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-2

      - name: Run tests on Windows instances
        run: npx vitest run
        env:
          TD_OS: windows
          AWS_LAUNCH_TEMPLATE_ID: ${{ secrets.AWS_LAUNCH_TEMPLATE_ID }}
          AMI_ID: ${{ secrets.AMI_ID }}
```

GitHub's `ubuntu-latest` runners already include the AWS CLI and `jq`.

<Tip>
  To avoid storing AWS keys, give `configure-aws-credentials` a `role-to-assume` instead. The job's `id-token: write` permission covers both TestDriver and AWS. See [GitHub's OIDC guide](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect).
</Tip>

## Connect to an instance

To watch or debug a test, connect to its instance over RDP on port 3389 while it runs. The setup file prints the instance's IP address when it launches it.

The TestDriver AMI signs in as the user `testdriver`. Ask TestDriver for the default password, and change it before you build your own image.

## Create a custom AMI

Preinstall your apps and test data so tests don't spend time on setup.

<Steps>
  <Step title="Launch an instance and connect">

    Launch an instance from the TestDriver AMI with the stack's launch template:

    ```bash
    aws ec2 run-instances \
      --region us-east-2 \
      --image-id ami-0123456789abcdef0 \
      --launch-template 'LaunchTemplateId=lt-0123456789abcdef0,Version=$Latest'
    ```

    When it's running, connect to its public IP address over RDP.

  </Step>
  <Step title="Rotate the default password">

    Run the password rotation script and save the new password:

    ```powershell
    C:\testdriver\RotateLocalPasswords.ps1
    ```

  </Step>
  <Step title="Install your software">

    Install your apps, dependencies, certificates, and data.

  </Step>
  <Step title="Create the AMI">

    Create an image from the instance:

    ```bash
    aws ec2 create-image \
      --region us-east-2 \
      --instance-id i-0123456789abcdef0 \
      --name my-testdriver-image
    ```

    Set `AMI_ID` to the new image's ID when you run tests.

  </Step>
</Steps>

## Troubleshooting

<AccordionGroup>
  <Accordion title="TD_OS=windows requires AWS_LAUNCH_TEMPLATE_ID and AMI_ID">

    Set both variables in the environment that runs `npx vitest run`. In CI, check that the secrets are passed to the test step.

  </Accordion>
  <Accordion title="AWS CLI is not installed">

    Install the [AWS CLI](https://aws.amazon.com/cli/) on the machine that runs the tests, and check that `aws` is on the `PATH`.

  </Accordion>
  <Accordion title="SSM registration timeout">

    The instance didn't register with Systems Manager. Check that:

    - The launch template from the stack is used, so the instance gets the stack's IAM role.
    - The instance is in the stack's public subnet, so it can reach SSM.
    - The AMI is the TestDriver AMI, or an image built from it.

  </Accordion>
  <Accordion title="A test fails before it starts with a hook timeout">

    Launching and preparing an instance takes several minutes. Raise `hookTimeout` in `vitest.config.mjs`.

  </Accordion>
  <Accordion title="Instances are left running">

    TestDriver terminates instances after each test and when the process exits. A killed CI job can still leave one behind. Find instances by their `Name` tag, which starts with `td-`, and terminate them:

    ```bash
    aws ec2 terminate-instances --region us-east-2 --instance-ids i-0123456789abcdef0
    ```

  </Accordion>
</AccordionGroup>

## Next steps

<CardGroup cols={2}>
  <Card title="Run on your own machine" icon="display" href="/bring-your-own-machine">
    Run the runner on a laptop, lab machine, or on-prem VM.
  </Card>
  <Card title="Run tests in CI/CD" icon="code-branch" href="/ci-cd">
    Authenticate and run tests in any CI provider.
  </Card>
  <Card title="Self-hosted" icon="server" href="/self-hosted">
    What the Enterprise plan includes.
  </Card>
  <Card title="Launch apps" icon="rocket" href="/provision">
    Start Chrome, desktop apps, and installers in the sandbox.
  </Card>
</CardGroup>
