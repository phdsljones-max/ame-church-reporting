---
name: testdriver:locating-elements
description: Find elements on screen by describing them in plain language, and make the match reliable.
---
<!-- Generated from locating-elements.mdx. DO NOT EDIT. -->

Describe an element the way a person would, and `find()` locates it on screen. No selectors, IDs, or DOM access.

```javascript
const signInButton = await testdriver.find('Sign in button below the password field');
await signInButton.click();
```

`find()` returns an element. You can act on it with methods like `click()` and `hover()`. See [Perform actions](/performing-actions).

## Describe the element

A good description has up to three parts:

1. **What it says.** The visible label or text, such as "Sign in" or "Add to cart".
2. **What it is.** A button, an input field, an icon, a link, a checkbox.
3. **Where it is,** when there's more than one match. A position, a color, or a nearby element.

```javascript
// Too vague: several things on the page could match
await testdriver.find('button');

// Specific: label, type, and position
await testdriver.find('Add to cart button under the TestDriver Hat');
```

A few more tips:

- **Lead with visible text.** Text on screen is the most reliable thing to match.
- **Describe icons by how they look.** "Shopping cart icon in the top right corner" works better than "cart link".
- **Keep changing values out.** A description with a changing name or ID never reuses the [cache](/caching). Describe the element itself instead.
- **Describe one element.** For a list of matches, use [`findAll()`](#find-every-match).

## Check whether it was found

`find()` keeps checking the screen every 5 seconds for up to 10 seconds. If nothing matches, it doesn't throw. It returns an element whose `found()` is `false`:

```javascript
const banner = await testdriver.find('cookie consent banner', { timeout: 0 });
if (banner.found()) {
  await testdriver.find('Accept all cookies button').click();
}
```

Acting on an element that wasn't found throws an `ElementNotFoundError`.

For something slow to appear, raise the `timeout`:

```javascript
const confirmation = await testdriver.find('Order confirmation message', { timeout: 30000 });
```

## Make the match stricter

When finding the wrong element is costly, `find()` has options to tighten the match:

| Option | What it does |
| --- | --- |
| `confidence` | Treat a match below this score (0 to 1) as not found |
| `verify` | Double-check the result with a second AI call, and retry once if it's wrong |
| `zoom` | Locate in two passes, for small targets or crowded screens |
| `type` | Hint that you mean `text`, an `image`, or a `ui` element |

```javascript
const deleteButton = await testdriver.find('Delete account button', {
  confidence: 0.9,
  verify: true,
});
```

Each option adds time or makes a miss more likely, so use them where accuracy matters most. See [find()](/find) for details.

## Find every match

`findAll()` returns an array with one element per match:

```javascript
const coffeeIcons = await testdriver.findAll('coffee cup icon');

for (const icon of coffeeIcons) {
  await icon.click();
}
```

See the [find all example](/examples/findall-coffee-icons) for a complete test.

## Inspect a result

An element tells you where it was found and how sure the AI was:

```javascript
const submitButton = await testdriver.find('Submit button');

console.log(submitButton.found());      // true
console.log(submitButton.x, submitButton.y); // the point TestDriver clicks
console.log(submitButton.confidence);   // the AI's confidence, from 0 to 1
```

For more detail, serialize the element. `toJSON()` adds the AI's reasoning and whether the result came from the cache:

```javascript
const { reasoning, cache } = submitButton.toJSON();
console.log(reasoning);   // why the AI picked this element
console.log(cache.hit);   // true when the position came from the cache
```

## Next steps

<CardGroup cols={2}>
  <Card title="find()" icon="magnifying-glass" href="/find">
    Every option, with examples.
  </Card>
  <Card title="Perform actions" icon="arrow-pointer" href="/performing-actions">
    Click, type, and scroll once you've found an element.
  </Card>
  <Card title="Caching" icon="brain" href="/caching">
    Reuse element positions from passing runs.
  </Card>
  <Card title="Debug a failing test" icon="bug" href="/debugging-with-screenshots">
    See what the screen showed when find() missed.
  </Card>
</CardGroup>
