---
name: testdriver:cache
description: Every option that controls how find() and assert() reuse cached results.
---
<!-- Generated from cache.mdx. DO NOT EDIT. -->

This page lists every cache option, its default, and where you can set it. The cache is on by default, so you only need these to tune or turn it off.

For how caching works and when it helps, see [Speed up reruns with caching](/caching).

```javascript
const testdriver = TestDriver(context, {
  cache: {
    thresholds: {
      find: { screen: 0.05, element: 0.8 },
      assert: 0.05,
    },
  },
  cacheKey: 'checkout-flow',
});
```

## Client options

Pass these to `TestDriver(context, options)` or `new TestDriver(options)`. They apply to every call the client makes.

<ParamField path="cache" type="boolean | object" default="true">
  Pass `false` to turn the cache off. Pass an object to change the match thresholds.

  <Expandable title="properties">
    <ParamField path="thresholds" type="object">
      <Expandable title="properties">
        <ParamField path="find" type="object">
          Thresholds for `find()` and `findAll()`.

          <Expandable title="properties">
            <ParamField path="screen" type="number" default="0.05">
              The largest share of pixels that may differ between the current screen and the cached screen, from `0` to `1`. `0.05` allows a 5% difference. Lower values require a closer match.
            </ParamField>

            <ParamField path="element" type="number" default="0.8">
              How closely the cached image of the element must match what's on screen now, from `0` to `1`. Higher values require a closer match. Used by `find()` only, not `findAll()`.
            </ParamField>
          </Expandable>
        </ParamField>

        <ParamField path="assert" type="number" default="0.05">
          The largest share of pixels that may differ for `assert()` to reuse a cached result, from `0` to `1`.
        </ParamField>
      </Expandable>
    </ParamField>
  </Expandable>
</ParamField>

<ParamField path="cacheKey" type="string">
  The key cache entries are stored under. By default, TestDriver generates one from the test file. See [Cache keys](#cache-keys).
</ParamField>

<ParamField path="cacheThreshold" type="object">
  **Deprecated.** Use `cache.thresholds` instead.
</ParamField>

## Per-call options

Override the client settings for a single call.

### find()

```javascript
const priceLabel = await testdriver.find('Total price label', {
  cacheKey: 'checkout-flow',
  cache: { thresholds: { screen: 0.01, element: 0.95 } },
});
```

<ParamField path="cacheKey" type="string">
  Use this key for this call instead of the client's key.
</ParamField>

<ParamField path="cache.thresholds.screen" type="number">
  Overrides `cache.thresholds.find.screen` for this call.
</ParamField>

<ParamField path="cache.thresholds.element" type="number">
  Overrides `cache.thresholds.find.element` for this call.
</ParamField>

### findAll()

`findAll()` takes `cacheKey` and `cache.thresholds.screen`. It doesn't use the `element` threshold.

```javascript
const productCards = await testdriver.findAll('Product card in the results grid', {
  cache: { thresholds: { screen: 0.02 } },
});
```

### assert()

```javascript
await testdriver.assert('the order confirmation is visible', {
  cacheKey: 'checkout-flow',
  threshold: 0.01,
});
```

<ParamField path="cacheKey" type="string">
  Use this key for this call instead of the client's key.
</ParamField>

<ParamField path="threshold" type="number">
  Overrides `cache.thresholds.assert` for this call.
</ParamField>

## Threshold priority

When a threshold is set in more than one place, the most specific wins:

1. The per-call option, such as `find(description, { cache: { thresholds: { screen: 0.1 } } })`
2. A legacy number argument, such as `find(description, 0.1)`
3. The client option, `cache.thresholds`
4. The defaults: `screen` 0.05, `element` 0.8, `assert` 0.05

## Cache keys

Cache entries are stored under a key. By default, TestDriver generates the key from the test file:

- It hashes the contents of the file that creates the client (SHA-256, first 16 hex characters).
- Editing the file changes the hash, so the file starts with a fresh cache.
- Each test file gets its own cache.

Set `cacheKey` to keep a cache across edits, or to share one between files that use the same screens:

```javascript
const testdriver = TestDriver(context, { cacheKey: 'checkout-flow' });
```

If TestDriver can't read the test file, it can't generate a key. `find()` and `findAll()` then skip the cache unless you set `cacheKey`.

## What must match

A cached entry is reused only when all of these match the run that created it:

- The cache key.
- The exact description passed to `find()`, or the exact assertion text.
- The sandbox OS and screen resolution.

Entries become usable only after the test that created them passes.

## Turn the cache off

Turn the cache off for one client:

```javascript
const testdriver = TestDriver(context, { cache: false });
```

Or for a whole run:

```bash
TD_NO_CACHE=true npx vitest run
```

## Inspect a result

Read the cache details from the element that `find()` returns:

```javascript
const submitButton = await testdriver.find('Submit button');
const { cache } = submitButton.toJSON();
```

<ResponseField name="cache" type="object">
  <Expandable title="properties">
    <ResponseField name="hit" type="boolean">
      `true` when the location came from the cache.
    </ResponseField>
    <ResponseField name="strategy" type="string">
      How the cached entry was matched.
    </ResponseField>
    <ResponseField name="createdAt" type="string">
      When the cached entry was created.
    </ResponseField>
    <ResponseField name="diffPercent" type="number">
      The share of pixels that differed between the current screen and the cached screen, from `0` to `1`.
    </ResponseField>
    <ResponseField name="imageUrl" type="string">
      A link to the cached screenshot.
    </ResponseField>
  </Expandable>
</ResponseField>

To browse or clear your team's cached entries, open the [Cache page in the TestDriver console](https://console.testdriver.ai/cache).

## Related

<CardGroup cols={2}>
  <Card title="Caching" icon="brain" href="/caching">
    How the cache works and when it helps.
  </Card>
  <Card title="Options" icon="sliders" href="/options">
    Every client option, with its default.
  </Card>
  <Card title="find()" icon="magnifying-glass" href="/find">
    Locate an element by describing it.
  </Card>
  <Card title="assert()" icon="check" href="/assert">
    Check the screen with an AI assertion.
  </Card>
</CardGroup>
