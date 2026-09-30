import $ from '@fr0st/query';
import { BaseComponent, getDataset, Tooltip } from '@fr0st/ui';
import { clampValue, getPercent, getValue, toNumber, validateOptions } from './helpers.js';

/**
 * @typedef {object} RangeHighlight
 * @property {number} start The first highlighted value.
 * @property {number} end The last highlighted value.
 * @property {string} [style] The UI background class.
 */

/**
 * @typedef {object} SliderOptions
 * @property {number} [min=0] The minimum value.
 * @property {number} [max=10] The maximum value.
 * @property {number} [defaultValue=0] The fallback for missing or invalid values.
 * @property {number} [step=1] The positive step, anchored to the minimum.
 * @property {'horizontal'|'vertical'} [orientation='horizontal'] The track orientation.
 * @property {'linear'|'logarithmic'} [scale='linear'] The value scale.
 * @property {(value: number) => string|number} [valueText] Formats a handle value.
 * @property {(start: number, end: number) => string|number} [rangeText] Formats the range tooltip.
 * @property {number} [tickSize=30] The tick diameter in pixels.
 * @property {number} [handleSize=20] The handle cross-axis size in pixels.
 * @property {number} [handleSizeRatio=.75] The handle length ratio.
 * @property {number} [sliderSize=10] The track thickness in pixels.
 * @property {number} [verticalHeight=200] The vertical track height in pixels.
 * @property {false|'show'|'always'} [tooltip='show'] The tooltip visibility mode.
 * @property {string|null} [tooltipPlacement=null] The tooltip placement override.
 * @property {string|null} [low=null] The background class below the selection.
 * @property {string} [selection='bg-primary'] The selected background class.
 * @property {string|null} [high=null] The background class above the selection.
 * @property {number[]} [ticks=[]] The tick values.
 * @property {Array<string|number>} [tickLabels=[]] Labels corresponding to the original ticks.
 * @property {number} [tickSnapBounds=0] The inclusive pointer snapping distance.
 * @property {boolean} [lockToTicks=false] Whether all value changes snap to ticks.
 * @property {RangeHighlight[]} [rangeHighlights=[]] The highlighted intervals.
 * @property {boolean} [range=false] Whether to render two handles.
 * @property {string} [rangeSeparator=','] The native input range separator.
 * @property {boolean} [reversed=false] Whether to reverse the value direction.
 * @property {number} [disabledOpacity=.5] The disabled container opacity.
 */

/**
 * Controls a single or range slider backed by a native form input.
 * @augments {BaseComponent<SliderOptions>}
 */
export default class Slider extends BaseComponent {
    static classes = {
        container: 'position-relative my-2',
        handle: 'bg-body-tertiary border rounded focus-ring position-absolute z-2 p-0',
        hide: 'visually-hidden',
        slider: 'progress position-relative',
        sliderBar: 'progress-bar position-absolute shadow-none',
        tick: 'progress rounded-circle position-absolute',
        tickFilled: 'progress-bar z-1 shadow-none',
        tickLabel: 'position-absolute p-1',
    };
    /** @type {SliderOptions} */
    static defaults = {
        min: 0,
        max: 10,
        defaultValue: 0,
        orientation: 'horizontal',
        scale: 'linear',
        valueText: (value) => value,
        rangeText: (start, end) => `${start} - ${end}`,
        tickSize: 30,
        handleSize: 20,
        handleSizeRatio: .75,
        sliderSize: 10,
        verticalHeight: 200,
        step: 1,
        tooltip: 'show',
        tooltipPlacement: null,
        low: null,
        selection: 'bg-primary',
        high: null,
        ticks: [],
        tickLabels: [],
        tickSnapBounds: 0,
        lockToTicks: false,
        rangeHighlights: [],
        range: false,
        rangeSeparator: ',',
        reversed: false,
        disabledOpacity: .5,
    };

    #active = 0;
    #barHigh;
    #barLow;
    #barSelection;
    #container;
    #drag;
    #dragController;
    #eventController;
    #handles = [];
    #hidden;
    #highlights = [];
    #label;
    #observer;
    #resetTimers = new Set();
    #slider;
    #syncing = false;
    #tabIndex;
    #ticks = [];
    #tooltip;
    #tooltipTriggers = new Set();
    #values = [];

    /**
     * Creates a Slider after validating its options without registering invalid input.
     * @param {HTMLInputElement} node The input node.
     * @param {SliderOptions} [options] The component options.
     * @throws {TypeError} When the node is not an input element.
     */
    constructor(node, options) {
        if (node?.tagName !== 'INPUT') {
            throw new TypeError('Slider must be created on an input element.');
        }
        const settings = validateOptions({ ...new.target.defaults, ...getDataset(node), ...options });
        super(node, settings);

        this.#hidden = $.hasClass(node, this.constructor.classes.hide);
        this.#tabIndex = node.getAttribute('tabindex');
        this.#label = Array.from(node.labels || [], (label) => label.textContent.trim()).join(' ');

        try {
            this.#normalizeTicks();
            this.#render();
            this.#events();
            this.#readInput();
            if (this.node) {
                this.#refreshDisabled();
            }
        } catch (error) {
            this.dispose();
            throw error;
        }
    }

    /** Disables the input and stops any active gesture. */
    disable() {
        this.node.disabled = true;
        this.#cancelDrag();
        if (this.node) {
            this.#refreshDisabled();
        }
    }

    /** @inheritdoc */
    dispose() {
        if (!this.node) {
            return;
        }

        this.#dragController?.abort();
        this.#eventController?.abort();
        this.#observer?.disconnect();
        for (const timer of this.#resetTimers) {
            clearTimeout(timer);
        }
        this.#resetTimers.clear();
        this.#drag = null;
        this.#tooltipTriggers.clear();
        this.#tooltip?.dispose();
        this.#tooltip = null;
        $.remove(this.#container);

        if (this.#hidden) {
            $.addClass(this.node, this.constructor.classes.hide);
        } else {
            $.removeClass(this.node, this.constructor.classes.hide);
        }
        if (this.#tabIndex === null) {
            $.removeAttribute(this.node, 'tabindex');
        } else {
            $.setAttribute(this.node, { tabindex: this.#tabIndex });
        }

        this.#barHigh = null;
        this.#barLow = null;
        this.#barSelection = null;
        this.#container = null;
        this.#dragController = null;
        this.#eventController = null;
        this.#handles = [];
        this.#highlights = [];
        this.#observer = null;
        this.#slider = null;
        this.#ticks = [];
        this.#values = [];
        super.dispose();
    }

    /** Enables the input and generated handles. */
    enable() {
        this.node.disabled = false;
        this.#refreshDisabled();
    }

    /**
     * Gets the current value, including an uncommitted drag preview.
     * @returns {number|number[]} The value or ordered range endpoints.
     */
    getValue() {
        return this.options.range ? [...this.#values] : this.#values[0];
    }

    /**
     * Normalizes and commits a value or ordered range, emitting change when needed.
     * @param {number} start The single value or first endpoint.
     * @param {number} [end] The second endpoint, falling back to defaultValue.
     */
    setValue(start, end) {
        this.#setValues(this.options.range ? [start, end] : [start]);
    }

    /**
     * Moves the active handle, handing focus to the other handle when crossing.
     * @param {number} value The normalized value.
     * @param {boolean} commit Whether to update the native input.
     */
    #applyValue(value, commit) {
        const values = [...this.#values];
        let active = this.#active;
        if (this.options.range) {
            if (value < values[0]) {
                active = 0;
            } else if (value > values[1]) {
                active = 1;
            }
        }
        values[active] = value;
        if (this.#active !== active) {
            this.#active = active;
            this.#handles[active].focus();
        }
        if (this.node) {
            this.#setValues(values, { commit, normalized: true });
        }
    }

    /** Rolls back a canceled gesture to the native committed value. */
    #cancelDrag() {
        if (!this.#drag) {
            return;
        }
        this.#dragController?.abort();
        this.#dragController = null;
        const values = this.#drag.values;
        this.#drag = null;
        this.#tooltipTriggers.delete('drag');
        if (this.node) {
            this.#setValues(values, { commit: false, normalized: true });
        }
    }

    /**
     * Commits the rendered values and emits one change event if the input changed.
     * @param {boolean} emit Whether to emit a change event.
     */
    #commit(emit) {
        if (this.#drag) {
            this.#drag.values = [...this.#values];
        }
        const value = this.#values.join(this.options.rangeSeparator);
        if (value === this.node.value) {
            return;
        }
        this.node.value = value;
        if (emit) {
            this.#syncing = true;
            try {
                $.triggerEvent(this.node, 'change.ui.slider');
            } finally {
                this.#syncing = false;
            }
        }
    }

    /**
     * Gets the documented drag event payload.
     * @returns {number|{start: number, end: number}} The preview or final values.
     */
    #detail() {
        return this.options.range ?
            { start: this.#values[0], end: this.#values[1] } :
            this.#values[0];
    }

    /**
     * Begins a pointer gesture and installs removable window handlers.
     * @param {PointerEvent} event The initiating event.
     */
    #down(event) {
        if (!this.node || this.#drag || event.button !== 0 || event.isPrimary === false || $.is(this.node, ':disabled')) {
            return;
        }
        const target = event.target.closest('[role="slider"], [data-ui-value]') ||
            (this.#slider.contains(event.target) ? this.#slider : null);
        if (!target || !this.#container.contains(target)) {
            return;
        }
        event.preventDefault();
        const vertical = this.options.orientation === 'vertical';
        const coordinate = vertical ? event.clientY : event.clientX;
        const handleIndex = this.#handles.indexOf(target);
        this.#active = handleIndex < 0 ? this.#handles.reduce((closest, handle, index) => {
            const rect = handle.getBoundingClientRect();
            const previous = this.#handles[closest].getBoundingClientRect();
            const center = vertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
            const previousCenter = vertical ? previous.top + previous.height / 2 : previous.left + previous.width / 2;
            return Math.abs(coordinate - center) < Math.abs(coordinate - previousCenter) ? index : closest;
        }, 0) : handleIndex;
        this.#handles[this.#active].focus();
        if (!this.node || $.is(this.node, ':disabled')) {
            return;
        }

        const window = this.node.ownerDocument.defaultView;
        this.#drag = {
            id: event.pointerId,
            values: [...this.#values],
            x: event.clientX,
            y: event.clientY,
            moved: false,
            tick: target.hasAttribute('data-ui-value') ? Number(target.dataset.uiValue) : null,
        };
        this.#dragController = new window.AbortController();
        const options = { signal: this.#dragController.signal };
        window.addEventListener('pointermove', (e) => this.#move(e), options);
        window.addEventListener('pointerup', (e) => this.#up(e), options);
        window.addEventListener('pointercancel', (e) => {
            if (e.pointerId === this.#drag?.id) {
                this.#cancelDrag();
            }
        }, options);
        window.addEventListener('blur', () => this.#cancelDrag(), options);
        this.#tooltipTriggers.add('drag');
        this.#applyValue(this.#pointerValue(event), false);
        if (this.node && this.#drag) {
            $.triggerEvent(this.node, 'slide.ui.slider');
        }
    }

    /** Attaches native input, form, focus, keyboard, and pointer handlers. */
    #events() {
        const window = this.node.ownerDocument.defaultView;
        this.#eventController = new window.AbortController();
        const options = { signal: this.#eventController.signal };
        this.node.addEventListener('focus', () => this.#handles[0]?.focus(), options);
        const synchronize = () => {
            if (!this.#syncing && this.node) {
                this.#cancelDrag();
                this.#readInput(false);
                if (this.node) {
                    this.#refreshDisabled();
                }
            }
        };
        this.node.addEventListener('input', synchronize, options);
        this.node.addEventListener('change', synchronize, options);
        this.#observer = new window.MutationObserver(() => {
            if (this.node) {
                if ($.is(this.node, ':disabled')) {
                    this.#cancelDrag();
                }
                if (this.node) {
                    this.#refreshDisabled();
                }
            }
        });
        this.#observer.observe(this.node, { attributes: true, attributeFilter: ['disabled'] });
        for (const fieldset of $.parents(this.node, 'fieldset')) {
            this.#observer.observe(fieldset, { attributes: true, attributeFilter: ['disabled'] });
        }
        this.node.form?.addEventListener('reset', (event) => {
            const timer = setTimeout(() => {
                this.#resetTimers.delete(timer);
                if (this.node && !event.defaultPrevented) {
                    synchronize();
                }
            }, 0);
            this.#resetTimers.add(timer);
        }, options);
        this.#container.addEventListener('pointerdown', (event) => this.#down(event), options);
        this.#container.addEventListener('keydown', (event) => this.#key(event), options);
        this.#container.addEventListener('focusin', (event) => {
            const active = this.#handles.indexOf(event.target);
            if (active >= 0) {
                this.#active = active;
                this.#tooltipTriggers.add('focus');
                this.#refreshTooltip();
            }
        }, options);
        this.#container.addEventListener('focusout', (event) => {
            if (!this.#container.contains(event.relatedTarget)) {
                this.#tooltipTriggers.delete('focus');
                this.#refreshTooltip();
            }
        }, options);
        this.#container.addEventListener('pointerenter', (event) => {
            if (event.pointerType !== 'touch') {
                this.#tooltipTriggers.add('hover');
                this.#refreshTooltip();
            }
        }, options);
        this.#container.addEventListener('pointerleave', () => {
            this.#tooltipTriggers.delete('hover');
            this.#refreshTooltip();
        }, options);
    }

    /**
     * Checks the effective physical reversal, including horizontal RTL.
     * @returns {boolean} Whether percentages run backwards on screen.
     */
    #isReversed() {
        const rtl = this.options.orientation === 'horizontal' && $.css(this.#container, 'direction') === 'rtl';
        return Boolean(this.options.reversed) !== rtl;
    }

    /**
     * Handles arrows, tick navigation, and endpoints.
     * @param {KeyboardEvent} event The keyboard event.
     */
    #key(event) {
        if (!this.node || !this.#handles.includes(event.target) || $.is(this.node, ':disabled')) {
            return;
        }
        const original = this.#values[this.#active];
        let value;
        let direction;
        switch (event.key) {
            case 'Home':
                value = this.options.min;
                break;
            case 'End':
                value = this.options.max;
                break;
            case 'ArrowLeft':
            case 'ArrowRight':
                direction = event.key === 'ArrowRight' ? 1 : -1;
                if (this.options.orientation === 'horizontal' && this.#isReversed()) {
                    direction *= -1;
                }
                break;
            case 'ArrowUp':
            case 'ArrowDown':
                direction = event.key === 'ArrowUp' ? 1 : -1;
                break;
            default:
                return;
        }
        event.preventDefault();
        if (direction) {
            if (event.ctrlKey || this.options.lockToTicks) {
                const ticks = direction > 0 ? this.#ticks : this.#ticks.slice().reverse();
                value = ticks.find((tick) => direction * (tick.value - original) > 0)?.value;
                value ??= direction > 0 ? this.options.max : this.options.min;
                if (!ticks.length && !event.ctrlKey) {
                    value = original + direction * this.options.step;
                }
            } else {
                value = original + direction * this.options.step;
            }
        }
        this.#applyValue(this.#normalize(value), true);
    }

    /**
     * Updates a pointer preview, emitting sliding only for a changed value.
     * @param {PointerEvent} event The move event.
     */
    #move(event) {
        if (!this.#drag || event.pointerId !== this.#drag.id) {
            return;
        }
        if ($.is(this.node, ':disabled')) {
            this.#cancelDrag();
            return;
        }
        this.#drag.moved ||= event.clientX !== this.#drag.x || event.clientY !== this.#drag.y;
        const previous = this.#values.join(',');
        this.#applyValue(this.#pointerValue(event), false);
        if (this.node && this.#drag && previous !== this.#values.join(',')) {
            $.triggerEvent(this.node, 'sliding.ui.slider', { detail: this.#detail() });
        }
    }

    /**
     * Normalizes a value and optionally snaps to the nearest usable tick.
     * @param {*} value The input value.
     * @param {boolean} [snap=false] Whether proximity snapping is enabled.
     * @returns {number} The normalized value.
     */
    #normalize(value, snap = false) {
        const { min, max, step, defaultValue, lockToTicks, tickSnapBounds } = this.options;
        const raw = Math.max(min, Math.min(max, toNumber(value, defaultValue)));
        if (this.#ticks.length && (lockToTicks || snap)) {
            const closest = this.#ticks.reduce((best, tick) =>
                Math.abs(tick.value - raw) < Math.abs(best.value - raw) ? tick : best,
            );
            if (lockToTicks || Math.abs(closest.value - raw) <= tickSnapBounds) {
                return closest.value;
            }
        }
        return clampValue(raw, min, max, step, defaultValue);
    }

    /** Copies, filters, and sorts ticks while preserving their original labels. */
    #normalizeTicks() {
        const { min, max, ticks, tickLabels, rangeHighlights } = this.options;
        const seen = new Set();
        for (const [index, input] of (Array.isArray(ticks) ? ticks : []).entries()) {
            const value = toNumber(input, NaN);
            if (!Number.isFinite(value) || value < min || value > max || seen.has(value)) {
                continue;
            }
            seen.add(value);
            this.#ticks.push({ value, label: tickLabels?.[index], node: null });
        }
        this.#ticks.sort((a, b) => a.value - b.value);
        for (const range of Array.isArray(rangeHighlights) ? rangeHighlights : []) {
            const start = toNumber(range?.start, NaN);
            const end = toNumber(range?.end, NaN);
            if (Number.isFinite(start) && Number.isFinite(end)) {
                this.#highlights.push({
                    start: Math.max(min, Math.min(max, Math.min(start, end))),
                    end: Math.max(min, Math.min(max, Math.max(start, end))),
                    style: range.style,
                });
            }
        }
    }

    /**
     * Converts a value to its physical track percentage.
     * @param {number} value The bounded value.
     * @returns {number} The physical percentage.
     */
    #percent(value) {
        const percent = getPercent(value, this.options.min, this.options.max, this.options.scale === 'logarithmic');
        return this.#isReversed() ? 100 - percent : percent;
    }

    /**
     * Resolves a pointer or tick click to a normalized value.
     * @param {PointerEvent} event The pointer event, including release coordinates.
     * @returns {number} The normalized value.
     */
    #pointerValue(event) {
        if (this.#drag.tick !== null && !this.#drag.moved && event.clientX === this.#drag.x && event.clientY === this.#drag.y) {
            return this.#normalize(this.#drag.tick, true);
        }
        const rect = this.#slider.getBoundingClientRect();
        const vertical = this.options.orientation === 'vertical';
        const length = vertical ? rect.height : rect.width;
        if (!length) {
            return this.#values[this.#active];
        }
        let percent = 100 * ((vertical ? event.clientY - rect.top : event.clientX - rect.left) / length);
        if (this.#isReversed()) {
            percent = 100 - percent;
        }
        return this.#normalize(getValue(percent, this.options.min, this.options.max, this.options.scale === 'logarithmic'), true);
    }

    /**
     * Positions a colored interval with the same physical coordinates as handles.
     * @param {HTMLElement} bar The interval element.
     * @param {number} start The first value.
     * @param {number} end The last value.
     */
    #positionBar(bar, start, end) {
        const a = this.#percent(start);
        const b = this.#percent(end);
        const vertical = this.options.orientation === 'vertical';
        $.setStyle(bar, {
            [vertical ? 'top' : 'left']: `${Math.min(a, b)}%`,
            [vertical ? 'height' : 'width']: `${Math.abs(b - a)}%`,
        });
    }

    /**
     * Reads native values after initialization, native events, or a form reset.
     * @param {boolean} [emit=true] Whether normalization should emit change.
     */
    #readInput(emit = true) {
        const values = this.options.range ? this.node.value.split(this.options.rangeSeparator, 2) : [this.node.value];
        this.#setValues(this.options.range ? [values[0], values[1]] : values, { emit });
    }

    /** Updates disabled presentation and tooltip visibility. */
    #refreshDisabled() {
        const disabled = $.is(this.node, ':disabled');
        $.setStyle(this.#container, { opacity: disabled ? this.options.disabledOpacity : '' });
        for (const handle of this.#handles) {
            handle.disabled = disabled;
            handle.setAttribute('aria-disabled', String(disabled));
        }
        this.#refreshTooltip();
    }

    /** Updates the public Tooltip using the combined hover, focus, and drag state. */
    #refreshTooltip() {
        if (!this.node || !this.#tooltip || !this.#values.length) {
            return;
        }
        if ($.is(this.node, ':disabled')) {
            this.#tooltip.hide();
        } else if (this.options.tooltip === 'always' || this.#tooltipTriggers.size) {
            this.#tooltip.show();
        } else {
            this.#tooltip.hide();
        }
    }

    /** Renders the UI utility-based track, intervals, ticks, and handles. */
    #render() {
        const vertical = this.options.orientation === 'vertical';
        this.#container = $.create('div', {
            class: this.constructor.classes.container,
            style: {
                width: vertical ? `${this.options.sliderSize}px` : '100%',
                height: vertical ? `${this.options.verticalHeight}px` : `${this.options.sliderSize}px`,
                touchAction: 'none',
            },
        });
        if (this.node.hasAttribute('dir')) {
            this.#container.setAttribute('dir', this.node.getAttribute('dir'));
        }
        this.#slider = $.create('div', {
            class: this.constructor.classes.slider,
            style: { width: '100%', height: '100%', overflow: 'clip' },
        });
        $.append(this.#container, this.#slider);
        // Insert before measuring direction or creating a positioned Tooltip.
        $.before(this.node, this.#container);
        this.#barLow = this.#renderBar(this.options.low);
        this.#barSelection = this.#renderBar(this.options.selection);
        this.#barHigh = this.#renderBar(this.options.high);
        for (const range of this.#highlights) {
            const bar = this.#renderBar(range.style);
            this.#positionBar(bar, range.start, range.end);
        }
        this.#renderTicks();
        for (let index = 0; index < (this.options.range ? 2 : 1); index++) {
            const handle = $.create('button', {
                class: this.constructor.classes.handle,
                attributes: {
                    'type': 'button',
                    'role': 'slider',
                    'aria-orientation': this.options.orientation,
                    'aria-valuemin': this.options.min,
                    'aria-valuemax': this.options.max,
                },
                style: {
                    width: `${this.options.handleSize * (vertical ? 1 : this.options.handleSizeRatio)}px`,
                    height: `${this.options.handleSize * (vertical ? this.options.handleSizeRatio : 1)}px`,
                    [vertical ? 'left' : 'top']: '50%',
                    transform: 'translate(-50%, -50%)',
                },
            });
            const labelledBy = this.node.getAttribute('aria-labelledby');
            const explicit = this.node.getAttribute('aria-label');
            const label = labelledBy ? labelledBy.split(/\s+/).map((id) => this.node.ownerDocument.getElementById(id)?.textContent.trim() || '').join(' ') : explicit || this.#label;
            if (!this.options.range && labelledBy) {
                handle.setAttribute('aria-labelledby', labelledBy);
            } else {
                handle.setAttribute('aria-label', this.options.range ? `${label || 'Range'} ${index ? 'end' : 'start'}` : label || 'Value');
            }
            for (const attribute of ['aria-describedby', 'aria-invalid']) {
                if (this.node.hasAttribute(attribute)) {
                    handle.setAttribute(attribute, this.node.getAttribute(attribute));
                }
            }
            $.append(this.#container, handle);
            this.#handles.push(handle);
        }
        if (this.options.tooltip) {
            this.#tooltip = Tooltip.init(this.options.range ? this.#barSelection : this.#handles[0], {
                appendTo: this.node.ownerDocument.body,
                trigger: '',
                placement: this.options.tooltipPlacement || (vertical ? 'right' : 'top'),
                spacing: this.options.range ? (this.options.handleSize - this.options.sliderSize) / 2 : 0,
            });
        }
        $.addClass(this.node, this.constructor.classes.hide);
        this.node.setAttribute('tabindex', '-1');
    }

    /**
     * Creates a UI progress interval without inherited progress animation or glow.
     * @param {string|null} style The background class.
     * @returns {HTMLElement} The interval node.
     */
    #renderBar(style) {
        const bar = $.create('div', {
            class: this.constructor.classes.sliderBar,
            style: {
                backgroundColor: 'transparent',
                transition: 'none',
                [this.options.orientation === 'vertical' ? 'width' : 'height']: '100%',
            },
        });
        if (style) {
            $.addClass(bar, style);
        }
        $.append(this.#slider, bar);
        return bar;
    }

    /** Renders normalized ticks and matching labels at physical track positions. */
    #renderTicks() {
        const vertical = this.options.orientation === 'vertical';
        for (const tick of this.#ticks) {
            tick.node = $.create('div', {
                class: this.constructor.classes.tick,
                dataset: { uiValue: tick.value },
                style: {
                    width: `${this.options.tickSize}px`,
                    height: `${this.options.tickSize}px`,
                    [vertical ? 'left' : 'top']: '50%',
                    [vertical ? 'top' : 'left']: `${this.#percent(tick.value)}%`,
                    transform: 'translate(-50%, -50%)',
                },
            });
            $.append(this.#container, tick.node);
            if (tick.label !== null && tick.label !== undefined && tick.label !== '') {
                const label = $.create('small', {
                    class: this.constructor.classes.tickLabel,
                    text: `${tick.label}`,
                    style: {
                        [vertical ? 'left' : 'top']: `${(this.options.sliderSize + this.options.tickSize) / 2}px`,
                        [vertical ? 'top' : 'left']: `${this.#percent(tick.value)}%`,
                        transform: vertical ? 'translateY(-50%)' : 'translateX(-50%)',
                    },
                });
                $.append(this.#container, label);
            }
        }
    }

    /**
     * Renders normalized values and optionally commits them to the original input.
     * @param {Array<*>} values The proposed endpoint values.
     * @param {object} [options] The update options.
     * @param {boolean} [options.commit=true] Whether to update the native input.
     * @param {boolean} [options.emit=true] Whether to emit change on commit.
     * @param {boolean} [options.normalized=false] Whether values were already normalized.
     */
    #setValues(values, { commit = true, emit = true, normalized = false } = {}) {
        this.#values = values.map((value) => normalized ? value : this.#normalize(value)).sort((a, b) => a - b);
        const start = this.options.range ? this.#values[0] : this.options.min;
        const end = this.#values[this.#values.length - 1];
        this.#positionBar(this.#barLow, this.options.min, start);
        this.#positionBar(this.#barSelection, start, end);
        this.#positionBar(this.#barHigh, end, this.options.max);
        for (const [index, value] of this.#values.entries()) {
            const text = this.options.valueText.call(this, value);
            if (!this.node) {
                return;
            }
            $.setAttribute(this.#handles[index], { 'aria-valuenow': value, 'aria-valuetext': `${text}` });
            $.setStyle(this.#handles[index], { [this.options.orientation === 'vertical' ? 'top' : 'left']: `${this.#percent(value)}%` });
            if (!this.options.range) {
                $.setDataset(this.#handles[index], { uiTitle: text });
            }
        }
        if (this.options.range && this.#tooltip) {
            const text = this.options.rangeText.call(this, ...this.#values);
            if (!this.node) {
                return;
            }
            $.setDataset(this.#barSelection, { uiTitle: text });
        }
        for (const tick of this.#ticks) {
            const highlight = this.#highlights.find((range) => tick.value >= range.start && tick.value <= range.end);
            const selected = tick.value >= start && tick.value <= end;
            let style = tick.value < start ? this.options.low : this.options.high;
            if (selected) {
                style = this.options.selection;
            }
            if (highlight) {
                style = highlight.style;
            }
            tick.node.className = this.constructor.classes.tick;
            if (selected) {
                $.addClass(tick.node, this.constructor.classes.tickFilled);
            }
            if (style) {
                $.addClass(tick.node, style);
            }
        }
        this.#tooltip?.refresh();
        this.#refreshTooltip();
        if (this.node && commit) {
            this.#commit(emit);
        }
    }

    /**
     * Commits the final pointer position, removes gesture listeners, and emits slid.
     * @param {PointerEvent} event The release event.
     */
    #up(event) {
        if (!this.#drag || event.pointerId !== this.#drag.id) {
            return;
        }
        if ($.is(this.node, ':disabled')) {
            this.#cancelDrag();
            return;
        }
        const value = this.#pointerValue(event);
        this.#dragController.abort();
        this.#dragController = null;
        this.#drag = null;
        this.#tooltipTriggers.delete('drag');
        this.#applyValue(value, true);
        if (this.node) {
            this.#handles[this.#active].focus();
            if (this.node) {
                $.triggerEvent(this.node, 'slid.ui.slider', { detail: this.#detail() });
            }
        }
    }
}
