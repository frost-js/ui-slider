# Frost UI Slider 4 migration proposal

Prepared 30 September 2026. Sections 1–4 have been implemented; the remaining sections are proposed work. See the implementation status below.

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

The original audit below described 3.x behavior. The resolutions were implemented in sections 1–4; this section now records their current status and permanent regression coverage. File and method names in the historical evidence refer to the old implementation, including the removed prototype directory.

### Migration blockers — resolved

| Finding and original evidence | Resolution | Verification |
| --- | --- | --- |
| UI 4 base-state incompatibility: Slider read `_node`/`_options`, which UI now stores privately. | Slider uses public `node`/`options` getters and owns its state through private fields. Prototype composition was removed. | Source audit; [main suite](test/browser/slider.test.js), `#init`, class and QuerySet cases. |
| Removed Tooltip internal: `_eventsTooltip` called `_tooltip._stop()`. | Uses public Tooltip show/hide/refresh/dispose methods and shared hover/focus/drag state. | Main suite, `tooltip option`, event-listener disposal; [style suite](test/browser/slider-style.test.js), `tooltip positioning`. |
| Undeclared runtime imports: UI and fQuery had no peer/runtime declarations. | UI 4 and fQuery 5 are both peer and development dependencies. | [Manifest](package.json), committed lockfile, installed-peer browser fixture, and the package checks recorded in sections 1–4. |

### Numeric defects — resolved

The initial numeric failures were reproduced with isolated copies of the old helpers. The current regressions exercise the component through its public API and browser interactions.

| Finding and original result | Resolution | Verification in the main suite |
| --- | --- | --- |
| Zero tick discarded: `_checkTicks(0.2)` ignored a closest tick of `0` because it tested truthiness. | Tick matching checks the selected value without rejecting zero. | `tickSnapBounds option`, pointer snapping to zero; `lockToTicks option`, setter and keyboard navigation. |
| Logarithmic inverse added `min` twice: min 10/max 100 mapped endpoints to about 20/110. | Matching shifted `log1p`/`expm1` mappings with explicit endpoint handling. | `scale option`, negative/zero/positive minima, midpoint round trips, and both endpoints. |
| Step rounding escaped bounds: min 0/max 10/step 6 could return 12. | Round relative to `min`, then clamp again; endpoints remain reachable. | `min option`, `max option`, and `step option`, including decimal steps and a non-divisible interval. |
| Equal bounds produced `NaN` geometry. | Fixed ranges bypass interpolation. | `max option`, equal linear and logarithmic bounds through initialization, keyboard, and pointer release. |

### Layout, lifecycle, accessibility, and forms — resolved

| Finding and original evidence | Resolution | Permanent regression coverage |
| --- | --- | --- |
| Vertical highlights assigned a unitless `top: String(startPercent)`. | All interval positions use percentages on the physical track axis. | Style suite, `layout`: highlight position and size on horizontal/vertical tracks. |
| Reversed highlights mixed right/bottom anchoring with unreversed left/top offsets. | Both interval endpoints are transformed before choosing the start and size. | Style suite, `layout`: asymmetric 2–4 highlights across orientation, reversal, and RTL; the asymmetric interval exposes incorrect reversal. |
| Vertical ticks used `bottom` while labels and handles used `top`. | Ticks, labels, handles, and intervals share the same coordinate mapping. | Style suite, `layout`: tick/handle centers and label alignment in all eight direction combinations. |
| Range tick release called the single-value setter. | Tick and track interactions update the nearest range handle through shared range normalization. | Main suite, `ticks option`: off-step range tick click; `range option`: closest-handle selection. |
| Unordered ranges could produce negative selection sizes. | Programmatic endpoints are sorted; interactive crossing transfers focus to the other handle. | Main suite, `#setValue` and `range option`; style suite, selected interval sizes. |
| Disposal discarded pre-existing hidden classes and `tabindex`. | Restore recorded input state while preserving unrelated runtime classes and committed values. | Main suite, `#dispose`: class/QuerySet restoration, existing hidden state, absent tabindex, and reinitialization. |
| Stale handle/debounce references survived disposal. | Abort owned event listeners, disconnect observers, cancel reset work, dispose Tooltip, and clear owned nodes. The old debounce/drag factory was removed. | Main suite, `#dispose`, disposal from each drag/change event, rapid tooltip focus changes; form suite, `disposal`. |
| Label lookup used a `starrating-label` prefix and interpolated raw input IDs into selectors. | Native label associations are read without assigning IDs to consumer labels. | Main suite, `input attributes`: unusual IDs, explicit and wrapping labels, and preservation of label IDs. |
| Accessible naming was incomplete and orientation absent. | Handles expose orientation and accessible value text, honor explicit ARIA naming, and distinguish range endpoints. | Main suite, `input attributes`, `orientation option`, `range option`, and `valueText option`. |
| Form reset and external native changes left handles stale. | Guarded native synchronization, deferred uncanceled reset handling, and observed disabled state. | [Form suite](test/browser/slider-form.test.js), native input/change, submission, validation, disabled state, reset, and disposal groups. |

### Original integration risks — reviewed

| Risk | Current handling and verification | Remaining limit |
| --- | --- | --- |
| Touch release lacked coordinates when active `touches` became empty. | The old touch-coordinate path was replaced by Pointer Events. Main suite covers final release coordinates, additional pointer IDs, pointer cancellation, and window blur. | Touch-specific cases use synthetic Pointer Events. Physical touchscreen/pen devices have not been exercised. |
| Disposal/disable during gestures or event callbacks could continue into cleared state. | Abortable listeners and lifecycle guards; main suite covers disposal from slide/sliding/change/slid, disabling from slide/sliding, and cancellation during active input. | No unresolved failure found in these cases. |
| An always-visible tooltip could render before its anchor was attached or its value set. | Container insertion and value synchronization precede visibility. Main suite checks initial content; style suite checks body attachment and actual horizontal/vertical position. | No unresolved failure found. |
| New progress styling and RTL transform utilities could alter geometry. | Physical transforms, explicit interval geometry, and suppressed progress glow/animation. Main/style suites and the section 7 desktop/mobile visual review exercise installed UI 4 styling. | No component stylesheet is required. |
| Malformed values, missing range endpoints, duplicate ticks, and out-of-bounds highlights had no consistent contract. | Explicit validation, fallback values, sorted/deduplicated ticks with original label associations, ordered endpoints, and clipped highlight intervals. | Intentional 4.0.0 behavior changes are documented in [README](README.md#upgrading-from-3x). |

### Additional issues encountered during implementation

- **Inherited scrollbar gutters — fixed in section 4.** `scrollbar-gutter: stable` narrowed the track's positioning area. `overflow: clip` keeps the rounded track without reserving scrollbar space. The test page applies the inherited gutter rule and the style suite checks physical alignment.
- **Off-step cancellation — fixed in section 3, permanent regression added in section 8.** Re-normalizing a committed tick such as 2.5 against step 1 during cancellation would change it. Cancellation restores the normalized committed snapshot. The `tickSnapBounds option` regression verifies both the input and handle return to 2.5 after a different drag preview.
- **Overlapping form resets — fixed in section 3.** Each pending reset has its own timer so a later canceled reset cannot discard an earlier accepted reset. The form suite covers this ordering and disposal before a reset callback runs.
- **WebKit subpixel measurement — test tolerance corrected in section 5.** Label centers can differ by approximately 0.07px. Geometry checks allow subpixel rounding while retaining explicit position/size assertions.
- **Stale local test server — verification issue, resolved in section 5.** An older server was reused during development. Final rechecks used a fresh server; CI already disables server reuse. No server routes or bundle tests were retained beyond the component harness.
- **Sticky demo header — corrected in section 7.** Demo section anchors now have an offset so the header does not obscure headings.

### Outstanding release/setup items

These are verification or service-configuration limits, rather than unresolved instances of the component defects above:

- Codecov repository activation and npm trusted-publisher identity have not been verified. The prepared workflows do not configure either external service.
- Local browser runs use Node 24. The Node 20/22 jobs and hosted GitHub workflows still need a real CI run.
- Real touch/pen hardware remains untested; synthetic Pointer Events do not establish physical-device behavior.
- No package has been published. Final release acceptance remains section 9 work.

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
- Applied only the existing source cleanup required by the new lint rules: import order, JSDoc tags/types, and removal of a redundant initial assignment. Component behavior and prototype composition were left for section 3 at that stage.
- Verified a clean `npm ci`, `npm run lint`, `npm run build`, and package contents with `npm pack --dry-run`. Checked generated source maps against source contents.
- Ran local Chromium smoke checks of all four bundle variants: ESM default exports and registration use external peers; UMD adds `UI.Slider` without replacing UI, Tooltip, or fQuery.

Sections 1 and 2 were committed as **`57207ad` — Migrate package configuration and bundles to Vite** before starting the next stage.

Sections **3. JavaScript migration and public behavior** and **4. Styling and Sass** were implemented on 1 October 2026:

- Consolidated `Slider` into one class with static defaults/classes, private fields and methods, typed options/callback JSDoc, and UI 4's `node`/`options` getters. Removed `src/prototype/` and all prototype composition. `src/helpers.js` contains only numeric normalization and option validation functions; `src/index.js` now performs registration and export.
- Replaced Tooltip internal calls with public methods. Tooltip content is initialized after attaching the control and before showing it; hover, focus, and drag visibility share one trigger state.
- Replaced the old drag factory with Pointer Events and instance-owned, abortable listeners. Mouse, touch, and pen share release-coordinate handling. Cancellation and disabling restore the committed values, including snapped ticks that do not fall on a step. Disposal aborts listeners, disconnects the disabled-state observer, cancels reset callbacks, and restores the original input state. Event callbacks may dispose the component safely.
- Added native input/change synchronization without recursive change events, deferred non-canceled form reset handling, and native/fieldset disabled-state synchronization. Each pending reset is tracked independently so a later canceled reset does not discard an earlier accepted reset.
- Fixed zero-tick snapping, logarithmic conversion, bounds escaping during rounding, fixed-value ranges, unordered range endpoints, range tick clicks, and label lookup for unusual IDs and wrapping labels. Tick normalization retains label associations without mutating caller arrays. Missing/malformed values use `defaultValue`; invalid bounds, steps, modes, and dimensions are rejected before registration.
- Added accessible handle names, distinct range endpoint names, orientation, and value text. Label text is read through native label associations rather than interpolated selectors; Slider does not add IDs to consumer labels.
- Aligned handles, bars, ticks, labels, and highlights across horizontal/vertical, reversed, and RTL layouts. Horizontal RTL reverses the physical value axis once; vertical direction depends only on `reversed`. Physical transforms avoid UI's RTL-flipped `translate-middle` utility. Progress glow and animation are suppressed using UI utilities and inline geometry.
- Found and fixed an additional layout issue during verification: inherited `scrollbar-gutter: stable` narrowed the progress track's internal positioning area. The track now uses `overflow: clip`, retaining rounded clipping without reserving scrollbar space. No Slider stylesheet or Sass pipeline was necessary.
- Regenerated all ESM/UMD bundles and source maps. `npm run lint`, `npm run build`, numerical helper checks, and temporary browser checks in Chromium, Firefox, and WebKit passed. The temporary checks covered construction, keyboard changes, reset cancellation, off-step tick cancellation, all orientation/reversal/RTL geometry combinations, formatted tooltips, and disposal. A visual layout review used the installed UI 4 stylesheet. These checks do not replace section 5's permanent regression suite; touch-style Pointer Events were synthesized, not tested on physical devices.

### Behavior details for the documentation rewrite

- Initialization normalizes the native value and emits `change.ui.slider` only if that serialized value changes. `setValue` follows the same rule. Native input/change synchronization and form resets normalize without emitting an additional change event.
- Pointer down previews the value and emits `slide.ui.slider` without a detail payload. Changed drag previews emit `sliding.ui.slider`; pointer up commits, emits `change.ui.slider` if needed, then emits `slid.ui.slider`. Sliding/slid details are a number in single mode or `{ start, end }` in range mode. Cancellation/disable rolls back the preview without emitting change/slid.
- Left/Right follow the physical horizontal axis, including RTL/reversal. Up increases and Down decreases numerically; Home/End select endpoints. Ctrl+arrows navigate usable ticks; `lockToTicks` also uses adjacent ticks for ordinary arrow navigation. Empty usable tick lists fall back to bounded step movement.
- Step rounding is relative to `min`, with final bounds enforced and endpoints reachable. Locked ticks take precedence over the step grid; pointer snapping may also select off-step ticks. Programmatic reversed ranges are sorted; interactive crossing hands focus to the other handle.

Sections 3 and 4 were committed as `35cf08a` (`Migrate Slider source and styling to Frost UI 4`) before beginning sections 5 and 6.

### Sections 5 and 6

- Added the reference Playwright configuration and automatic browser fixture, a fixed-route local server, and separate main, forms, and styles suites. Public methods use class/QuerySet callback parameterization. Method groups precede input attributes, events, user interactions, and individual option groups; form groups follow SelectMenu's order. Rendered state uses locator assertions, with scalar assertions for API identity/events and direct array assertions for the public range return value.
- Added Chromium V8 coverage through Monocart, source-map resolution, HTML/LCOV reports, and the reference Codecov policy. Coverage includes all Slider source except the erased browser re-export. No light/dark test matrix was added because Slider supplies no theme styling.
- Added CI for Chromium on Node 20/22/24 and Firefox/WebKit on Node 24, with lint/build checks, OIDC Codecov upload, tracked-bundle verification, and package validation. Added the reference release-published workflow with npm provenance.
- The browser suites exercise the unminified UMD build. No separate bundle suite or ESM/minified fixture is retained; distribution smoke checks were already completed in section 2.
- Browser coverage includes numeric bounds and steps, logarithmic scales, single/range values, ticks, keyboard and pointer input, cancellation, focus and accessibility, form synchronization/reset, lifecycle cleanup, and physical layout across horizontal/vertical, reversed, and RTL modes. Touch-specific cancellation and pointer ownership use synthetic Pointer Events; physical touch devices have not been tested.

- Validation on Node 24: all 161 retained component/form/style cases passed across Chromium, Firefox, and WebKit, with affected Firefox/WebKit checks rerun after correcting stale-server reuse and subpixel label tolerances. Monocart reported 96.94% source line coverage, 97.47% statement coverage, 93.15% branch coverage, and 100% function coverage. Lint, build, unchanged tracked bundles, package dry run, and workflow YAML parsing passed.
- No additional Slider source defects were found in this stage. WebKit text measurement differed by approximately 0.07px; label alignment assertions now allow subpixel rounding.

Sections 5 and 6 were committed as `859ca25` (`Add reference-aligned browser tests, coverage, and CI`) before starting section 7. Codecov repository activation and npm trusted-publisher configuration require external service setup and have not been verified; no workflow was run on GitHub and no package was published.

### Section 7

- Rewrote README following the reference progression: badges, highlights, bundler/browser installation, usage, the complete options table, data attributes, methods, events, fQuery integration, accessibility, forms/reset, themes/RTL, upgrading from 3.x, development, and license. Documented the migrated normalization, shifted logarithmic scale, range crossing, tick precedence, preview/commit distinction, and disposal behavior against the current implementation.
- Consolidated the old light/dark, methods, and events pages into `demo/index.html` with `demo/assets/demo.js` and `demo/assets/demo.css`. The page follows the reference navbar, theme selector, hero, section headers, and card layout. Demo-only CSS provides spacing and anchor offsets; component styling still comes entirely from UI.
- Added 19 live controls covering single/range, vertical/reversed/RTL, disabled state, fractional steps and non-zero/negative bounds, logarithmic scale, ticks/snapping/locking/highlights, tooltip modes, formatting, method controls, event logging, and native form submission/reset. The form demonstrates a custom separator and disabled fieldset exclusion.
- Retired all four old demo pages and updated documentation links. CDN dependencies use compatible UI 4, fQuery 5, and core 4 major-version URLs; Slider loads from the local distribution. Verified all five referenced CDN assets returned HTTP 200.
- Validation: lint passed; a temporary Chromium demo review exercised all method controls, all pointer event types, form submission/reset/disabled state, the theme selector, and value readouts with no page errors. Reviewed desktop/mobile screenshots and checked mobile horizontal overflow. The browser review used freshly downloaded, verified CDN assets for reproducibility. No permanent demo or bundle tests were added.
- No additional component bugs were found. Added a demo anchor offset so section headings remain below the sticky navbar.

Section 7 was committed as `5d2fb34` (`Rewrite documentation and consolidate UI 4 demos`) before starting section 8. External release configuration and the final release checks remain outstanding; no package was published.

### Section 8

- Reviewed every original blocker, defect, and integration risk against the current implementation and existing regression groups. Replaced the historical to-do wording with resolutions and links to supporting tests, while retaining the original evidence.
- Added 14 regression cases within the existing main/style suites: asymmetric highlight geometry across all orientation/reversal/RTL combinations, fixed logarithmic bounds, restoring off-step committed ticks after cancellation, disabling inside slide/sliding listeners, and initial horizontal/vertical tooltip attachment and positioning. The existing linear fixed-bounds case now also exercises pointer release.
- Validation: `npm run lint` and `CI=true npm run test:browser -- --workers=4` passed. All 175 cases passed in Chromium, Firefox, and WebKit: **525 passed**, with no failures or retries. No production-source or distribution changes were needed, and no bundle tests were added.
- Recorded remaining physical-device and external release/CI setup limits separately from resolved component defects. No additional component defects were found in this audit.

Section 8's audit and regression coverage are complete. Section 9's final release acceptance and external setup remain outstanding.
