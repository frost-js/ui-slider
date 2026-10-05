(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ?  factory(exports, require('@fr0st/ui'), require('@fr0st/query')) :
  typeof define === 'function' && define.amd ? define(['exports', '@fr0st/ui', '@fr0st/query'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.UI = global.UI || {}), global.UI,global.fQuery));
})(this, function(exports, _fr0st_ui, _fr0st_query) {
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
//#region \0rolldown/runtime.js
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) {
					__defProp(to, key, {
						get: ((k) => from[k]).bind(null, key),
						enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
					});
				}
			}
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));

//#endregion
_fr0st_query = __toESM(_fr0st_query, 1);

//#region src/helpers.js
/**
	* Rounds a bounded value to a min-anchored step while keeping endpoints reachable.
	* @param {number} value The bounded value.
	* @param {number} min The lower bound.
	* @param {number} max The upper bound.
	* @param {number} step The positive step size.
	* @returns {number} The bounded value.
	*/
	function clampValue(value, min, max, step) {
		if (value === min || value === max) return value;
		const rounded = min + Math.round((value - min) / step) * step;
		if (!Number.isFinite(rounded)) return value;
		return Math.max(min, Math.min(max, Number.isInteger(rounded) ? rounded : Number(rounded.toPrecision(15))));
	}
	/**
	* Converts a value to a percentage, including fixed and shifted logarithmic ranges.
	* @param {number} value The bounded value.
	* @param {number} min The lower bound.
	* @param {number} max The upper bound.
	* @param {boolean} logarithmic Whether to use logarithmic scaling.
	* @returns {number} The percentage.
	*/
	function getPercent(value, min, max, logarithmic) {
		if (min === max) return 0;
		return 100 * (logarithmic ? Math.log1p(value - min) / Math.log1p(max - min) : (value - min) / (max - min));
	}
	/**
	* Converts a percentage back to a value.
	* @param {number} percent The percentage.
	* @param {number} min The lower bound.
	* @param {number} max The upper bound.
	* @param {boolean} logarithmic Whether to use logarithmic scaling.
	* @returns {number} The bounded value.
	*/
	function getValue(percent, min, max, logarithmic) {
		percent = Math.max(0, Math.min(100, percent));
		if (percent === 0 || min === max) return min;
		if (percent === 100) return max;
		return min + (logarithmic ? Math.expm1(Math.log1p(max - min) * percent / 100) : (max - min) * percent / 100);
	}
	/**
	* Parses a finite numeric value, using a fallback for missing or invalid input.
	* @param {*} value The value to parse.
	* @param {number} fallback The fallback value.
	* @returns {number} The parsed value or fallback.
	*/
	function parseNumber(value, fallback) {
		if (!["number", "string"].includes(typeof value) || `${value}`.trim() === "") return fallback;
		const number = Number(value);
		return Number.isFinite(number) ? number : fallback;
	}
	/**
	* Parses a positive finite number, using a fallback for invalid input.
	* @param {*} value The value to parse.
	* @param {number} fallback The positive fallback value.
	* @returns {number} The positive number or fallback.
	*/
	function parsePositiveNumber(value, fallback) {
		const number = parseNumber(value, fallback);
		return number > 0 ? number : fallback;
	}

//#endregion
//#region src/slider.js
	var window = _fr0st_query.default.getWindow();
	var ariaAttributes = [
		"aria-describedby",
		"aria-errormessage",
		"aria-invalid",
		"aria-required"
	];
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
	var Slider = class extends _fr0st_ui.BaseComponent {
		static classes = {
			container: "position-relative my-2",
			handle: "bg-body-tertiary border rounded focus-ring position-absolute z-2 p-0",
			hide: "visually-hidden",
			slider: "progress position-relative",
			sliderBar: "progress-bar position-absolute shadow-none",
			tick: "progress rounded-circle position-absolute",
			tickFilled: "progress-bar z-1 shadow-none",
			tickLabel: "position-absolute p-1"
		};
		/** @type {SliderOptions} */
		static defaults = {
			min: 0,
			max: 10,
			defaultValue: 0,
			orientation: "horizontal",
			scale: "linear",
			valueText: (value) => value,
			rangeText: (start, end) => `${start} - ${end}`,
			tickSize: 30,
			handleSize: 20,
			handleSizeRatio: .75,
			sliderSize: 10,
			verticalHeight: 200,
			step: 1,
			tooltip: "show",
			tooltipPlacement: null,
			low: null,
			selection: "bg-primary",
			high: null,
			ticks: [],
			tickLabels: [],
			tickSnapBounds: 0,
			lockToTicks: false,
			rangeHighlights: [],
			range: false,
			rangeSeparator: ",",
			reversed: false,
			disabledOpacity: .5
		};
		#active = 0;
		#ariaHidden;
		#barHigh;
		#barLow;
		#barSelection;
		#blurHandler;
		#container;
		#defaultValue;
		#disabledOpacity;
		#drag;
		#form;
		#handles = [];
		#handleSize;
		#handleSizeRatio;
		#hidden;
		#highlights = [];
		#label;
		#max;
		#min;
		#observer;
		#rangeSeparator;
		#resetHandler;
		#resetTimers = /* @__PURE__ */ new Set();
		#slider;
		#sliderSize;
		#step;
		#synchronize;
		#tabIndex;
		#ticks = [];
		#tickSize;
		#tickSnapBounds;
		#tooltip;
		#tooltipId;
		#tooltipTriggers = /* @__PURE__ */ new Set();
		#values = [];
		#verticalHeight;
		/**
		* Creates a Slider.
		* @param {HTMLInputElement} node The input node.
		* @param {SliderOptions} [options] The component options.
		* @throws {TypeError} When the node is not an input element.
		*/
		constructor(node, options) {
			if (!_fr0st_query.default.is(node, "input")) throw new TypeError("Slider must be created on an input element.");
			super(node, options);
			try {
				this.#hidden = _fr0st_query.default.hasClass(node, this.constructor.classes.hide);
				this.#tabIndex = _fr0st_query.default.getAttribute(node, "tabindex");
				this.#ariaHidden = _fr0st_query.default.getAttribute(node, "aria-hidden");
				const labels = _fr0st_query.default.getProperty(node, "labels") || [];
				this.#label = [...labels].map((label) => _fr0st_query.default.getText(label).trim()).join(" ");
				const defaults = this.constructor.defaults;
				this.#min = parseNumber(this.options.min, defaults.min);
				this.#max = Math.max(this.#min, parseNumber(this.options.max, defaults.max));
				if (!Number.isFinite(this.#max - this.#min)) this.#max = this.#min;
				this.#step = parsePositiveNumber(this.options.step, defaults.step);
				this.#defaultValue = parseNumber(this.options.defaultValue, this.#min);
				this.#tickSize = parsePositiveNumber(this.options.tickSize, defaults.tickSize);
				this.#handleSize = parsePositiveNumber(this.options.handleSize, defaults.handleSize);
				this.#handleSizeRatio = parsePositiveNumber(this.options.handleSizeRatio, defaults.handleSizeRatio);
				this.#sliderSize = parsePositiveNumber(this.options.sliderSize, defaults.sliderSize);
				this.#verticalHeight = parsePositiveNumber(this.options.verticalHeight, defaults.verticalHeight);
				this.#tickSnapBounds = Math.max(0, parseNumber(this.options.tickSnapBounds, defaults.tickSnapBounds));
				this.#disabledOpacity = _fr0st_query.default._clamp(parseNumber(this.options.disabledOpacity, defaults.disabledOpacity), 0, 1);
				this.#rangeSeparator = typeof this.options.rangeSeparator === "string" && this.options.rangeSeparator.length ? this.options.rangeSeparator : defaults.rangeSeparator;
				const focused = _fr0st_query.default.is(node, ":focus");
				const { ticks, tickLabels, rangeHighlights } = this.options;
				const min = this.#min;
				const max = this.#max;
				const seen = /* @__PURE__ */ new Set();
				for (const [index, input] of (Array.isArray(ticks) ? ticks : []).entries()) {
					const value = parseNumber(input, NaN);
					if (!Number.isFinite(value) || value < min || value > max || seen.has(value)) continue;
					seen.add(value);
					this.#ticks.push({
						value,
						label: tickLabels?.[index],
						node: null
					});
				}
				this.#ticks.sort((a, b) => a.value - b.value);
				for (const range of Array.isArray(rangeHighlights) ? rangeHighlights : []) {
					const start = parseNumber(range?.start, NaN);
					const end = parseNumber(range?.end, NaN);
					if (Number.isFinite(start) && Number.isFinite(end)) this.#highlights.push({
						start: _fr0st_query.default._clamp(Math.min(start, end), min, max),
						end: _fr0st_query.default._clamp(Math.max(start, end), min, max),
						style: range.style
					});
				}
				this.#render();
				this.#events();
				this.#refresh();
				if (this.node) this.#refreshState();
				if (this.node && focused) _fr0st_query.default.focus(this.#handles[0]);
			} catch (error) {
				this.dispose();
				throw error;
			}
		}
		/**
		* Disables the input and stops any active gesture.
		*/
		disable() {
			_fr0st_query.default.setProperty(this.node, { disabled: true });
			this.#refreshState();
		}
		/** @inheritdoc */
		dispose() {
			if (!this.node) return;
			if (this.#blurHandler) _fr0st_query.default.removeEvent(window, "blur.ui.slider", this.#blurHandler);
			_fr0st_query.default.removeEvent(this.node, "focus.ui.slider");
			if (this.#synchronize) _fr0st_query.default.removeEvent(this.node, "input.ui.slider change.ui.slider", this.#synchronize);
			if (this.#form && this.#resetHandler) _fr0st_query.default.removeEvent(this.#form, "reset.ui.slider", this.#resetHandler);
			this.#observer?.disconnect();
			for (const timer of this.#resetTimers) clearTimeout(timer);
			this.#resetTimers.clear();
			this.#drag = null;
			this.#tooltipTriggers.clear();
			this.#tooltip?.dispose();
			this.#tooltip = null;
			this.#tooltipId = null;
			_fr0st_query.default.remove(this.#container);
			if (this.#hidden) _fr0st_query.default.addClass(this.node, this.constructor.classes.hide);
			else _fr0st_query.default.removeClass(this.node, this.constructor.classes.hide);
			if (this.#ariaHidden === null) _fr0st_query.default.removeAttribute(this.node, "aria-hidden");
			else _fr0st_query.default.setAttribute(this.node, { "aria-hidden": this.#ariaHidden });
			if (this.#tabIndex === null) _fr0st_query.default.removeAttribute(this.node, "tabindex");
			else _fr0st_query.default.setAttribute(this.node, { tabindex: this.#tabIndex });
			this.#barHigh = null;
			this.#barLow = null;
			this.#barSelection = null;
			this.#blurHandler = null;
			this.#container = null;
			this.#form = null;
			this.#resetHandler = null;
			this.#synchronize = null;
			this.#handles = [];
			this.#highlights = [];
			this.#observer = null;
			this.#slider = null;
			this.#ticks = [];
			this.#values = [];
			super.dispose();
		}
		/**
		* Enables the input and generated handles.
		*/
		enable() {
			_fr0st_query.default.setProperty(this.node, { disabled: false });
			this.#refreshState();
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
		* Rolls back a canceled gesture to the native committed value.
		*/
		#cancelDrag() {
			if (!this.#drag) return;
			const values = this.#drag.values;
			this.#drag = null;
			this.#tooltipTriggers.delete("drag");
			this.#setValues(values, {
				commit: false,
				normalized: true
			});
		}
		/**
		* Attaches input, form, focus, keyboard, mouse, and touch handlers.
		*/
		#events() {
			_fr0st_query.default.addEvent(this.node, "focus.ui.slider", () => {
				_fr0st_query.default.focus(this.#handles[0]);
			});
			this.#synchronize = (event) => {
				if (!event?.skipUpdate && this.node) {
					this.#drag = null;
					this.#tooltipTriggers.delete("drag");
					this.#refresh(false);
					if (this.node) this.#refreshState();
				}
			};
			_fr0st_query.default.addEvent(this.node, "input.ui.slider change.ui.slider", this.#synchronize);
			this.#observer = new MutationObserver(() => {
				if (this.node) this.#refreshState();
			});
			this.#observer.observe(this.node, {
				attributes: true,
				attributeFilter: [
					"disabled",
					"required",
					"readonly",
					...ariaAttributes
				]
			});
			for (const fieldset of _fr0st_query.default.parents(this.node, "fieldset")) this.#observer.observe(fieldset, {
				attributes: true,
				attributeFilter: ["disabled"]
			});
			this.#form = _fr0st_query.default.getProperty(this.node, "form");
			this.#resetHandler = (event) => {
				const timer = setTimeout(() => {
					this.#resetTimers.delete(timer);
					if (this.node && !event.defaultPrevented) this.#synchronize();
				}, 0);
				this.#resetTimers.add(timer);
			};
			if (this.#form) _fr0st_query.default.addEvent(this.#form, "reset.ui.slider", this.#resetHandler);
			const downEvent = (event) => {
				if (!this.node || this.#drag || event.type === "mousedown" && event.button !== 0 || _fr0st_query.default.is(this.node, ":disabled") || _fr0st_query.default.getProperty(this.node, "readOnly")) return false;
				const selector = "[role=\"slider\"], [data-ui-value]";
				const target = (_fr0st_query.default.is(event.target, selector) ? event.target : _fr0st_query.default.closest(event.target, selector)[0]) || (event.target === this.#slider || _fr0st_query.default.hasDescendent(this.#slider, event.target) ? this.#slider : null);
				if (!target || !_fr0st_query.default.hasDescendent(this.#container, target)) return false;
				event.preventDefault();
				const { x, y } = (0, _fr0st_ui.getPosition)(event);
				if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
				const vertical = this.options.orientation === "vertical";
				const coordinate = vertical ? y : x;
				let active = this.#handles.indexOf(target);
				if (active < 0) {
					let closestDistance = Infinity;
					for (const [index, handle] of this.#handles.entries()) {
						const rect = _fr0st_query.default.rect(handle, { offset: true });
						const center = vertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
						const distance = Math.abs(coordinate - center);
						if (distance < closestDistance) {
							closestDistance = distance;
							active = index;
						}
					}
				}
				this.#active = active;
				_fr0st_query.default.focus(this.#handles[this.#active]);
				if (!this.node || _fr0st_query.default.is(this.node, ":disabled") || _fr0st_query.default.getProperty(this.node, "readOnly")) return false;
				this.#drag = {
					values: [...this.#values],
					x,
					y,
					moved: false,
					tick: _fr0st_query.default.hasAttribute(target, "data-ui-value") ? Number(_fr0st_query.default.getDataset(target, "uiValue")) : null
				};
				this.#tooltipTriggers.add("drag");
				this.#setHandleValue(this.#getEventValue(event), false);
				if (this.#drag) _fr0st_query.default.triggerEvent(this.node, "slide.ui.slider");
				if (!this.#drag) return false;
			};
			const moveEvent = (event) => {
				if (!this.#drag) return;
				if (_fr0st_query.default.is(this.node, ":disabled") || _fr0st_query.default.getProperty(this.node, "readOnly")) {
					this.#cancelDrag();
					return;
				}
				if (event.cancelable) event.preventDefault();
				const { x, y } = (0, _fr0st_ui.getPosition)(event);
				this.#drag.moved ||= x !== this.#drag.x || y !== this.#drag.y;
				const previous = this.#values;
				this.#setHandleValue(this.#getEventValue(event), false);
				if (this.#drag && previous.some((value, index) => value !== this.#values[index])) _fr0st_query.default.triggerEvent(this.node, "sliding.ui.slider", { detail: this.options.range ? {
					start: this.#values[0],
					end: this.#values[1]
				} : this.#values[0] });
			};
			const upEvent = (event) => {
				if (event.type === "touchcancel") {
					this.#cancelDrag();
					return;
				}
				if (!this.#drag) return;
				if (_fr0st_query.default.is(this.node, ":disabled") || _fr0st_query.default.getProperty(this.node, "readOnly")) {
					this.#cancelDrag();
					return;
				}
				const value = this.#getEventValue(event);
				this.#setHandleValue(value, true);
				if (!this.#drag) return;
				this.#drag = null;
				this.#tooltipTriggers.delete("drag");
				this.#refreshTooltip();
				if (this.node) {
					_fr0st_query.default.focus(this.#handles[this.#active]);
					if (this.node) _fr0st_query.default.triggerEvent(this.node, "slid.ui.slider", { detail: this.options.range ? {
						start: this.#values[0],
						end: this.#values[1]
					} : this.#values[0] });
				}
			};
			const dragEvent = _fr0st_query.default.mouseDragFactory(downEvent, moveEvent, upEvent, {
				debounce: false,
				passive: false,
				preventDefault: false
			});
			_fr0st_query.default.addEvent(this.#container, "mousedown.ui.slider touchstart.ui.slider", dragEvent);
			this.#blurHandler = () => this.#cancelDrag();
			_fr0st_query.default.addEvent(window, "blur.ui.slider", this.#blurHandler);
			_fr0st_query.default.addEvent(this.#container, "keydown.ui.slider", (event) => {
				if (!this.node || !this.#handles.includes(event.target) || _fr0st_query.default.is(this.node, ":disabled") || _fr0st_query.default.getProperty(this.node, "readOnly")) return;
				const original = this.#values[this.#active];
				let value;
				let direction;
				let snap = false;
				switch (event.key) {
					case "Home":
						value = this.#min;
						break;
					case "End":
						value = this.#max;
						break;
					case "ArrowLeft":
					case "ArrowRight":
						direction = event.key === "ArrowRight" ? 1 : -1;
						if (this.options.orientation !== "vertical" && this.#isReversed()) direction *= -1;
						break;
					case "ArrowUp":
					case "ArrowDown":
						direction = event.key === "ArrowUp" ? 1 : -1;
						break;
					default: return;
				}
				event.preventDefault();
				if (direction) {
					if (event.ctrlKey || this.options.lockToTicks && this.#ticks.length) {
						value = (direction > 0 ? this.#ticks : this.#ticks.slice().reverse()).find((tick) => direction * (tick.value - original) > 0)?.value;
						snap = value !== void 0;
						value ??= direction > 0 ? this.#max : this.#min;
					} else {
						const steps = (original - this.#min) / this.#step;
						const tolerance = Number.EPSILON * Math.max(1, Math.abs(steps));
						const next = direction > 0 ? Math.floor(steps + tolerance) + 1 : Math.ceil(steps - tolerance) - 1;
						value = this.#min + next * this.#step;
						if (!Number.isFinite(value)) value = original;
					}
				}
				this.#setHandleValue(this.#normalizeValue(value, snap), true);
			});
			_fr0st_query.default.addEvent(this.#container, "focusin.ui.slider", (event) => {
				const active = this.#handles.indexOf(event.target);
				if (active >= 0) {
					this.#active = active;
					this.#tooltipTriggers.add("focus");
					this.#refreshTooltip();
				}
			});
			_fr0st_query.default.addEvent(this.#container, "focusout.ui.slider", (event) => {
				if (!event.relatedTarget || !_fr0st_query.default.hasDescendent(this.#container, event.relatedTarget)) {
					this.#tooltipTriggers.delete("focus");
					this.#refreshTooltip();
				}
			});
			_fr0st_query.default.addEvent(this.#container, "mouseenter.ui.slider", () => {
				this.#tooltipTriggers.add("hover");
				this.#refreshTooltip();
			});
			_fr0st_query.default.addEvent(this.#container, "mouseleave.ui.slider", () => {
				this.#tooltipTriggers.delete("hover");
				this.#refreshTooltip();
			});
		}
		/**
		* Resolves a pointer or tick click to a normalized value.
		* @param {MouseEvent|TouchEvent} event The input event, including release coordinates.
		* @returns {number} The normalized value.
		*/
		#getEventValue(event) {
			const touch = event.type === "touchend" ? event.changedTouches?.[0] : null;
			const { x, y } = touch ? {
				x: touch.pageX,
				y: touch.pageY
			} : (0, _fr0st_ui.getPosition)(event);
			if (!Number.isFinite(x) || !Number.isFinite(y)) return this.#values[this.#active];
			if (this.#drag.tick !== null && !this.#drag.moved && x === this.#drag.x && y === this.#drag.y) return this.#normalizeValue(this.#drag.tick, true);
			const rect = _fr0st_query.default.rect(this.#slider, { offset: true });
			const vertical = this.options.orientation === "vertical";
			const length = vertical ? rect.height : rect.width;
			if (!length) return this.#values[this.#active];
			let percent = 100 * ((vertical ? y - rect.top : x - rect.left) / length);
			if (this.#isReversed()) percent = 100 - percent;
			const value = getValue(percent, this.#min, this.#max, this.options.scale === "logarithmic");
			return this.#normalizeValue(value, true);
		}
		/**
		* Converts a value to its physical track percentage.
		* @param {number} value The bounded value.
		* @returns {number} The physical percentage.
		*/
		#getPercent(value) {
			const percent = getPercent(value, this.#min, this.#max, this.options.scale === "logarithmic");
			return this.#isReversed() ? 100 - percent : percent;
		}
		/**
		* Checks the effective physical reversal, including horizontal RTL.
		* @returns {boolean} Whether percentages run backwards on screen.
		*/
		#isReversed() {
			const rtl = this.options.orientation !== "vertical" && _fr0st_query.default.css(this.#container, "direction") === "rtl";
			return Boolean(this.options.reversed) !== rtl;
		}
		/**
		* Normalizes a value and optionally snaps to the nearest usable tick.
		* @param {*} value The input value.
		* @param {boolean} [snap=false] Whether proximity snapping is enabled.
		* @returns {number} The normalized value.
		*/
		#normalizeValue(value, snap = false) {
			const { lockToTicks } = this.options;
			const min = this.#min;
			const max = this.#max;
			const step = this.#step;
			const defaultValue = this.#defaultValue;
			const tickSnapBounds = this.#tickSnapBounds;
			const raw = _fr0st_query.default._clamp(parseNumber(value, defaultValue), min, max);
			if (this.#ticks.length && (lockToTicks || snap)) {
				const closest = this.#ticks.reduce((best, tick) => Math.abs(tick.value - raw) < Math.abs(best.value - raw) ? tick : best);
				if (lockToTicks || Math.abs(closest.value - raw) <= tickSnapBounds) return closest.value;
			}
			return clampValue(raw, min, max, step);
		}
		/**
		* Reads native values after initialization, native events, or a form reset.
		* @param {boolean} [emit=true] Whether normalization should emit change.
		*/
		#refresh(emit = true) {
			const value = _fr0st_query.default.getValue(this.node);
			const values = this.options.range ? value.split(this.#rangeSeparator, 2) : [value];
			this.#setValues(this.options.range ? [values[0], values[1]] : values, { emit });
		}
		/**
		* Synchronizes native input state and inherited accessibility attributes.
		*/
		#refreshState() {
			const disabled = _fr0st_query.default.is(this.node, ":disabled");
			const readOnly = Boolean(_fr0st_query.default.getProperty(this.node, "readOnly"));
			if (disabled || readOnly) {
				this.#cancelDrag();
				if (!this.node) return;
			}
			_fr0st_query.default.setStyle(this.#container, { opacity: disabled ? this.#disabledOpacity : "" });
			for (const handle of this.#handles) {
				_fr0st_query.default.setProperty(handle, { disabled });
				_fr0st_query.default.setAttribute(handle, {
					"aria-disabled": String(disabled),
					"aria-readonly": String(readOnly),
					"aria-required": String(Boolean(_fr0st_query.default.getProperty(this.node, "required")))
				});
				for (const attribute of ariaAttributes) {
					const value = _fr0st_query.default.getAttribute(this.node, attribute);
					if (value === null) {
						if (attribute !== "aria-required") _fr0st_query.default.removeAttribute(handle, attribute);
					} else _fr0st_query.default.setAttribute(handle, { [attribute]: value });
				}
			}
			this.#refreshTooltip();
		}
		/**
		* Updates the public Tooltip using the combined hover, focus, and drag state.
		*/
		#refreshTooltip() {
			if (!this.node || !this.#tooltip || !this.#values.length) return;
			if (_fr0st_query.default.is(this.node, ":disabled")) this.#tooltip.hide();
			else if (this.options.tooltip === "always" || this.#tooltipTriggers.size) {
				const current = this.options.range ? null : _fr0st_query.default.getAttribute(this.#handles[0], "aria-describedby");
				this.#tooltip.show();
				if (!this.options.range) {
					const tooltipId = _fr0st_query.default.getAttribute(this.#handles[0], "aria-describedby");
					if (tooltipId !== current) this.#tooltipId = tooltipId;
					const description = _fr0st_query.default.getAttribute(this.node, "aria-describedby") || "";
					if (description || this.#tooltipId) {
						const ids = [...new Set(`${description} ${this.#tooltipId || ""}`.trim().split(/\s+/))];
						_fr0st_query.default.setAttribute(this.#handles[0], "aria-describedby", ids.join(" "));
					}
				}
			} else this.#tooltip.hide();
		}
		/**
		* Renders the UI utility-based track, intervals, ticks, and handles.
		*/
		#render() {
			const vertical = this.options.orientation === "vertical";
			this.#container = _fr0st_query.default.create("div", {
				class: this.constructor.classes.container,
				style: {
					width: vertical ? `${this.#sliderSize}px` : "100%",
					height: vertical ? `${this.#verticalHeight}px` : `${this.#sliderSize}px`,
					touchAction: "none"
				}
			});
			if (_fr0st_query.default.hasAttribute(this.node, "dir")) _fr0st_query.default.setAttribute(this.#container, { "dir": _fr0st_query.default.getAttribute(this.node, "dir") });
			this.#slider = _fr0st_query.default.create("div", {
				class: this.constructor.classes.slider,
				style: {
					width: "100%",
					height: "100%",
					overflow: "clip"
				}
			});
			_fr0st_query.default.append(this.#container, this.#slider);
			_fr0st_query.default.before(this.node, this.#container);
			this.#barLow = this.#renderBar(this.options.low);
			this.#barSelection = this.#renderBar(this.options.selection);
			this.#barHigh = this.#renderBar(this.options.high);
			for (const range of this.#highlights) {
				const bar = this.#renderBar(range.style);
				this.#setBarPosition(bar, range.start, range.end);
			}
			for (const tick of this.#ticks) {
				tick.node = _fr0st_query.default.create("div", {
					class: this.constructor.classes.tick,
					dataset: { uiValue: tick.value },
					style: {
						width: `${this.#tickSize}px`,
						height: `${this.#tickSize}px`,
						[vertical ? "left" : "top"]: "50%",
						[vertical ? "top" : "left"]: `${this.#getPercent(tick.value)}%`,
						transform: "translate(-50%, -50%)"
					}
				});
				_fr0st_query.default.append(this.#container, tick.node);
				if (tick.label !== null && tick.label !== void 0 && tick.label !== "") {
					const label = _fr0st_query.default.create("small", {
						class: this.constructor.classes.tickLabel,
						text: `${tick.label}`,
						style: {
							[vertical ? "left" : "top"]: `${(this.#sliderSize + this.#tickSize) / 2}px`,
							[vertical ? "top" : "left"]: `${this.#getPercent(tick.value)}%`,
							transform: vertical ? "translateY(-50%)" : "translateX(-50%)"
						}
					});
					_fr0st_query.default.append(this.#container, label);
				}
			}
			const labelledBy = _fr0st_query.default.getAttribute(this.node, "aria-labelledby");
			const label = this.options.range && labelledBy ? labelledBy.split(/\s+/).map((id) => _fr0st_query.default.getText(_fr0st_query.default.findOneById(id, _fr0st_query.default.getProperty(this.node, "ownerDocument")))?.trim() || "").join(" ") : _fr0st_query.default.getAttribute(this.node, "aria-label") || this.#label;
			for (let index = 0; index < (this.options.range ? 2 : 1); index++) {
				const handle = _fr0st_query.default.create("button", {
					class: this.constructor.classes.handle,
					attributes: {
						"type": "button",
						"role": "slider",
						"aria-orientation": vertical ? "vertical" : "horizontal",
						"aria-valuemin": this.#min,
						"aria-valuemax": this.#max
					},
					style: {
						width: `${this.#handleSize * (vertical ? 1 : this.#handleSizeRatio)}px`,
						height: `${this.#handleSize * (vertical ? this.#handleSizeRatio : 1)}px`,
						[vertical ? "left" : "top"]: "50%",
						transform: "translate(-50%, -50%)"
					}
				});
				if (!this.options.range && labelledBy) _fr0st_query.default.setAttribute(handle, { "aria-labelledby": labelledBy });
				else {
					const ariaLabel = this.options.range ? `${label || "Range"} ${index ? "end" : "start"}` : label || "Value";
					_fr0st_query.default.setAttribute(handle, { "aria-label": ariaLabel });
				}
				_fr0st_query.default.append(this.#container, handle);
				this.#handles.push(handle);
			}
			if (this.options.tooltip) {
				this.#tooltip = _fr0st_ui.Tooltip.init(this.options.range ? this.#barSelection : this.#handles[0], {
					appendTo: _fr0st_query.default.findOne("body"),
					trigger: "",
					placement: this.options.tooltipPlacement || (vertical ? "right" : "top"),
					spacing: this.options.range ? (this.#handleSize - this.#sliderSize) / 2 : 0
				});
				if (!this.options.range) _fr0st_query.default.addEvent(this.#handles[0], "hidden.ui.tooltip", (event) => {
					this.#tooltipId = null;
					const description = _fr0st_query.default.getAttribute(this.node, "aria-describedby");
					if (description !== null) _fr0st_query.default.setAttribute(event.currentTarget, "aria-describedby", description);
				});
			}
			_fr0st_query.default.addClass(this.node, this.constructor.classes.hide);
			_fr0st_query.default.setAttribute(this.node, {
				"tabindex": "-1",
				"aria-hidden": true
			});
		}
		/**
		* Creates a UI progress interval without inherited progress animation or glow.
		* @param {string|null} style The background class.
		* @returns {HTMLElement} The interval node.
		*/
		#renderBar(style) {
			const bar = _fr0st_query.default.create("div", {
				class: this.constructor.classes.sliderBar,
				style: {
					backgroundColor: "transparent",
					transition: "none",
					[this.options.orientation === "vertical" ? "width" : "height"]: "100%"
				}
			});
			if (style) _fr0st_query.default.addClass(bar, style);
			_fr0st_query.default.append(this.#slider, bar);
			return bar;
		}
		/**
		* Positions a colored interval with the same physical coordinates as handles.
		* @param {HTMLElement} bar The interval element.
		* @param {number} start The first value.
		* @param {number} end The last value.
		*/
		#setBarPosition(bar, start, end) {
			const a = this.#getPercent(start);
			const b = this.#getPercent(end);
			const vertical = this.options.orientation === "vertical";
			_fr0st_query.default.setStyle(bar, {
				[vertical ? "top" : "left"]: `${Math.min(a, b)}%`,
				[vertical ? "height" : "width"]: `${Math.abs(b - a)}%`
			});
		}
		/**
		* Moves the active handle, handing focus to the other handle when crossing.
		* @param {number} value The normalized value.
		* @param {boolean} commit Whether to update the native input.
		*/
		#setHandleValue(value, commit) {
			const values = [...this.#values];
			let active = this.#active;
			if (this.options.range) {
				if (value < values[0]) active = 0;
				else if (value > values[1]) active = 1;
			}
			values[active] = value;
			if (this.#active !== active) {
				this.#active = active;
				_fr0st_query.default.focus(this.#handles[active]);
				if (!this.node) return;
				if (_fr0st_query.default.is(this.node, ":disabled") || _fr0st_query.default.getProperty(this.node, "readOnly")) {
					this.#refreshState();
					return;
				}
			}
			this.#setValues(values, {
				commit,
				normalized: true
			});
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
			this.#values = values.map((value) => normalized ? value : this.#normalizeValue(value)).sort((a, b) => a - b);
			const start = this.options.range ? this.#values[0] : this.#min;
			const end = this.#values[this.#values.length - 1];
			this.#setBarPosition(this.#barLow, this.#min, start);
			this.#setBarPosition(this.#barSelection, start, end);
			this.#setBarPosition(this.#barHigh, end, this.#max);
			const valueText = typeof this.options.valueText === "function" ? this.options.valueText : this.constructor.defaults.valueText;
			for (const [index, value] of this.#values.entries()) {
				const text = valueText.call(this, value);
				if (!this.node) return;
				_fr0st_query.default.setAttribute(this.#handles[index], {
					"aria-valuenow": value,
					"aria-valuetext": `${text}`
				});
				_fr0st_query.default.setStyle(this.#handles[index], { [this.options.orientation === "vertical" ? "top" : "left"]: `${this.#getPercent(value)}%` });
				if (!this.options.range) _fr0st_query.default.setDataset(this.#handles[index], { uiTitle: text });
			}
			if (this.options.range && this.#tooltip) {
				const text = (typeof this.options.rangeText === "function" ? this.options.rangeText : this.constructor.defaults.rangeText).call(this, ...this.#values);
				if (!this.node) return;
				_fr0st_query.default.setDataset(this.#barSelection, { uiTitle: text });
			}
			for (const tick of this.#ticks) {
				const highlight = this.#highlights.find((range) => tick.value >= range.start && tick.value <= range.end);
				const selected = tick.value >= start && tick.value <= end;
				let style = tick.value < start ? this.options.low : this.options.high;
				if (selected) style = this.options.selection;
				if (highlight) style = highlight.style;
				_fr0st_query.default.setAttribute(tick.node, "class", this.constructor.classes.tick);
				if (selected) _fr0st_query.default.addClass(tick.node, this.constructor.classes.tickFilled);
				if (style) _fr0st_query.default.addClass(tick.node, style);
			}
			this.#tooltip?.refresh();
			this.#refreshTooltip();
			if (this.node && commit) {
				if (this.#drag) this.#drag.values = [...this.#values];
				const value = this.#values.join(this.#rangeSeparator);
				if (value === _fr0st_query.default.getValue(this.node)) return;
				_fr0st_query.default.setValue(this.node, value);
				if (emit) _fr0st_query.default.triggerEvent(this.node, "change.ui.slider", { data: { skipUpdate: true } });
			}
		}
	};

//#endregion
//#region src/index.js
	(0, _fr0st_ui.initComponent)("slider", Slider);
	var src_default = Slider;

//#endregion
exports.Slider = src_default;
});
//# sourceMappingURL=frost-ui-slider.js.map