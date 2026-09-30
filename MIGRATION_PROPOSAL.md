# Frost UI Slider 4 migration proposal

Prepared 30 September 2026. Sections 1 and 2 have been implemented; the remaining sections are proposed work. See the implementation status below.

## Recommendation

Release `@fr0st/ui-slider` **4.0.0**, migrating from 3.0.5 to Frost UI 4 and fQuery 5. Adopt the build, package, source, documentation, demo, test, coverage, and CI conventions of the reference projects. Include the compatibility fixes and Slider defects identified below in the migration, with browser regression coverage.

Keep the existing component identity, default ESM export, `UI.Slider` browser export, fQuery `.slider()` integration, options, methods, and event names wherever practical. Document the intentional breaking changes: dependency requirements, Node requirements, package entry points, removal of prototype modules and accessible underscore internals, and corrections to invalid numeric/range behavior.

## References and current state

The primary baseline is [`../ui`](../ui/package.json). Use [`../ui-authcodeinput`](../ui-authcodeinput/package.json) for the packaging and layout of a component without its own stylesheet. Use [`../FrostUI-SelectMenu`](../FrostUI-SelectMenu/package.json) for the larger browser suite, forms, layout checks, and optional Sass pipeline. The requested `../ui-selectmenu` directory does not exist in this checkout; `../FrostUI-SelectMenu` contains `@fr0st/ui-selectmenu` 4.0.0.

Additional source checks used [`../fquery`](../fquery/src/fquery.js) and [`../core`](../core/src/math.js), particularly the exported utility functions, drag factory, numeric helpers, and debounce cancellation. These APIs should be inspected directly rather than assuming all underscore-prefixed fQuery helpers were removed: fQuery 5 still exposes core helpers with that prefix.

| Area | Slider today | Proposed result |
| --- | --- | --- |
| Version | 3.0.5 | 4.0.0 |
| Runtime requirements | Imports UI and fQuery without declaring either | UI 4 and fQuery 5 peer and development dependencies |
| Package entry | `src/index.js` | Built ESM entry and explicit exports |
| Build | Rollup plus a separate Terser invocation | Vite 8, ESM and UMD, minified variants and source maps |
| Source | Mutable underscore fields and prototype composition | One component class with private fields/methods and typed JSDoc |
| Styling | UI utility classes and inline geometry; no CSS/SCSS source | UI 4 utilities, corrected geometry; no separate stylesheet by default |
| Tests/coverage | None | Playwright, Monocart, LCOV, Codecov |
| Automation | No workflows | Reference CI matrix and release publishing workflow |
| Documentation | Short installation guide and documentation placeholder | Full component reference and consolidated interactive demo |

## 1. Dependencies and package metadata

### Version targets

The following published versions were checked using `npm view` against the public npm registry on 30 September 2026. They are verified targets for this proposal, not a guarantee that they will remain latest when implementation begins.

| Package | Reference version/range | Proposed version/range |
| --- | --- | --- |
| `@fr0st/ui` | `^4.0.0` | `^4.0.0`, peer and dev dependency |
| `@fr0st/query` | `^5.0.0` | `^5.0.0`, peer and dev dependency |
| `@fr0st/eslint-config` | `^5.0.3` | `^5.0.3` |
| `eslint` | UI/AuthCodeInput `^10.10.0`; SelectMenu `^10.11.0` | `^10.11.0` |
| `vite` | `^8.3.0` | `^8.3.1` |
| `@playwright/test` | `^1.63.0` | `^1.63.0` |
| `monocart-reporter` | `^2.13.1` | `^2.13.1` initially; update to `^2.14.0` once release-age eligible |
| `sort-package-json` | One-off maintenance tool | Latest verified version is 4.0.0; run through `npx` on Node 24 |

Registry sources: [UI](https://registry.npmjs.org/@fr0st%2fui), [fQuery](https://registry.npmjs.org/@fr0st%2fquery), [ESLint configuration](https://registry.npmjs.org/@fr0st%2feslint-config), [ESLint](https://registry.npmjs.org/eslint), [Vite](https://registry.npmjs.org/vite), [Playwright](https://registry.npmjs.org/@playwright%2ftest), [Monocart](https://registry.npmjs.org/monocart-reporter), and [sort-package-json](https://registry.npmjs.org/sort-package-json).

Monocart 2.14.0 was published on 29 September at 16:37:19 UTC, so it is currently younger than the references' three-day minimum release age. Use the latest eligible version without adding an exception for it. Recheck before implementation; it becomes eligible on 2 October at 16:37:19 UTC. Vite 8.3.1 was published on 24 September and already meets that policy.

Remove direct development dependencies on `@rollup/plugin-node-resolve`, `rollup`, and `terser`. Do not add Sass tooling unless the styling audit establishes an actual need for component CSS.

### Manifest changes

- Set `version` to `4.0.0`, `private` to `false`, and improve the description and keywords to describe single/range sliders, ticks, orientation, and keyboard support.
- Retain the package name. Match the references' author, repository URL format, and `publishConfig.access: "public"`. Preserve the current repository destination unless it has actually moved; do not invent a `frost-js/ui-slider` repository.
- Keep `type: "module"` and the existing published file allowlist: `dist`, `LICENSE`, `README.md`, and `src`.
- Set `main` and `module` to `./dist/frost-ui-slider.esm.js`.
- Set `jsdelivr` and `unpkg` to `./dist/frost-ui-slider.min.js`.
- Define `exports["."]` with `import` and `default` pointing to the ESM bundle; include `./dist/*` and `./src/*` exports as in the component references.
- Use `engines.node: "^20.19.0 || ^22.13.0 || >=24"` and `browserslist: ["baseline newly available"]`.
- Declare both runtime imports as peers and dev dependencies, avoiding a second bundled UI/fQuery instance. No direct `@fr0st/core` dependency is needed while using the helpers supplied by fQuery.
- Regenerate and commit `package-lock.json` using the new `.npmrc`, then run **`npx sort-package-json`** on Node 24.

Use the AuthCodeInput script vocabulary:

```json
{
    "build": "vite build && vite build --mode umd",
    "lint": "eslint",
    "test": "npm run build && npm run test:browser",
    "test:browser": "playwright test --forbid-only",
    "test:coverage": "playwright test --config=playwright.coverage.config.js --forbid-only",
    "test:headed": "playwright test --forbid-only --headed",
    "test:ui": "playwright test --ui"
}
```

### Repository configuration

Add `.npmrc` matching AuthCodeInput:

```ini
min-release-age=3
min-release-age-exclude[]=@fr0st/eslint-config
min-release-age-exclude[]=@fr0st/core
min-release-age-exclude[]=@fr0st/query
min-release-age-exclude[]=@fr0st/ui
```

Expand `.gitignore` into the reference's grouped entries: `node_modules/`, `.tmp/`, `coverage/`, `playwright-report/`, and `test-results/`. Keep `dist/` tracked, matching both the current repository and reference CI bundle checks.

Update `eslint.config.js` to use `frostConfig`, `browserConfig`, and scoped `nodeConfig` from the current shared configuration. Ignore generated bundles and test output; apply Node configuration to root config files and the test server; declare `$` and `UI` for browser test callbacks. Follow the references' formatting and JSDoc rules.

## 2. Vite and distribution

Use [`../ui-authcodeinput/vite.config.js`](../ui-authcodeinput/vite.config.js) as the direct template:

- Replace `rollup.config.js` with `vite.config.js` using Vite's `rolldownOptions`.
- Build ESM from `src/index.js` and rename `src/wrapper.js` to `src/browser.js` for UMD.
- Keep the default `Slider` export from `src/index.js`; `src/browser.js` re-exports named `Slider`.
- Externalize `@fr0st/query` and `@fr0st/ui` in both modes.
- Map browser globals to `fQuery` and `UI`, with UMD `name: "UI"` and `extend: true`. Loading Slider must preserve existing `UI` exports such as `Tooltip`.
- Use `target: "baseline-widely-available"`, source maps, and separate minified/unminified outputs.
- Clear `dist` for the initial ESM build and preserve it for the following UMD build (`emptyOutDir: !isUmd`).

Commit these four outputs and their four source maps:

```text
dist/frost-ui-slider.esm.js
dist/frost-ui-slider.esm.min.js
dist/frost-ui-slider.js
dist/frost-ui-slider.min.js
```

A dependency-inclusive bundle is unnecessary: the UI browser bundle already supplies UI and fQuery. Retain existing UMD filenames for script-tag consumers. Do not advertise CommonJS `require()` support from a `.js` UMD file inside a `type: "module"` package.

## 3. JavaScript migration and public behavior

### Component structure

Follow [`BaseComponent`](../ui/src/js/base-component.js), [`Tooltip`](../ui/src/js/tooltip/tooltip.js), and [`AuthCodeInput`](../ui-authcodeinput/src/auth-code-input.js):

- Move `static defaults` and `static classes` into `Slider`.
- Replace inherited `_node` and `_options` reads with the public `this.node` and `this.options` getters. UI 4 keeps its own state private and freezes the options object.
- Declare Slider-owned state with `#` private fields and fold the prototype modules into private class methods. Delete `src/prototype/` and all assignments to `Slider.prototype`.
- Keep `src/index.js` small: import, `initComponent('slider', Slider)`, default export.
- If numeric operations benefit from isolation, use a small `src/helpers.js` with pure functions and explicit arguments. Do not recreate prototype composition or pass the component around to reach its internals.
- Use a `SliderOptions` typedef, range-highlight/callback types, `@augments {BaseComponent<SliderOptions>}`, accurate `number|number[]` returns, imported Tooltip types, and JSDoc on public and private methods. Order members consistently with the reference classes.
- Keep `init`, `dispose`, `disable`, `enable`, `getValue`, and `setValue` available through the class and fQuery APIs. Keep static classes/defaults customizable before initialization.

### UI integration and lifecycle

Remove calls to Tooltip's old `_stop()` internal. Manage hover/focus/drag state inside Slider and use Tooltip's public `show`, `hide`, `refresh`, `update`, and `dispose` methods. Update title data before showing an always-visible tooltip, and verify rapid trigger changes against UI 4 transition behavior.

Save and restore the original input's `tabindex` and hidden-class state. Remove only IDs, handlers, DOM, and other state owned by Slider. Cancel pending debounced work, terminate or safely neutralize active drags on disposal, and guard callbacks after disposal, including disposal from event listeners. Audit the drag factory's window listeners rather than assuming removal of the generated container stops an active gesture.

Synchronize the rendered control after a non-canceled form reset, after the browser has restored native values. Remove the form listener and invalidate pending refreshes on disposal. Handle native input/change synchronization with an explicit recursion guard; keep initialization, setter, drag, and reset event behavior documented and tested.

### Proposed numeric and interaction contract

- Keep `getValue()` returning a number for single mode and `[start, end]` for range mode, with the source input serialized using `rangeSeparator`.
- Normalize finite numeric input consistently across initialization, setters, keyboard, and dragging. Reject invalid bounds (`min > max`) and non-positive/non-finite steps early; treat `min === max` as a fixed-value slider with finite geometry. Validate before leaving partially initialized DOM or registered data behind.
- Anchor step rounding to `min`, clamp the final result to bounds, and preserve reachable endpoints even when the interval is not divisible by `step`. Document this correction from zero-based rounding.
- Sort reversed programmatic range endpoints into ascending order; keep drag/keyboard handle handoff when crossing, with visible focus and ARIA values matching the resulting endpoints. Define missing or malformed values explicitly, using the configured default for missing/non-finite values before normalization.
- Normalize ticks without mutating frozen options or losing the association with tick labels. Treat zero as a valid snap target. Apply `lockToTicks` consistently to setters and keyboard as well as dragging; retain a deterministic bounded fallback for an empty usable tick list.
- Make value-to-percent and percent-to-value true inverses, including non-zero and negative minima under the existing shifted logarithmic model. Clamp pointer percentages before conversion.
- Use one consistent coordinate model for handles, ticks, labels, bars, and highlights across horizontal/vertical and reversed layouts. Audit RTL independently of `reversed` rather than applying the reversal twice.
- Provide accessible names from native labels and explicit ARIA naming; give range handles distinguishable start/end names, set `aria-orientation`, and maintain correct value bounds/text, focus, and disabled behavior. Keep the original input as the form submission control.
- Preserve `slide.ui.slider`, `sliding.ui.slider`, `slid.ui.slider`, and `change.ui.slider`. Specify their ordering and detail shapes. In particular, test the existing distinction between preview values during dragging and the committed native input value at release.

## 4. Styling and Sass

There are no Slider CSS or Sass files to port. Retain the flat `src/` layout and avoid creating `src/js`/`src/scss` solely to resemble the larger UI repository; AuthCodeInput demonstrates the appropriate convention for this case.

Audit the existing classes (`progress`, `progress-bar`, `bg-body-tertiary`, `focus-ring`, positioning, transforms, and z-index utilities) against UI 4. Check the newer progress-bar shadow, native button styling, tick stacking, vertical container dimensions, tooltip clipping, and RTL transforms. Fix the confirmed positioning defects below and use current UI utilities/tokens for appearance. Dynamic sizes and coordinates can remain inline.

If an essential behavior cannot be expressed cleanly with those utilities, introduce only the necessary component Sass and then adopt SelectMenu's `src/js`/`src/scss` structure and Sass/PostCSS/Autoprefixer/clean-css/stylelint pipeline together. This is a conditional expansion, not the default recommendation.

Do **not** add light/dark theme tests for inherited UI styling. Add theme-specific checks only if implementation introduces actual Slider-owned theme rules. Geometry, focus, disabled behavior, orientation, and RTL checks remain necessary regardless of theme.

## 5. Playwright, assertions, and coverage

### Harness

Adapt AuthCodeInput's `playwright.config.js`, `test/package.json` (`#test` import alias), `test/support/test.js`, `test/support/app/index.html`, and fixed-route `test/support/server/static-server.js`.

Use Chromium, Firefox, and WebKit, `test/browser/**/*.test.js`, a local server on port 3001, an 800×600 default viewport, reduced motion, and the reference timeout. Serve the built Slider UMD and locally installed UI CSS/browser bundle. Tests must not depend on CDN availability. Omit the AuthCodeInput clipboard permission because Slider does not use clipboard access.

The automatic fixture should verify `UI.Slider`, fQuery registration, and stylesheet readiness, then give each test a clean page. Reuse the reference patterns for fixtures and instance handles. Add focused ESM and minified-UMD loading checks alongside the primary unminified-UMD suite, including preservation of UI exports and external dependency identity.

### Suite grouping and order

Follow [`auth-code-input.test.js`](../ui-authcodeinput/test/browser/auth-code-input.test.js) and [`select-menu.test.js`](../FrostUI-SelectMenu/test/browser/select-menu.test.js), with one top-level component describe and method groups before event and option groups:

```text
test/browser/slider.test.js
  Slider
    #init
    #dispose
    #disable / #enable        (the reference's parameterized method pattern)
    #getValue
    #setValue
    input attributes
    events
    user events
      pointer and touch
      keyboard
      focus and tab order
    min / max / defaultValue / step options
    range / rangeSeparator options
    orientation / reversed options
    scale option
    ticks / tickLabels / tickSnapBounds / lockToTicks options
    tooltip / tooltipPlacement / valueText / rangeText options
    low / selection / high / rangeHighlights options
    size and disabledOpacity options

test/browser/slider-form.test.js
  Slider forms
    native synchronization
    submission
    validation
    disabled state
    reset
    disposal

test/browser/slider-style.test.js
  Slider styles
    sizing and positioning
    ticks and labels
    selection and highlights
    RTL
    focus and disabled styling
    tooltip positioning
```

Keep regressions inside the relevant method/event/option groups rather than creating an unrelated catch-all suite. Parameterize class/QuerySet access as the references do. Exercise single/range and horizontal/vertical/reversed variants where behavior changes; avoid multiplying every test across irrelevant combinations.

### Assertion requirements

Prefer locators for observable state: `getByRole('slider')`, `toHaveCount`, `toHaveValue`, `toHaveAttribute`, `toHaveAccessibleName`, `toHaveText`, `toHaveClass`, `toBeFocused`, `toBeDisabled`, and `toBeVisible`. For example:

```js
await expect(page.locator('#amount')).toHaveValue('5');
await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '5');
await expect(page.getByRole('slider')).toBeFocused();
```

Do not evaluate a large DOM-state object and compare it with `.toEqual(...)`. Use scalar assertions for method results, identity, and registration; a direct array assertion is appropriate when testing the actual public range return value. Use dedicated assertions on event details and order when no locator equivalent exists. For geometry, use bounding boxes or computed styles with polling/tolerances where needed. Use browser input and locator actions for interaction; reserve synthetic touch events for cases Playwright cannot express faithfully, and state those limitations.

### Coverage

Adapt `playwright.coverage.config.js` and the coverage fixture with `FROST_UI_SLIDER_COVERAGE`. Collect V8 coverage in Chromium, map the unminified UMD back to source, and write console summary, HTML, and `coverage/lcov.info` through Monocart.

Filter coverage to Slider's bundle and source, including unexecuted source files with `all: './src'`. Exclude only `src/browser.js` if its re-export is erased by bundling, with the same explanatory comment as AuthCodeInput. Do not lower the scope to hide difficult interaction paths.

Add `.github/codecov.yml` matching UI: project target 95%, threshold 5%, `if_ci_failed: error`, and informational patch coverage. This is the reference's tolerance-based policy, not an absolute local 95% enforcement rule. Aim for at least 95% source coverage, with gaps reviewed for missing behavior tests.

## 6. CI and publishing

Adapt the actual UI/AuthCodeInput workflow files, changing component-specific paths and names:

- Trigger CI on pushes to `main` and pull requests, with the reference Markdown-only path exclusions.
- Test Chromium on Node 20, 22, and 24; Firefox and WebKit on Node 24.
- Use `actions/checkout@v6`, `actions/setup-node@v6`, npm cache, `npm ci`, installation of the matrix browser with system dependencies, lint, and build.
- Run ordinary browser tests in four jobs and the full Chromium coverage suite in the Node 24/Chromium job, with four workers as in UI.
- Upload `coverage/lcov.info` using `codecov/codecov-action@v7`, `use_oidc: true`, `disable_search: true`, and `fail_ci_if_error: true`; use the reference `contents: read` and `id-token: write` permissions.
- Verify committed bundles with `git diff --exit-code -- dist` and validate package contents with `npm pack --dry-run`. During migration, additionally verify all expected files are tracked; a plain diff does not report newly generated untracked files.
- Add the release-published workflow using Node 24, clean install, Chromium installation, lint, build, browser tests, package validation, and `npm publish --provenance`.

Configure the repository in Codecov and npm trusted publishing for the exact repository/workflow/environment identity before relying on those external steps. Workflow creation alone does not configure either service. Recheck action availability and current reference workflows during implementation. Preparing the workflow does not publish the package or create a release.

## 7. README and demos

Rewrite README using the reference progression: badges/introduction, Highlights, Installation (bundlers, browser ESM, browser UMD), Usage, Options, Data attributes, Methods, Events, fQuery API, Accessibility, Forms/reset, Themes and RTL, Development, and License.

Document all existing options, defaults, callback signatures, range serialization, corrected numeric behavior, keyboard commands, event payloads/order, disabled behavior, and disposal/restoration. Show default ESM imports and UMD script order. Provide a correct browser import map or equivalent dependency resolution for native ESM, including UI's transitive dependencies; bare npm specifiers do not resolve by themselves. Include a short 3.x-to-4.x upgrade section and explain that UI supplies the styling.

Replace the duplicated `demo/light/demo.html` and `demo/dark/demo.html` with `demo/index.html`, `demo/assets/demo.css`, and `demo/assets/demo.js` following the UI/AuthCodeInput page layout. Consolidate methods and event examples into that page and update links when retiring the old files.

Include single/range, horizontal/vertical, reversed, disabled, fractional steps/non-zero bounds, tick labels/snapping/locking, logarithmic scaling, highlights, tooltip modes, formatting callbacks, and form/reset examples. Include working method controls and an event log. Use the current npm CDN paths for UI and the local built Slider file; replace the old GitHub CDN links. A system/light/dark selector may demonstrate inherited UI themes without creating a Slider theme test matrix. Keep demo CSS limited to presentation and spacing, not fixes required by the component itself.

## 8. Bugs and other issues found

These findings distinguish direct source evidence from behavior that still needs browser reproduction. No full browser suite exists in Slider today, and none was run for this proposal.

### Confirmed migration blockers

| Finding | Evidence | Required change / regression |
| --- | --- | --- |
| UI 4 base state is incompatible | `src/slider.js` and all prototype modules use `_node`/`_options`; UI 4 exposes `node`/`options` over private fields | Migrate all accesses; test class and QuerySet initialization against UI 4 |
| Removed Tooltip internal is called | `src/prototype/events.js`, `_eventsTooltip`, calls `_tooltip._stop()`; UI 4 has no such method | Use public Tooltip lifecycle methods; test hover/focus/drag transitions |
| Runtime dependencies are undeclared | `package.json` has no peer/runtime declaration for either imported package | Add UI/fQuery peers and dev dependencies; test a clean package consumer |

### Numeric defects reproduced in isolated source checks

For these checks, the existing helper module was loaded with its import bindings replaced by the sibling core math helpers; no browser or production source was changed. These results verify the numeric paths, not complete DOM interactions.

| Finding | Observed result | Proposed correction |
| --- | --- | --- |
| Zero tick is discarded | `_checkTicks(0.2)` with ticks `[0, 5]` and `lockToTicks: true` returns `0.2`, because `if (closest)` rejects `0` | Check whether a match exists, not its truthiness; cover pointer, keyboard, and setter behavior |
| Logarithmic inverse adds `min` twice | With min 10/max 100, `_getValue(0)` returns 20 and `_getValue(100)` returns approximately 110 | Correct the inverse and the comparison against the logarithmic `max`; test endpoints and round trips |
| Step rounding escapes bounds | `_clampValue(10)` with min 0/max 10/step 6 returns 12 | Round relative to min and enforce final bounds; cover non-divisible intervals and decimals |
| Equal linear bounds yield invalid geometry | `_getPercent(5)` with min=max=5 returns `NaN` | Handle the fixed-value case before interpolation for both scales |

### Defects visible in source; browser regression cases required

| Finding | Source evidence | Proposed correction / test |
| --- | --- | --- |
| Vertical highlight offset lacks `%` | `_renderRangeHighlights` assigns `top: String(startPercent)` | Use a percentage; numeric style normalization can turn this into pixels |
| Reversed highlights use unreversed offsets | `_renderBar` sets right/bottom anchoring, but `_renderRangeHighlights` adds left/top without transforming the interval | Derive consistent reversed start/end geometry and clear conflicting anchors |
| Vertical ticks disagree with labels/handles | `_renderTicks` positions ticks with `bottom`, labels with `top`; `_moveHandle` uses `top` | Share the same coordinate model; verify matching positions including reversed mode |
| Range tick-release branch calls the single setter | `_eventsRange` invokes `_setValue(value)` for a tick target | Route to range normalization and the selected handle; reproduce reachability because the current drag factory delivers release on the window |
| Unordered ranges can produce negative selection sizes | `_setValueRange` clamps each endpoint but never orders them | Normalize programmatic endpoints and test handle crossing separately |
| Disposal overwrites original input state | `dispose` always removes `tabindex` and the hidden class | Restore recorded original state while preserving unrelated runtime changes |
| Stale handle/debounce references | `dispose` clears `_handleActive`, but interactions use `_handle`; the tooltip debounce is not canceled | Clear actual owned references and cancel/guard delayed work |
| Incorrect generated label prefix and brittle lookup | Constructor uses `starrating-label` and interpolates raw input IDs into a selector | Use Slider-specific IDs and native label associations or escaped lookup; cover unusual IDs and wrapping labels |
| Incomplete accessible naming/orientation | Handle rendering only copies the first explicit label and omits `aria-orientation` | Cover explicit ARIA names, native labels, vertical controls, and distinguishable range handles |
| Form reset/native updates leave rendered state stale | No reset or native value-change synchronization is registered | Add guarded synchronization and tests for cancellation, multiple sliders, and disposal |

### Integration risks to reproduce, not yet confirmed as browser failures

- Touch release/cancellation: UI's `getPosition` reads active `touches` and then event `pageX/pageY`; it does not read `changedTouches`. Slider calls it on release, when active touches can be empty. Test final touch coordinates and cancellation, and use the last valid position or changed touch as appropriate.
- Disposal/disable during a gesture or from `slide`, `sliding`, or `change` listeners: current callbacks continue accessing state without lifecycle guards, and the drag factory owns window listeners.
- Always-visible tooltip initialization occurs during render, before insertion and value/title synchronization; verify attachment and positioning after initialization.
- New UI progress styling and RTL translate utilities may alter geometry or appearance. Verify visually and with focused layout assertions before adding any component CSS.
- Invalid numeric strings, missing range endpoints, unsorted/duplicate ticks, and out-of-bounds highlights currently lack a consistent contract. Cover the proposed normalization rules rather than carrying accidental behavior into 4.0.0.

## 9. Implementation sequence and acceptance

1. Update repository configuration, dependency/metadata targets, scripts, and lockfile; sort the manifest with `npx sort-package-json`.
2. Replace the build and browser entry, add the local browser harness, and migrate the component to UI 4 getters/private state/public Tooltip methods.
3. Correct numeric, range, lifecycle, accessibility, and geometry defects with the grouped regression tests above. Validate against installed UI 4 CSS before deciding whether Sass is required.
4. Complete the three-browser suite, source coverage, and package format smoke checks; add CI, Codecov configuration, and the publishing workflow.
5. Rewrite README/demos, regenerate and commit all distribution artifacts, and review the consumer-facing migration notes.

Acceptance checks:

- A clean `npm ci` succeeds using the committed lockfile and release-age policy; UI/fQuery peer ranges resolve without missing peers.
- `npm run lint`, `npm run build`, and `npm run test:browser` pass; browser tests cover Chromium, Firefox, and WebKit with the reference grouping/order and locator-first assertions.
- After building, `npm run test:coverage` produces correctly mapped source reports and `coverage/lcov.info`; coverage is reviewed against the reference target.
- Expected ESM/UMD bundles and maps are tracked, repeat builds are clean, and `npm pack --dry-run` lists only intended package files.
- A temporary packed-package consumer can import the default ESM export with declared peers; browser UMD loading adds `UI.Slider` without replacing UI/fQuery. Check minified output too.
- No prototype directory/composition, inherited `_node`/`_options` access, or calls to Tooltip internals remain.
- Confirmed defects have relevant regression tests; unresolved integration risks are explicitly recorded rather than represented as verified fixes.
- Demos work with UI 4 across the listed interaction modes, documentation matches implementation, and no redundant theme tests or unnecessary CSS build are introduced.
- CI mirrors UI's supported runtime/browser matrix; external Codecov and npm publishing setup is verified before release.

## Implementation status

Sections **1. Dependencies and package metadata** and **2. Vite and distribution** were implemented on 30 September 2026:

- Added `.npmrc`, expanded `.gitignore`, updated shared ESLint configuration, and set the package version to 4.0.0 with the proposed metadata, exports, peers, development dependencies, and scripts.
- Regenerated `package-lock.json` and ran `npx sort-package-json`. The lockfile resolves Monocart 2.13.1 under the three-day release-age policy.
- Replaced Rollup/Terser scripts with Vite, renamed `src/wrapper.js` to `src/browser.js`, and generated all four bundles and their source maps.
- Applied only the existing source cleanup required by the new lint rules: import order, JSDoc tags/types, and removal of a redundant initial assignment. Component behavior and prototype composition are still awaiting section 3.
- Verified a clean `npm ci`, `npm run lint`, `npm run build`, and package contents with `npm pack --dry-run`. Checked generated source maps against source contents.
- Ran local Chromium smoke checks of all four bundle variants: ESM default exports and registration use external peers; UMD adds `UI.Slider` without replacing UI, Tooltip, or fQuery.

This is an intermediate migration state, **not a release-ready UI 4 component**. Slider still uses the incompatible `_node`/`_options` base fields and Tooltip `_stop()` internal described above. Bundle-loading checks do not validate construction or interaction. The Playwright dependencies and scripts are in place, but their configs and test harness await section 5; the test scripts are not yet runnable successfully. Sections 3–7, behavior regressions, and release validation remain outstanding. No package was published and no Git commit was created.
