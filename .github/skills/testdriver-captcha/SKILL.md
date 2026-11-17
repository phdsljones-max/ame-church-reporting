---
name: testdriver:captcha
description: Solve a reCAPTCHA, hCaptcha, or Cloudflare Turnstile on the page with the 2captcha service.
---
<!-- Generated from captcha.mdx. DO NOT EDIT. -->

Solve a captcha on the current page so your test can get past it. TestDriver uses the [2captcha](https://2captcha.com) solving service, so you need a 2captcha account and API key.

```javascript
const result = await testdriver.captcha({ apiKey: process.env.TWOCAPTCHA_API_KEY });
```

With no other options, `captcha()`:

- Finds the captcha on the page and reads its sitekey.
- Sends it to 2captcha and waits for the solution.
- Puts the token into the page and calls the page's captcha callbacks.
- Clicks the form's submit button.

It works on Linux and Windows sandboxes, in Chrome opened with [`provision.chrome()`](/provision#chrome-options).

## Signature

```typescript
testdriver.captcha(options: CaptchaOptions): Promise<CaptchaResult>
```

## Parameters

<ParamField path="options" type="CaptchaOptions" required>
  <Expandable title="properties">
    <ParamField path="apiKey" type="string" required>
      Your 2captcha API key. `captcha()` throws if it's missing.
    </ParamField>
    <ParamField path="sitekey" type="string">
      The captcha's sitekey. When you leave it out, TestDriver finds the captcha and its type on the page. When you set it, also set `type`.
    </ParamField>
    <ParamField path="type" type="string" default="recaptcha_v3">
      `'recaptcha_v2'`, `'recaptcha_v3'`, `'hcaptcha'`, or `'turnstile'`. Only used when you set `sitekey`. Otherwise the detected type is used.
    </ParamField>
    <ParamField path="action" type="string" default="verify">
      The reCAPTCHA v3 action. Detected from the page when possible.
    </ParamField>
    <ParamField path="autoSubmit" type="boolean" default="true">
      Click the form's submit button after the captcha is solved.
    </ParamField>
    <ParamField path="timeout" type="number" default="120000">
      How long to wait for 2captcha's solution, in milliseconds.
    </ParamField>
    <ParamField path="pollInterval" type="number" default="5000">
      How often to check 2captcha for the solution, in milliseconds.
    </ParamField>
  </Expandable>
</ParamField>

### Captchas it detects

| Captcha | Detected from |
| --- | --- |
| reCAPTCHA v2, including invisible | The `g-recaptcha` element |
| reCAPTCHA v3 | `grecaptcha.execute()` or the `render=` script parameter, including the action |
| hCaptcha | The `h-captcha` element |
| Cloudflare Turnstile | The `cf-turnstile` element |

## Returns

<ResponseField name="CaptchaResult" type="object">
  <Expandable title="properties">
    <ResponseField name="success" type="boolean">
      Whether the captcha was solved.
    </ResponseField>
    <ResponseField name="token" type="string | null">
      The solved token.
    </ResponseField>
    <ResponseField name="message" type="string">
      `"Captcha solved successfully"` or `"Captcha solving failed"`.
    </ResponseField>
    <ResponseField name="output" type="string">
      The solver's full log, for debugging.
    </ResponseField>
  </Expandable>
</ResponseField>

## Errors

`captcha()` throws when:

- `apiKey` is missing.
- No captcha is found on the page and you didn't set `sitekey`. The message is `Could not auto-detect captcha. Please provide sitekey manually.`
- The solver reports an error, for example a 2captcha error or a timeout. The message starts with `[captcha]`.

## Examples

### Solve a captcha before submitting a form

```javascript tests/signup.test.mjs
import { describe, expect, it } from 'vitest';
import { TestDriver } from 'testdriverai/vitest/hooks';

describe('Signup', () => {
  it('gets past the captcha', async (context) => {
    const testdriver = TestDriver(context);
    await testdriver.provision.chrome({ url: 'https://example.com/signup' });

    await testdriver.find('Email input field').click();
    await testdriver.type('user@example.com');

    // Solves the captcha, then clicks the form's submit button
    const result = await testdriver.captcha({ apiKey: process.env.TWOCAPTCHA_API_KEY });
    expect(result.success).toBe(true);

    await testdriver.assert('a confirmation message is shown');
  });
});
```

### Submit the form yourself

```javascript
await testdriver.captcha({ apiKey: process.env.TWOCAPTCHA_API_KEY, autoSubmit: false });
await testdriver.find('Create account button').click();
```

### Set the sitekey and type

```javascript
await testdriver.captcha({
  apiKey: process.env.TWOCAPTCHA_API_KEY,
  sitekey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
  type: 'recaptcha_v2',
});
```

## Set up the API key

Sign up at [2captcha.com](https://2captcha.com), add funds, and copy your API key. Keep it out of your test code: put it in `.env` locally, and in a secret in CI.

```bash .env
TWOCAPTCHA_API_KEY=your_2captcha_key
```

```yaml .github/workflows/testdriver.yml
- name: Run TestDriver tests
  run: npx vitest run
  env:
    TWOCAPTCHA_API_KEY: ${{ secrets.TWOCAPTCHA_API_KEY }}
```

## Troubleshooting

<AccordionGroup>
  <Accordion title="Could not auto-detect captcha">

    The captcha wasn't on the page when `captcha()` ran. Wait for it to load first, for example with `find()` and a `timeout`. If it still isn't detected, pass `sitekey` and `type`.

  </Accordion>
  <Accordion title="The solve times out">

    2captcha's workers usually take 10 to 30 seconds. Raise `timeout`, and check that your 2captcha account has funds.

  </Accordion>
  <Accordion title="The site rejects the token">

    Check that `type` matches the captcha on the page. For reCAPTCHA v3, check that `action` matches the action the site uses.

  </Accordion>
</AccordionGroup>

## Related

- [Launch apps](/provision): open Chrome before solving
- [Secrets](/secrets): keep API keys out of your tests
- [type()](/type) and [find()](/find): fill in the rest of the form
