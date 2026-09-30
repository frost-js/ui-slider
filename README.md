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
- ESM and UMD bundles with source maps and JSDoc-powered IntelliSense
- Frost UI v4 styling without component-specific CSS or Sass

Explore the examples in [demo/index.html](./demo/index.html).

## Installation

### Browser projects / bundlers

Install Slider with its Frost UI v4 and fQuery v5 peers:

```bash
npm i @fr0st/ui-slider@^4 @fr0st/ui@^4 @fr0st/query@^5
```

```js
import '@fr0st/ui/dist/frost-ui.min.css';
import Slider from '@fr0st/ui-slider';

const slider = Slider.init(document.querySelector('#volume'), {
    min: 0,
    max: 100,
    step: 5,
});
```

The package root resolves to the compiled ESM bundle. `dist/*` and `src/*` are also available through package exports. UI and fQuery are external peer dependencies so Slider shares the application's instances.

Slider requires a browser DOM. Load it on the client in server-rendered applications.

### Browser (ESM)

Serve this package's `dist/` directory alongside your page. Map all three peer and transitive dependencies before importing Slider:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fr0st/ui@4/dist/frost-ui.min.css">

<label for="volume">Volume</label>
<input id="volume" value="5">

<script type="importmap">
{
    "imports": {
        "@fr0st/core": "https://cdn.jsdelivr.net/npm/@fr0st/core@4/dist/frost-core.esm.min.js",
        "@fr0st/query": "https://cdn.jsdelivr.net/npm/@fr0st/query@5/dist/fquery.esm.min.js",
        "@fr0st/ui": "https://cdn.jsdelivr.net/npm/@fr0st/ui@4/dist/frost-ui.esm.min.js"
    }
}
</script>
<script type="module">
    import Slider from './dist/frost-ui-slider.esm.min.js';

    Slider.init(document.querySelector('#volume'));
</script>
```

### Browser (UMD)

Load Frost UI's all-in-one browser bundle before the local Slider bundle:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fr0st/ui@4/dist/frost-ui.min.css">

<label for="volume">Volume</label>
<input id="volume" value="5">

<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui@4/dist/frost-ui-bundle.min.js"></script>
<script src="./dist/frost-ui-slider.min.js"></script>
<script>
    const slider = UI.Slider.init(document.querySelector('#volume'));
</script>
```

The UI bundle supplies `UI` and `fQuery`; Slider adds `UI.Slider` to the existing UI object. Do not load a separate fQuery script alongside the all-in-one UI bundle. With the standalone UI build, load fQuery, UI, and Slider in that order.

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

Use a text input for ranges so the browser preserves both endpoints and their separator. Calling `Slider.init()` again for the same input returns the existing instance. Dispose it before initializing with different options.

## Options

Options are resolved in this order: component defaults, the input's `data-ui-*` attributes, then explicit initialization options. Resolved `instance.options` are frozen. `Slider.defaults` and `Slider.classes` may be customized before creating instances.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `min` | `number` | `0` | Inclusive minimum. |
| `max` | `number` | `10` | Inclusive maximum. Equal bounds produce a fixed-value slider. |
| `defaultValue` | `number` | `0` | Fallback for missing or invalid values, including missing range endpoints. |
| `step` | `number` | `1` | Positive step, measured from `min`. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Track orientation. |
| `scale` | `'linear' \| 'logarithmic'` | `'linear'` | Value-to-position scale. |
| `valueText` | `(value: number) => string \| number` | `(value) => value` | Accessible handle text and single-value tooltip content. |
| `rangeText` | `(start: number, end: number) => string \| number` | ``(start, end) => `${start} - ${end}` `` | Range tooltip content. |
| `tickSize` | `number` | `30` | Tick diameter in pixels. |
| `handleSize` | `number` | `20` | Handle size across the track, in pixels. |
| `handleSizeRatio` | `number` | `0.75` | Handle length along the track relative to `handleSize`. |
| `sliderSize` | `number` | `10` | Track thickness in pixels. |
| `verticalHeight` | `number` | `200` | Vertical track height in pixels. |
| `tooltip` | `false \| 'show' \| 'always'` | `'show'` | Hide, show on hover/focus/drag, or keep visible while enabled. |
| `tooltipPlacement` | `string \| null` | `null` | UI Tooltip placement; defaults to top horizontally and right vertically. |
| `low` | `string \| null` | `null` | Background class below the selected range. |
| `selection` | `string` | `'bg-primary'` | Selected interval background class. |
| `high` | `string \| null` | `null` | Background class above the selected range. |
| `ticks` | `number[]` | `[]` | Tick values; finite in-bounds values are sorted and deduplicated. |
| `tickLabels` | `(string \| number)[]` | `[]` | Labels associated with the original tick array order. |
| `tickSnapBounds` | `number` | `0` | Inclusive pointer snapping distance in value units. |
| `lockToTicks` | `boolean` | `false` | Snap all value updates to usable ticks. |
| `rangeHighlights` | `object[]` | `[]` | Intervals with `start`, `end`, and an optional background `style` class. |
| `range` | `boolean` | `false` | Render two independently focusable handles. |
| `rangeSeparator` | `string` | `','` | Nonempty separator used in the original input's value. |
| `reversed` | `boolean` | `false` | Reverse the physical value axis. |
| `disabledOpacity` | `number` | `0.5` | Disabled container opacity between 0 and 1. |

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

Use kebab-case `data-ui-*` names for options. Supply arrays and objects as JSON; pass formatter functions in JavaScript:

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
$('[data-ui-toggle="slider"]').slider();
```

`data-ui-toggle="slider"` is an initialization selector; it does not initialize the component by itself. Other examples include `data-ui-default-value="5"`, `data-ui-lock-to-ticks="true"`, `data-ui-range-separator=":"`, and `data-ui-tooltip="false"`.

## Methods

| Method | Returns | Description |
| --- | --- | --- |
| `Slider.init(node, options?)` | `Slider` | Create an instance or return the existing one. |
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

For a range, pass two arguments to `setValue`; a missing endpoint uses `defaultValue`. The instance exposes the original input as `node` and its configuration as `options`; both become `null` after disposal.

Disposal restores the input's previous hidden class and `tabindex`, preserves other classes and the committed value, and cancels pending reset work. Repeated disposal is safe. Initialize a new instance before using other methods again.

## Events

Events originate from the original input through fQuery:

| Event | `event.detail` | When it fires |
| --- | --- | --- |
| `change.ui.slider` | No custom payload | The serialized input value changes during initialization, a setter, keyboard input, or a completed pointer gesture. |
| `slide.ui.slider` | No custom payload | A pointer gesture begins, after the initial preview is rendered. |
| `sliding.ui.slider` | `number` or `{ start, end }` | Pointer movement changes the preview. |
| `slid.ui.slider` | `number` or `{ start, end }` | A pointer gesture finishes and commits. |

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

Importing Slider registers the `slider` QuerySet method:

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

An options object initializes every matched input. A public method name invokes that method on matched instances with the remaining arguments. The first instance or method result is returned.

## Accessibility

Give each input a meaningful label. Handles use native label associations, `aria-label`, or `aria-labelledby`; range handles receive distinct “start” and “end” names. Unlabeled controls fall back to “Value” or “Range start”/“Range end”.

Handles expose `role="slider"`, orientation, min/max/current values, and formatted `aria-valuetext`. Original `aria-describedby` and `aria-invalid` are copied at initialization. Label and accessibility metadata changes require disposal and reinitialization to be reflected. Disabled state is observed live.

| Key | Behavior |
| --- | --- |
| Left / Right | Move along the physical horizontal axis, accounting for RTL and reversal. On vertical sliders, decrease/increase numerically. |
| Up / Down | Increase/decrease numerically. |
| Home / End | Select the minimum/maximum, subject to tick locking. |
| Ctrl + arrow | Select the next usable tick in that direction, or the corresponding bound when none remains. |
| Tab / Shift+Tab | Move through enabled handles in document order. |

With `lockToTicks`, ordinary arrows navigate adjacent ticks; if no usable ticks exist, ordinary arrows use `step`. Range crossing transfers focus to the other endpoint. Focusing the original input redirects to the first handle, including native form-validation focus.

## Forms and reset

The original input's `name` and committed value are submitted normally. Ranges serialize as `start,end` by default; `rangeSeparator` customizes that text. Native validation remains on the original input. Disabled inputs and inputs in disabled fieldsets are excluded from `FormData`.

External value assignments must dispatch a native `input` or `change` event to synchronize the handles:

```js
const input = document.querySelector('#price');
input.value = '30,70';
input.dispatchEvent(new Event('input', { bubbles: true }));
```

Initialization and setters preserve the input's HTML default value. Calling the associated form's `reset()` or using a reset button restores that default, then asynchronously normalizes and renders it without an additional change event. Canceled resets are ignored.

Form and ancestor-fieldset associations are captured at initialization. Dispose and reinitialize if you move an input to another form or fieldset. Native `disabled` changes on the input or its existing ancestor fieldsets update the handles and cancel active gestures.

## Themes and RTL

Slider uses Frost UI's progress, background, border, focus-ring, positioning, and visibility utilities. Load the UI stylesheet; no separate Slider CSS is needed.

UI follows the system color scheme by default. Set `data-ui-theme="light"` or `data-ui-theme="dark"` on the document to choose explicitly. Tooltips are appended to the document body, so a document-level theme also covers them.

Direction is inherited from the document or an ancestor. An input's own `dir` is copied to its generated container at initialization. Horizontal RTL reverses the value axis once, and `reversed: true` reverses it again. Vertical value direction depends on `reversed`, not RTL. Initialize after choosing the layout direction.

## Upgrading from 3.x

- Use Frost UI 4 and fQuery 5. The package root now resolves to built ESM; browser consumers can continue using the UMD filenames and `UI.Slider`.
- Replace imports from `src/prototype/*` and access to underscore internals with the public API. Component state is private and resolved options are frozen.
- Build tooling uses Vite and requires Node.js `^20.19.0 || ^22.13.0 || >=24`. The package does not advertise CommonJS `require()` support.
- Values now normalize relative to `min`, remain within bounds after rounding, retain zero ticks, and support fixed bounds and shifted logarithmic ranges. Range endpoints are ordered. Invalid configuration is rejected before registration.
- Review change listeners: initialization and setters emit change when they alter the serialized value; native synchronization and reset do not add another change event. Pointer preview and committed values are distinct.
- The old light/dark, methods, and events demos are consolidated in [demo/index.html](./demo/index.html).

## Development

Use Node.js `^20.19.0 || ^22.13.0 || >=24`:

```bash
npm ci
npx playwright install --with-deps
npm run lint
npm test
```

`npm test` builds all JavaScript bundles and runs Chromium, Firefox, and WebKit. `npm run build` builds ESM/UMD, minified variants, and source maps. The `dist/` outputs are tracked.

`npm run test:browser`, `npm run test:headed`, and `npm run test:ui` use existing bundles; rebuild after changing source. After building, `npm run test:coverage` runs Chromium coverage and writes HTML and LCOV reports to `coverage/`.

To view the demo, serve the repository root over HTTP and open `/demo/`. For example, with Python installed:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/demo/`. The demo loads UI 4 from jsDelivr and Slider from the local `dist/` directory.

## License

Frost UI Slider is released under the [MIT License](./LICENSE).
