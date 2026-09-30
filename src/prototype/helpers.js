import $ from '@fr0st/query';
import { Tooltip } from '@fr0st/ui';

/**
 * Check a value against the current range, and update the active handle.
 * @param {number} value The value to check.
 * @returns {object} The new start and end values.
 */
export function _checkRangeValue(value) {
    let start = this._startValue;
    let end = this._endValue;
    let handle = this._handle;

    if (value < start) {
        start = value;
        handle = this._handleStart;
    } else if (value > end) {
        end = value;
        handle = this._handleEnd;
    } else if ($.isSame(handle, this._handleStart)) {
        start = value;
    } else {
        end = value;
    }

    if (!$.isSame(handle, this._handle)) {
        $.focus(handle);
    }

    return { start, end };
};

/**
 * Clamp value to nearest tick (if within bounds).
 * @param {number} value The value to check.
 * @returns {number} The new value.
 */
export function _checkTicks(value) {
    let closest;
    let closestDiff = Number.MAX_VALUE;
    for (const tick of this._options.ticks) {
        const tickDiff = Math.abs(tick - value);
        if (tickDiff < closestDiff && (this._options.lockToTicks || tickDiff < this._options.tickSnapBounds)) {
            closestDiff = tickDiff;
            closest = tick;
        }
    };

    if (closest) {
        return closest;
    }

    return value;
};

/**
 * Clamp a value to a step-size, and between a min and max value.
 * @param {number} value The value to clamp.
 * @returns {number} The clamped value.
 */
export function _clampValue(value) {
    value = $._clamp(value, this._options.min, this._options.max);
    value = $._toStep(value, this._options.step);

    return value;
};

/**
 * Create a tooltip on an element.
 * @param {HTMLElement} element The element to attach the tooltip to.
 * @param {number} [spacing=0] Amount of spacing for the tooltip.
 * @returns {UI.Tooltip} The tooltip.
 */
export function _createTooltip(element, spacing = 0) {
    let placement;
    if (this._options.tooltipPlacement) {
        placement = this._options.tooltipPlacement;
    } else if (this._options.orientation === 'vertical') {
        placement = 'right';
    } else {
        placement = 'top';
    }

    const tooltip = Tooltip.init(element, {
        appendTo: 'body',
        trigger: '',
        spacing,
        placement,
    });

    if (this._options.tooltip === 'always') {
        tooltip.show();
    }

    return tooltip;
};

/**
 * Convert a value to percent.
 * @param {number} value The value to convert.
 * @returns {number} The percent.
 */
export function _getPercent(value) {
    if (this._options.scale !== 'logarithmic') {
        return $._inverseLerp(this._options.min, this._options.max, value) * 100;
    }

    if (this._options.min === this._options.max) {
        return 0;
    }

    const offset = 1 - this._options.min;
    const max = Math.log(this._options.max + offset);
    const min = Math.log(this._options.min + offset);
    const v = Math.log(value + offset);
    return 100 * (v - min) / (max - min);
};

/**
 * Convert a percent to value.
 * @param {number} percent The percent to convert.
 * @returns {number} The value.
 */
export function _getValue(percent) {
    if (this._options.scale !== 'logarithmic') {
        return $._lerp(this._options.min, this._options.max, percent / 100);
    }

    const offset = 1 - this._options.min;
    const min = Math.log(this._options.min + offset);
    const max = Math.log(this._options.max + offset);

    const value = Math.exp(min + (max - min) * percent / 100) - offset;

    if (Math.round(value) === max) {
        return max;
    }

    return this._options.min + value;
};

/**
 * Move a handle by a percent.
 * @param {HTMLElement} handle The handle to move.
 * @param {number} percent The amount to move the handle.
 */
export function _moveHandle(handle, percent) {
    if (this._options.reversed) {
        percent = 100 - percent;
    }

    let offsetStyle;
    if (this._options.orientation === 'vertical') {
        offsetStyle = 'top';
    } else {
        offsetStyle = 'left';
    }

    $.setStyle(handle, {
        [offsetStyle]: `${percent}%`,
    });
};

/**
 * Refresh the disabled styling.
 */
export function _refreshDisabled() {
    const disabled = $.is(this._node, ':disabled');

    const handles = this._options.range ?
        [this._handleStart, this._handleEnd] :
        this._handle;

    if (disabled) {
        $.setStyle(this._container, {
            opacity: this._options.disabledOpacity,
        });
        $.setAttribute(handles, { disabled: true });
    } else {
        $.setStyle(this._container, {
            opacity: '',
        });
        $.removeAttribute(handles, 'disabled');
    }
};

/**
 * Set the slider value.
 * @param {number} value The value.
 * @param {object} [options] Options for updating the value.
 * @param  {boolean} [options.updateValue=true] Whether to update the input value.
 */
export function _setValue(value, { updateValue = true } = {}) {
    value = this._clampValue(value);

    const percent = this._getPercent(value);
    const percentHigh = 100 - percent;

    let sizeStyle;
    let offsetStyle;
    if (this._options.orientation === 'vertical') {
        sizeStyle = 'height';
        offsetStyle = this._options.reversed ? 'bottom' : 'top';
    } else {
        sizeStyle = 'width';
        offsetStyle = this._options.reversed ? 'right' : 'left';
    }

    $.setStyle(this._barSelection, {
        [sizeStyle]: `${percent}%`,
    });
    $.setStyle(this._barHigh, {
        [sizeStyle]: `${percentHigh}%`,
        [offsetStyle]: `${percent}%`,
    });

    if (value !== this._value) {
        const title = this._options.valueText.bind(this)(value);

        $.setAttribute(this._handle, {
            'aria-valuenow': value,
            'aria-valuetext': title,
        });

        if (this._options.tooltip) {
            $.setDataset(this._handle, { uiTitle: title });
        }

        this._moveHandle(this._handle, percent);
        this._value = value;
    }

    if (this._options.tooltip) {
        this._tooltip.refresh();
        this._tooltip.update();
    }

    this._updateTicks();

    if (!updateValue) {
        return;
    }

    if (`${value}` === $.getValue(this._node)) {
        return;
    }

    $.setValue(this._node, value);

    $.triggerEvent(this._node, 'change.ui.slider');
};

/**
 * Set the slider range values.
 * @param {number} start The start value.
 * @param {number} end The end value.
 * @param {object} [options] Options for updating the value.
 * @param  {boolean} [options.updateValue=true] Whether to update the input value.
 */
export function _setValueRange(start, end, { updateValue = true } = {}) {
    start = this._clampValue(start);
    end = this._clampValue(end);

    const percentStart = this._getPercent(start);
    const percentEnd = this._getPercent(end);

    const percentMid = percentEnd - percentStart;
    const percentLow = percentStart;
    const offsetHigh = percentLow + percentMid;
    const percentHigh = 100 - offsetHigh;

    let sizeStyle;
    let offsetStyle;
    if (this._options.orientation === 'vertical') {
        sizeStyle = 'height';
        offsetStyle = this._options.reversed ? 'bottom' : 'top';
    } else {
        sizeStyle = 'width';
        offsetStyle = this._options.reversed ? 'right' : 'left';
    }

    $.setStyle(this._barLow, {
        [sizeStyle]: `${percentLow}%`,
    });
    $.setStyle(this._barSelection, {
        [sizeStyle]: `${percentMid}%`,
        [offsetStyle]: `${percentLow}%`,
    });
    $.setStyle(this._barHigh, {
        [sizeStyle]: `${percentHigh}%`,
        [offsetStyle]: `${offsetHigh}%`,
    });

    if (start !== this._startValue) {
        const startTitle = this._options.valueText.bind(this)(start);

        $.setAttribute(this._handleStart, {
            'aria-valuenow': start,
            'aria-valuetext': startTitle,
        });

        this._moveHandle(this._handleStart, percentStart);
        this._startValue = start;
    }

    if (end !== this._endValue) {
        const endTitle = this._options.valueText.bind(this)(end);

        $.setAttribute(this._handleEnd, {
            'aria-valuenow': end,
            'aria-valuetext': endTitle,
        });

        this._moveHandle(this._handleEnd, percentEnd);
        this._endValue = end;
    }

    if (this._options.tooltip) {
        const rangeTitle = this._options.rangeText.bind(this)(start, end);

        $.setDataset(this._barSelection, { uiTitle: rangeTitle });

        this._tooltip.refresh();
        this._tooltip.update();
    }

    this._updateTicks();

    if (!updateValue) {
        return;
    }

    const newValue = `${start}${this._options.rangeSeparator}${end}`;

    if (newValue === $.getValue(this._node)) {
        return;
    }

    $.setValue(this._node, newValue);

    $.triggerEvent(this._node, 'change.ui.slider');
};

/**
 * Update the value based on slider position.
 * @param {number} x The x position.
 * @param {number} y The y position.
 * @param {object} [options] Options for updating the value.
 * @param  {boolean} [options.updateValue=true] Whether to update the input value.
 */
export function _updatePercent(x, y, { updateValue = true } = {}) {
    let percent;
    if (this._options.orientation === 'vertical') {
        percent = $.percentY(this._slider, y, { offset: true });
    } else {
        percent = $.percentX(this._slider, x, { offset: true });
    }

    if (this._options.reversed) {
        percent = 100 - percent;
    }

    let value = this._getValue(percent);
    value = this._checkTicks(value);

    this._setValue(value, { updateValue });
};

/**
 * Update the range value based on slider position.
 * @param {number} x The x position.
 * @param {number} y The y position.
 * @param {object} [options] Options for updating the value.
 * @param  {boolean} [options.updateValue=true] Whether to update the input value.
 */
export function _updatePercentRange(x, y, { updateValue = true } = {}) {
    let percent;
    if (this._options.orientation === 'vertical') {
        percent = $.percentY(this._slider, y, { offset: true });
    } else {
        percent = $.percentX(this._slider, x, { offset: true });
    }

    if (this._options.reversed) {
        percent = 100 - percent;
    }

    let value = this._getValue(percent);
    value = this._checkTicks(value);

    const { start, end } = this._checkRangeValue(value);

    this._setValueRange(start, end, { updateValue });
};

/**
 * Update tick styling.
 */
export function _updateTicks() {
    let start;
    let end;
    if (this._options.range) {
        start = this._startValue;
        end = this._endValue;
    } else {
        start = this._options.min;
        end = this._value;
    }

    for (const tick of this._ticks) {
        const value = $.getDataset(tick, 'uiValue');
        const highlight = this._options.rangeHighlights.find((range) => value >= range.start && value <= range.end);

        let style;

        $.setAttribute(tick, { class: '' });
        $.addClass(tick, this.constructor.classes.tick);

        if (value < start) {
            style = this._options.low;
        } else if (value > end) {
            style = this._options.high;
        } else {
            $.addClass(tick, this.constructor.classes.tickFilled);
            style = this._options.selection;
        }

        if (highlight) {
            style = highlight.style;
        }

        if (style) {
            $.addClass(tick, style);
        }
    }
};
