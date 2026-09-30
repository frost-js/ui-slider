import $ from '@fr0st/query';
import { BaseComponent, generateId } from '@fr0st/ui';

/**
 * Slider Class
 * @class
 */
export default class Slider extends BaseComponent {
    /**
     * New Slider constructor.
     * @param {HTMLElement} node The input node.
     * @param {object} [options] The options to create the Slider with.
     */
    constructor(node, options) {
        super(node, options);

        const id = $.getAttribute(this._node, 'id');
        this._label = $.findOne(`label[for="${id}"]`);

        if (this._label && !$.getAttribute(this._label, 'id')) {
            $.setAttribute(this._label, { id: generateId('starrating-label') });
            this._labelId = true;
        }

        this._render();

        let value = $.getValue(this._node);

        if (this._options.range) {
            this._eventsRange();

            const values = $._isArray(value) ?
                value :
                `${value}`.split(this._options.rangeSeparator, 2);

            let start; let end;
            if (values.length === 2) {
                start = values[0];
                end = values[1];
            } else {
                start = this._options.defaultValue;
                end = this._options.defaultValue;
            }

            this._setValueRange(start, end);
        } else {
            this._events();

            if (value === '') {
                value = this._options.defaultValue;
            }

            this._setValue(value);
        }

        if (this._options.tooltip === 'show') {
            this._eventsTooltip();
        }

        this._refreshDisabled();
    }

    /**
     * Disable the Slider.
     */
    disable() {
        $.setAttribute(this._node, { disabled: true });
        this._refreshDisabled();
    }

    /**
     * Dispose the Slider.
     */
    dispose() {
        if (this._labelId) {
            $.removeAttribute(this._label, 'id');
        }

        if (this._tooltip) {
            this._tooltip.dispose();
            this._tooltip = null;
        }

        $.remove(this._container);
        $.removeEvent(this._node, 'focus.ui.slider');
        $.removeClass(this._node, this.constructor.classes.hide);
        $.removeAttribute(this._node, 'tabindex');

        this._container = null;
        this._slider = null;
        this._barLow = null;
        this._barSelection = null;
        this._barHigh = null;
        this._handleEnd = null;
        this._handleStart = null;
        this._handleActive = null;
        this._tickContainer = null;
        this._ticks = null;

        super.dispose();
    }

    /**
     * Enable the Slider.
     */
    enable() {
        $.removeAttribute(this._node, 'disabled');
        this._refreshDisabled();
    }

    /**
     * Get the current value(s).
     * @returns {number|number[]} The current value(s).
     */
    getValue() {
        if (!this._options.range) {
            return this._value;
        }

        return [this._startValue, this._endValue];
    }

    /**
     * Set the current value(s).
     * @param {number} start The start value to set.
     * @param {number} [end] The end value to set.
     */
    setValue(start, end) {
        if (this._options.range) {
            this._setValueRange(start, end);
        } else {
            this._setValue(start);
        }
    }
}
