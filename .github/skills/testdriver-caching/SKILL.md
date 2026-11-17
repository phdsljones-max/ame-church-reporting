---
name: testdriver:caching
description: Reuse element locations from passing runs to skip the AI when the screen is unchanged.
---
<!-- Generated from caching.mdx. DO NOT EDIT. -->

After a test passes, TestDriver remembers where it found each element.

- When the screen looks the same on a later run, `find()` reuses that location instead of asking the AI.
- The step is faster, cheaper, and gives the same result every time.
- When the screen changes, TestDriver falls back to the AI and learns the new location.

Caching is on by default. You don't need to configure anything.

## How caching works

1. **The first run learns.** Each `find()` asks the AI to locate the element. TestDriver saves the result with an image of the screen and of the element.
2. **A passing run confirms.** Saved entries become usable only once the test passes. A failing run never teaches TestDriver a wrong location.
3. **Later runs reuse.** On the next run, `find()` compares the current screen with the saved one. TestDriver returns the saved location without calling the AI when both are true:
    - The screen differs by no more than 5% of its pixels.
    - The saved image of the element still matches what's at that spot.

    Otherwise, it asks the AI and saves a new entry.

`assert()` is cached the same way. When the screen matches a confirmed earlier run, the saved result is reused.

## What has to match

A saved entry is reused only when all of these match the run that created it:

- **The test file.** The cache is keyed on a hash of the test file's contents, so editing the file starts a fresh cache. A changed test can't reuse results that no longer apply.
- **The description.** The text you pass to `find()` must match exactly.
- **The OS and screen resolution** of the sandbox.

## Keep changing values out of descriptions

The description must match exactly. A description with a value that changes between runs misses the cache every time:

```javascript
// Misses the cache whenever the email changes
const emailField = await testdriver.find(`input next to ${email}`);
```

Describe the element itself, and pass the changing value to the action instead:

```javascript
// Same description every run, so it can be cached
const emailField = await testdriver.find('Email input field');
await emailField.click();
await testdriver.type(email);
```

## Choose your own cache key

By default, each test file has its own cache, which resets when you edit the file.

Set a `cacheKey` when you create the client to keep the cache across edits, or to share it between files that use the same screens:

```javascript
const testdriver = TestDriver(context, { cacheKey: 'checkout-flow' });
```

You can also pass `cacheKey` to a single `find()` call.

A stable key doesn't make TestDriver reuse a location for a changed page. Entries are still reused only when the description, OS, and resolution match and the screen looks the same.

## Adjust how closely the screen must match

Two thresholds control when a saved location is reused:

| Threshold | Default | Meaning |
| --- | --- | --- |
| `screen` | `0.05` | The largest share of pixels that may differ from the saved screen (5%) |
| `element` | `0.8` | How closely the saved element image must match what's on screen now (0 to 1) |

Set them for every call when you create the client:

```javascript
const testdriver = TestDriver(context, {
  cache: {
    thresholds: {
      find: { screen: 0.02, element: 0.9 },
      assert: 0.02,
    },
  },
});
```

Or override them for one call:

```javascript
const priceLabel = await testdriver.find('Total price label', {
  cache: { thresholds: { screen: 0.01 } },
});
```

Lower `screen` and higher `element` values make reuse stricter. That helps on screens where small details matter, but costs more AI calls.

For every cache option, see [Configure the cache](/cache).

## Turn caching off

Disable caching for a client with `cache: false`, or for a whole run with `TD_NO_CACHE`:

```javascript
const testdriver = TestDriver(context, { cache: false });
```

```bash
TD_NO_CACHE=true npx vitest run
```

## See what's cached

The [Cache page in the TestDriver console](https://console.testdriver.ai/cache) lists your team's cached elements and assertions. It shows a preview and the description for each, and lets you clear entries.

To check a single `find()` in your test, read the cache details from the element:

```javascript
const submitButton = await testdriver.find('Submit button');
const { cache } = submitButton.toJSON();

console.log(cache.hit);      // true when the location came from the cache
console.log(cache.strategy); // how the cached entry was matched
```

## Next steps

<CardGroup cols={2}>
  <Card title="Configure the cache" icon="sliders" href="/cache">
    Every cache option, threshold, and override.
  </Card>
  <Card title="Locate elements" icon="crosshairs" href="/locating-elements">
    Write descriptions that find the right element and cache well.
  </Card>
  <Card title="Run tests" icon="play" href="/copilot/running-tests">
    Run your tests locally and in parallel.
  </Card>
  <Card title="Run in CI/CD" icon="code-branch" href="/ci-cd">
    Run cached tests on every pull request.
  </Card>
</CardGroup>
