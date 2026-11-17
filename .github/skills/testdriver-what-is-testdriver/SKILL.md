---
name: testdriver:what-is-testdriver
description: TestDriver tests apps by seeing the screen and controlling a real machine, without selectors.
---
<!-- Generated from what-is-testdriver.mdx. DO NOT EDIT. -->

TestDriver is an end-to-end testing platform that tests your app the way a person uses it.

- It looks at the screen.
- It finds elements from plain-language descriptions.
- It controls a real machine with the mouse and keyboard.

It doesn't rely on CSS or XPath selectors. So it can test flows that selector-based tools can't reach, such as desktop apps, browser extensions, and content that changes every time it renders.

## Where selector-based tests fall short

Tools such as Playwright and Cypress drive a single web page through its DOM. They locate elements with selectors.

That works until a test needs something the DOM can't describe reliably:

| Situation | Why selectors break down | Examples |
| --- | --- | --- |
| **A fast-changing UI** | Each redesign changes the markup and breaks CSS and XPath selectors. | Startups, teams shipping AI-generated code |
| **Dynamic content** | Generated content has no stable structure to select. | AI chat responses, PDFs, images, video |
| **Software you don't own** | Third-party markup often lacks stable IDs or accessibility attributes. | Other websites, embedded widgets, third-party apps |
| **More than one application** | Web-only tools can't leave the browser tab. | Desktop apps, browser extensions, IDEs, installers |
| **Visual state** | Whether something *looks* right isn't in the DOM. | Charts, layout, spelling, rendered media |

## How TestDriver works

A TestDriver test is a [Vitest](https://vitest.dev) test. It runs against a cloud sandbox, a fresh Linux machine, or Windows on [Enterprise](https://testdriver.ai/enterprise/) plans.

Each step describes what a user would see or do:

1. **[Provision](/provision)** launches the app under test in the sandbox, such as Chrome at a URL, a Chrome extension, VS Code, an Electron app, or a downloaded installer.
2. **[Find](/locating-elements)** takes a description like `'Sign in button'` and uses AI vision to locate the matching element on screen.
3. **[Act](/performing-actions)** clicks, types, scrolls, and presses keys on the real machine. The app receives the same input a person would produce.
4. **[Assert](/making-assertions)** checks a plain-language statement about the screen, such as `'the cart shows one item'`.

This test installs the Loom extension from the Chrome Web Store. It checks that Loom appears in Chrome's extensions menu, a flow that a DOM-only tool can't drive:

```javascript tests/loom-extension.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Loom extension', () => {
  it('appears in the Chrome extensions menu', async (context) => {
    const testdriver = TestDriver(context);

    // Launch Chrome with Loom installed by its Chrome Web Store ID
    await testdriver.provision.chromeExtension({
      extensionId: 'liecbddmkiiihnedobmlmillhodjkdmb',
    });

    const extensionsButton = await testdriver.find('puzzle-piece extensions icon in the Chrome toolbar');
    await extensionsButton.click();

    const loomExtension = await testdriver.find('Loom in the extensions dropdown');
    expect(loomExtension.found()).toBe(true);
  });
});
```

To run this yourself, follow the [Quickstart](/quickstart).

## What's included

- **The SDK**, the `testdriverai` npm package. Use it in Vitest tests to provision apps, find elements, act, and assert.
- **Cloud sandboxes** that run your tests on fresh Linux machines, or Windows on Enterprise plans. Enterprise customers can also [self-host](/self-hosted) them.
- **Debugging tools**: screen recordings of every run, [screenshots](/debugging-with-screenshots), and [element caching](/caching) for faster, more stable repeat runs.
- **[The TestDriver agent](/agent)**, which reviews your pull requests and writes and maintains tests from GitHub.

## When to use TestDriver

TestDriver is built for flows that are hard to cover any other way:

- Multi-application workflows
- Desktop software
- Browser extensions
- Third-party UIs
- Visual checks

Each step runs on a real machine and uses AI vision. So a TestDriver test takes longer per step than a test that talks to the DOM directly.

If stable, selector-based tests already cover a flow, keep them. Use TestDriver for the parts they can't reach.

## Related

<CardGroup cols={2}>
  <Card title="Quickstart" icon="rocket" href="/quickstart">
    Install TestDriver and run your first test.
  </Card>
  <Card title="Locate elements" icon="crosshairs" href="/locating-elements">
    Write descriptions that find the right element reliably.
  </Card>
  <Card title="The TestDriver agent" icon="hand-horns" href="/agent">
    Let the agent review pull requests and build tests from GitHub.
  </Card>
  <Card title="Hosted sandboxes" icon="cloud" href="/hosted">
    Run tests on TestDriver's cloud infrastructure.
  </Card>
</CardGroup>
