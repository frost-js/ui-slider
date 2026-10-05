# Frost UI Slider

[![CI](https://github.com/elusivecodes/FrostUI-Slider/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/elusivecodes/FrostUI-Slider/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/elusivecodes/FrostUI-Slider/branch/main/graph/badge.svg)](https://codecov.io/gh/elusivecodes/FrostUI-Slider)
[![npm version](https://img.shields.io/npm/v/%40fr0st%2Fui-slider?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-slider)
[![npm downloads](https://img.shields.io/npm/dm/%40fr0st%2Fui-slider?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-slider)
[![JS gzip size](https://img.badgesize.io/elusivecodes/FrostUI-Slider/main/dist/frost-ui-slider.min.js?compression=gzip&label=JS%20gzip%20size&style=flat-square)](https://github.com/elusivecodes/FrostUI-Slider/blob/main/dist/frost-ui-slider.min.js)
[![license](https://img.shields.io/github/license/elusivecodes/FrostUI-Slider?style=flat-square)](./LICENSE)

Single and range sliders for Frost UI with ticks, tooltips, logarithmic scales, keyboard controls, and native form values.

## Highlights

- Single values and ordered two-handle ranges
- Horizontal, vertical, reversed, and RTL layouts
- Fractional steps, non-zero bounds, and shifted logarithmic scales
- Tick labels, pointer snapping, and locking to ticks
- Colored selection intervals and range highlights
- Formatted tooltips and accessible value text
- Mouse, touch, pen, and keyboard interaction
- Native form submission, reset synchronization, and disabled fieldsets
- Native `Slider` class and `slider` fQuery plugin
- Existing-instance reuse with frozen resolved options
- Prebuilt ESM and UMD bundles with source maps
- No component-specific CSS or Sass
- JSDoc-powered IntelliSense

Explore [the demo](./demo/index.html) for interactive examples.

## Installation

### Browser projects / bundlers

```bash
npm i @fr0st/ui-slider
```

Frost UI Slider's package entry point is ESM-only and requires a browser DOM. Import the default `Slider` export and the stylesheets in browser projects and bundlers.

```js
import '@fr0st/ui/dist/frost-ui.min.css';
import Slider from '@fr0st/ui-slider';
```

`@fr0st/ui` and `@fr0st/query` are peer dependencies so the component shares the application's instances.

### Browser (ESM)

The ESM bundle imports `@fr0st/ui` and `@fr0st/query`. fQuery also imports `@fr0st/core`, so map all three dependencies when loading the bundle directly in a browser:

```html
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.min.css">
<script type="importmap">
{
    "imports": {
        "@fr0st/core": "https://cdn.jsdelivr.net/npm/@fr0st/core@latest/dist/frost-core.esm.min.js",
        "@fr0st/query": "https://cdn.jsdelivr.net/npm/@fr0st/query@latest/dist/fquery.esm.min.js",
        "@fr0st/ui": "https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.esm.min.js"
    }
}
</script>
<script type="module">
    import Slider from 'https://cdn.jsdelivr.net/npm/@fr0st/ui-slider@latest/dist/frost-ui-slider.esm.min.js';
</script>
```

### Browser (UMD)

Load the bundles from your own copy or a CDN:

```html
<link
    rel="stylesheet"
    href="/path/to/dist/frost-ui.min.css">
<script src="/path/to/dist/frost-ui-bundle.min.js"></script>
<script src="/path/to/dist/frost-ui-slider.min.js"></script>
<!-- or -->
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.min.css">
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui-bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui-slider@latest/dist/frost-ui-slider.min.js"></script>
<script>
    const { Slider } = globalThis.UI;
</script>
```

The UMD bundle adds `Slider` to the existing `globalThis.UI` object. Load Frost UI's all-in-one bundle first; it supplies the `UI` and `fQuery` globals.

The package root resolves to the prebuilt ESM bundle. Published files under `dist/` and `src/` are also available through matching package subpaths.

## Usage

Start with a labeled text input. Slider inserts its track and handles before the input, then visually hides the input while keeping it available for form submission:

```html
<label for="price">Price range</label>
<input id="price" name="price" value="20,80">
```

```js
import Slider from '@fr0st/ui-slider';

const price = Slider.init(document.querySelector('#price'), {
    range: true,
    min: 0,
    max: 100,
    step: 5,
});

price.setValue(25, 75);
console.log(price.getValue()); // [25, 75]
```

Use a text input for ranges so the browser preserves both endpoints and their separator.

## Options

Options are resolved in this order:

1. Component defaults
2. The element's `data-ui-*` attributes
3. Options passed to `Slider.init()`

Resolved `instance.options` are shallow-frozen.

`Slider.defaults` and `Slider.classes` may be customized before creating instances.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `defaultValue` | `number` | `0` | Fallback for missing or invalid values, including missing range endpoints. |
| `disabledOpacity` | `number` | `0.5` | Disabled container opacity between 0 and 1. |
| `handleSize` | `number` | `20` | Handle size across the track, in pixels. |
| `handleSizeRatio` | `number` | `0.75` | Handle length along the track relative to `handleSize`. |
| `high` | `string \| null` | `null` | Background class above the selected range. |
| `lockToTicks` | `boolean` | `false` | Snap all value updates to usable ticks. |
| `low` | `string \| null` | `null` | Background class below the selected range. |
| `max` | `number` | `10` | Inclusive maximum. Equal bounds produce a fixed-value slider. |
| `min` | `number` | `0` | Inclusive minimum. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Track orientation. |
| `range` | `boolean` | `false` | Render two independently focusable handles. |
| `rangeHighlights` | `object[]` | `[]` | Intervals with `start`, `end`, and an optional background `style` class. |
| `rangeSeparator` | `string` | `','` | Nonempty separator used in the original input's value. |
| `rangeText` | `(start: number, end: number) => string \| number` | ``(start, end) => `${start} - ${end}` `` | Range tooltip content. |
| `reversed` | `boolean` | `false` | Reverse the physical value axis. |
| `scale` | `'linear' \| 'logarithmic'` | `'linear'` | Value-to-position scale. |
| `selection` | `string` | `'bg-primary'` | Selected interval background class. |
| `sliderSize` | `number` | `10` | Track thickness in pixels. |
| `step` | `number` | `1` | Positive step, measured from `min`. |
| `tickLabels` | `(string \| number)[]` | `[]` | Labels associated with the original tick array order. |
| `ticks` | `number[]` | `[]` | Tick values; finite in-bounds values are sorted and deduplicated. |
| `tickSize` | `number` | `30` | Tick diameter in pixels. |
| `tickSnapBounds` | `number` | `0` | Inclusive pointer snapping distance in value units. |
| `tooltip` | `false \| 'show' \| 'always'` | `'show'` | Hide, show on hover/focus/drag, or keep visible while enabled. |
| `tooltipPlacement` | `string \| null` | `null` | UI Tooltip placement; defaults to top horizontally and right vertically. |
| `valueText` | `(value: number) => string \| number` | `(value) => value` | Accessible handle text and single-value tooltip content. |
| `verticalHeight` | `number` | `200` | Vertical track height in pixels. |

Values accept finite numbers and numeric strings. Missing, empty, or invalid values use `defaultValue`; an invalid default falls back to `min`. Values are rounded relative to `min` and clamped after rounding, keeping both endpoints reachable even when the step does not divide the interval. Programmatic range endpoints are sorted. During interaction, crossing hands control and focus to the other handle.

Bounds must form a finite ascending interval. Steps and dimensions must be positive; snapping distance must be nonnegative. Invalid numeric options or modes throw `RangeError` before registration; non-function formatters throw `TypeError`.

Logarithmic positioning uses `log1p(value - min) / log1p(max - min)`. This shifted scale supports zero and negative minima. It changes positions, while `step` remains in value units.

Locked ticks take precedence over step rounding. Clicking a tick or snapping near it can also select an off-step value. Empty usable tick lists fall back to ordinary step behavior for locking. Tick normalization preserves the caller's arrays and label associations; null, undefined, and empty labels are omitted.

Highlights are ordered within each interval and clipped to the bounds; malformed intervals are ignored. Highlight classes take precedence over low/selection/high classes on ticks:

```js
Slider.init(document.querySelector('#temperature'), {
    min: -10,
    max: 40,
    ticks: [-10, 0, 20, 40],
    tickLabels: ['Cold', 'Freezing', 'Comfortable', 'Hot'],
    tickSnapBounds: 2,
    rangeHighlights: [{ start: 18, end: 24, style: 'bg-success' }],
    valueText: (value) => `${value} °C`,
});
```

Formatter callbacks run with the Slider instance as `this` when declared as ordinary functions. `valueText` runs for each handle; `rangeText` runs when a range tooltip is enabled. They affect presentation, not submitted values.

## Data attributes

Use kebab-case `data-ui-*` attributes for serializable options. Arrays and objects use JSON. Supply callbacks and DOM nodes through JavaScript.

```html
<input
    id="budget"
    name="budget"
    value="20,80"
    data-ui-toggle="slider"
    data-ui-range="true"
    data-ui-min="0"
    data-ui-max="100"
    data-ui-step="5"
    data-ui-ticks="[0, 25, 50, 75, 100]"
    data-ui-tick-labels='["0", "25", "50", "75", "100"]'
    data-ui-tooltip="always">
```

```js
import $ from '@fr0st/query';
import '@fr0st/ui-slider';

$('[data-ui-toggle="slider"]').slider();
```

Data attributes configure options; they do not initialize Slider by themselves. Initialize the component through the class or fQuery plugin. Changing an option's data attribute after initialization does not reconfigure the existing instance.

## Methods

| Method | Returns | Description |
| --- | --- | --- |
| `Slider.init(node, options?)` | `Slider` | Return the existing instance for an element or create one. |
| `disable()` | `void` | Disable the input and handles, hide tooltips, and cancel an active gesture. |
| `dispose()` | `void` | Remove generated markup, tooltips, listeners, observers, and registration. |
| `enable()` | `void` | Enable the input and handles, subject to disabled ancestor fieldsets. |
| `getValue()` | `number \| number[]` | Return the current value or a copy of the ordered range, including an active drag preview. |
| `setValue(start, end?)` | `void` | Normalize and commit a single value or range; emit change if the serialized value changes. |

```js
price.setValue(80, 20); // Stored as 20,80.
console.log(price.getValue()); // [20, 80]
price.disable();
price.enable();
price.dispose();
```

For a range, pass two arguments to `setValue`; a missing endpoint uses `defaultValue`.

Disposal restores the input's previous hidden class, `tabindex`, and `aria-hidden`, preserves other classes and the committed value, and cancels pending reset work.

## Lifecycle

Calling `Slider.init()` again for the same element returns its existing instance. Dispose the current instance before reinitializing with different options.

An instance exposes its original element as `instance.node` and its shallow-frozen resolved configuration as `instance.options`. Both become `null` after disposal.

`dispose()` releases resources owned by the component and removes its registered instance. Repeated disposal is safe and does not affect a new instance initialized on the same element. Use a new instance before calling other methods after disposal.

## Events

Events originate from the original input through fQuery:

| Event | Description |
| --- | --- |
| `change.ui.slider` | The serialized input value changes during initialization, a setter, keyboard input, or a completed pointer gesture. |
| `slide.ui.slider` | A pointer gesture begins, after the initial preview is rendered. |
| `sliding.ui.slider` | Pointer movement changes the preview. `event.detail` is a number or `{ start, end }`. |
| `slid.ui.slider` | A pointer gesture finishes and commits. `event.detail` is a number or `{ start, end }`. |

```js
import $ from '@fr0st/query';

$.addEvent('#price', 'change.ui.slider', (event) => {
    console.log('Committed:', event.currentTarget.value);
});
$.addEvent('#price', 'sliding.ui.slider', (event) => {
    console.log('Preview:', event.detail);
});
```

Pointer movement updates `getValue()`, handles, and tooltips while the original input retains its committed value. Release uses the final pointer coordinates, emits change if needed, then emits `slid`. A click can emit `slide`, `change`, and `slid` without a `sliding` event. Keyboard and programmatic changes emit only `change`, and assigning the same normalized value emits nothing.

Pointer cancellation, window blur, and disabling restore the last committed values without emitting change or `slid`. If a setter commits during a gesture, cancellation preserves that newer commit. Disposal from event listeners is supported.

Native input/change synchronization and form resets do not emit an additional component change event. Register listeners before initialization if you need to observe initial normalization. Native listeners can receive the underlying event type, while fQuery also exposes its namespace.

## fQuery API

Importing Slider registers `slider` on `fQuery.QuerySet`:

```js
import $ from '@fr0st/query';
import '@fr0st/ui-slider';

const slider = $('#price').slider({ range: true, max: 100 });
$('#price').slider('setValue', 25, 75);
const value = $('#price').slider('getValue');
$('#price').slider('disable');
$('#price').slider('enable');
$('#price').slider('dispose');
```

Pass an options object to initialize every matched element, or pass a public method name followed by its arguments. The first component or method result is returned.

## Accessibility

Give each input a meaningful label. Handles use native label associations, `aria-label`, or `aria-labelledby`; range handles receive distinct “start” and “end” names. Unlabeled controls fall back to “Value” or “Range start”/“Range end”.

Handles expose `role="slider"`, orientation, min/max/current values, and formatted `aria-valuetext`. Native `disabled`, `required`, and `readonly` state is observed live, along with changes and removal of `aria-describedby`, `aria-errormessage`, `aria-invalid`, and `aria-required`. An explicit `aria-required` takes precedence over native `required`; removing it restores the native fallback. Label associations and accessible names are captured at initialization; dispose and reinitialize to reflect changes to that metadata. The native input is hidden from assistive technology while Slider is active.

Read-only handles expose `aria-readonly="true"` and remain focusable. Pointer and keyboard editing is blocked, while `setValue()`, native input/change synchronization, and form reset can still update the value. Making an input read-only during a gesture cancels the preview and restores the last committed values without emitting change or `slid`.

| Key | Behavior |
| --- | --- |
| Left / Right | Move along the physical horizontal axis, accounting for RTL and reversal. On vertical sliders, decrease/increase numerically. |
| Up / Down | Increase/decrease numerically. |
| Home / End | Select the minimum/maximum, subject to tick locking. |
| Ctrl + arrow | Select the next usable tick in that direction, or the corresponding bound when none remains. |
| Tab / Shift+Tab | Move through enabled handles in document order. |

With `lockToTicks`, ordinary arrows navigate adjacent ticks; if no usable ticks exist, ordinary arrows use `step`. Range crossing transfers focus to the other endpoint. Focusing the original input redirects to the first handle, including native form-validation focus.

## Forms

The original input's `name` and committed value are submitted normally. Ranges serialize as `start,end` by default; `rangeSeparator` customizes that text. Native validation remains on the original input. Disabled inputs and inputs in disabled fieldsets are excluded from `FormData`.

External value assignments must dispatch a native `input` or `change` event to synchronize the handles:

```js
const input = document.querySelector('#price');
input.value = '30,70';
input.dispatchEvent(new Event('input', { bubbles: true }));
```

Initialization and setters preserve the input's HTML default value. Calling the associated form's `reset()` or using a reset button restores that default, then asynchronously normalizes and renders it without an additional change event. Canceled resets are ignored.

Form and ancestor-fieldset associations are captured at initialization. Dispose and reinitialize if you move an input to another form or fieldset. Native `disabled` changes on the input or its existing ancestor fieldsets update the handles and cancel active gestures. Nested disabled fieldsets and the first-legend exemption follow the native input's effective disabled state.

## Themes and RTL

Frost UI follows the user's preferred color scheme by default. Set `data-ui-theme="light"` or `data-ui-theme="dark"` on the document or an ancestor to select a theme explicitly.

Slider uses Frost UI's progress, background, border, focus-ring, positioning, and visibility utilities. Load the UI stylesheet; no separate Slider CSS is needed.

UI follows the system color scheme by default. Set `data-ui-theme="light"` or `data-ui-theme="dark"` on the document to choose explicitly. Tooltips are appended to the document body, so a document-level theme also covers them.

Direction is inherited from the document or an ancestor. An input's own `dir` is copied to its generated container at initialization. Horizontal RTL reverses the value axis once, and `reversed: true` reverses it again. Vertical value direction depends on `reversed`, not RTL. Initialize after choosing the layout direction.

## Migrating from 3.x

- Use Frost UI 4 and fQuery 5. The package root now resolves to built ESM; browser consumers can continue using the UMD filenames and `UI.Slider`.
- Replace imports from `src/prototype/*` and access to underscore internals with the public API. Component state is private and resolved options are frozen.
- Build tooling uses Vite and requires Node.js `^20.19.0 || ^22.13.0 || >=24`. The package does not advertise CommonJS `require()` support.
- Values now normalize relative to `min`, remain within bounds after rounding, retain zero ticks, and support fixed bounds and shifted logarithmic ranges. Range endpoints are ordered. Invalid configuration is rejected before registration.
- Review change listeners: initialization and setters emit change when they alter the serialized value; native synchronization and reset do not add another change event. Pointer preview and committed values are distinct.
- The old light/dark, methods, and events demos are consolidated in [demo/index.html](./demo/index.html).

## Development

Install dependencies with `npm ci`, then install Playwright browsers with `npx playwright install --with-deps`.

```bash
npm test
npm run lint
npm run build
```

`npm test` rebuilds the bundles, then runs the Playwright suite in Chromium, Firefox, and WebKit. `npm run test:browser` runs the suite against the existing bundles, so rebuild after changing source files.

After building, `npm run test:coverage` runs Chromium tests and writes coverage reports to `coverage/`.

`npm run test:headed` and `npm run test:ui` also use the existing bundles and open headed browsers or the Playwright UI.

To view the demo, open `demo/index.html` in your browser after building.

## License

Frost UI Slider is released under the [MIT License](./LICENSE).
