---
name: testdriver:errors
description: The errors TestDriver throws, what they contain, and how to catch them.
---
<!-- Generated from errors.mdx. DO NOT EDIT. -->

TestDriver exports two error classes you can check with `instanceof`:

```javascript
import { ElementNotFoundError, AIError } from 'testdriverai';
```

- [`ElementNotFoundError`](#elementnotfounderror): you acted on an element that `find()` didn't locate.
- [`AIError`](#aierror): an `ai()` task failed.

Other failures, such as a failed assertion, throw a plain `Error` with a recognizable message. See [Other errors](#other-errors).

## ElementNotFoundError

Thrown when you call an action on an element that [`find()`](/find) didn't locate:

- `click()`, `doubleClick()`, `rightClick()`
- `hover()`
- `mouseDown()`, `mouseUp()`

`find()` itself doesn't throw when nothing matches. It returns an element whose `found()` is `false`. Check `found()` when the element might not be there:

```javascript
const cookieBanner = await testdriver.find('Cookie consent banner', { timeout: 0 });
if (cookieBanner.found()) {
  await testdriver.find('Accept all cookies button').click();
}
```

### Properties

<ResponseField name="name" type="string">
  Always `"ElementNotFoundError"`.
</ResponseField>

<ResponseField name="description" type="string">
  The description you passed to `find()`.
</ResponseField>

<ResponseField name="message" type="string">
  Says which element wasn't found, followed by a debug block. See below.
</ResponseField>

<ResponseField name="aiResponse" type="object | null">
  The response from the `find()` call, with screenshots and other large images removed. Includes fields such as `cacheHit`, `similarity`, and `reasoning` when the API returned them.
</ResponseField>

<ResponseField name="timestamp" type="string">
  When the error was created, as an ISO 8601 string.
</ResponseField>

### Message

The message starts with the element's description, then adds what TestDriver knows about the failed `find()`:

```text
Element "Sign in button" not found.

=== Debug Information ===
Element searched for: "Sign in button"
Cache: MISS

AI Response:
The page shows a loading spinner. There is no sign in button yet.
```

Depending on the `find()` call, the debug block can also include:

- The cache threshold and the required similarity.
- When the cache was hit: the cache strategy, the entry's age, and the pixel difference.
- The similarity score, marked `(below threshold)` when it's too low.

The stack trace starts at your test code, not inside the SDK.

## AIError

Thrown when a task you give to `ai()` fails:

```javascript
import { AIError } from 'testdriverai';

try {
  await testdriver.ai('Add the blue T-shirt to the cart', { tries: 3 });
} catch (error) {
  if (error instanceof AIError) {
    console.log(`Stopped after ${error.tries} of ${error.maxTries} tries`);
    console.log(error.cause?.message); // the error that stopped the task
  }
  throw error;
}
```

`act()` is the same method under another name and throws the same error.

### Properties

<ResponseField name="name" type="string">
  Always `"AIError"`.
</ResponseField>

<ResponseField name="task" type="string">
  The task you passed to `ai()`.
</ResponseField>

<ResponseField name="tries" type="number">
  How many check attempts were made.
</ResponseField>

<ResponseField name="maxTries" type="number">
  The `tries` limit for the call. Defaults to `7`.
</ResponseField>

<ResponseField name="duration" type="number">
  How long the task ran, in milliseconds.
</ResponseField>

<ResponseField name="cause" type="Error">
  The error that stopped the task.
</ResponseField>

<ResponseField name="timestamp" type="string">
  When the error was created, as an ISO 8601 string.
</ResponseField>

### Message

```text
AI failed: <the cause's message>

=== AI Execution Details ===
Task: "Add the blue T-shirt to the cart"
Tries: 3/3
Duration: 41250ms
Timestamp: 2026-10-21T14:30:00.000Z
Underlying error: <the cause's message>
```

## Other errors

These failures throw an error whose class isn't exported. Check the message instead.

| What failed | Message starts with |
| --- | --- |
| [`assert()`](/assert) | `AI Assertion failed:` followed by the assertion and the AI's explanation |
| [`exec()`](/exec) with `sh` or `pwsh`, when the command exits non-zero | `Command failed with exit code <code>:` followed by stderr |

```javascript
try {
  await testdriver.assert('the cart shows 2 items');
} catch (error) {
  if (error.message.startsWith('AI Assertion failed:')) {
    // The assertion didn't hold
  }
  throw error;
}
```

<Note>
  Inside `ai()`, a failed `assert()` resolves to `false` instead of throwing, so the AI can see the result and try another approach.
</Note>

## Related

- [find()](/find): returns an element whose `found()` tells you whether it was located
- [assert()](/assert): check what's on screen
- [Debug a failing test](/debugging-with-screenshots): find out why a test failed
- [Events](/events): listen for errors as they happen
