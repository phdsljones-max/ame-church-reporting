---
name: testdriver:wait
description: Pause the test for a fixed number of milliseconds.
---
<!-- Generated from wait.mdx. DO NOT EDIT. -->

Pause the test for a fixed time, for example while an animation finishes:

```javascript
await testdriver.find('Menu toggle').click();
await testdriver.wait(1000);
```

To wait for an element to appear, don't use `wait()`. Use [`find()`](/find) with a `timeout`, which continues as soon as the element shows up:

```javascript
await testdriver.find('Order confirmation message', { timeout: 30000 });
```

## Signature

```typescript
testdriver.wait(timeout?: number): Promise<void>
```

## Parameters

<ParamField path="timeout" type="number" default="3000">
  How long to pause, in milliseconds.
</ParamField>

## Examples

### Let a transition finish

```javascript
await testdriver.find('Settings tab').click();
await testdriver.wait(500);
await testdriver.assert('the Settings panel is fully open');
```

### Pause for the default time

```javascript
await testdriver.wait(); // 3 seconds
```

## Related

- [find()](/find): wait for an element with a `timeout`
- [Wait for a changing UI](/performing-actions#wait-for-a-changing-ui): choose the right way to wait
- [Redraw detection](/redraw): wait for the screen to settle after each action
