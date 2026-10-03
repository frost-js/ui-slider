/**
 * Parses a finite numeric value, using a fallback for missing or invalid input.
 * @param {*} value The value to parse.
 * @param {number} fallback The fallback value.
 * @returns {number} The parsed value or fallback.
 */
export function parseNumber(value, fallback) {
    if (!['number', 'string'].includes(typeof value) || `${value}`.trim() === '') {
        return fallback;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : fallback;
}

/**
 * Normalizes a value to a min-anchored step while keeping endpoints reachable.
 * @param {*} value The input value.
 * @param {number} min The lower bound.
 * @param {number} max The upper bound.
 * @param {number} step The positive step size.
 * @param {number} fallback The fallback value.
 * @returns {number} The bounded value.
 */
export function clampValue(value, min, max, step, fallback) {
    value = Math.max(min, Math.min(max, parseNumber(value, fallback)));
    if (value === min || value === max) {
        return value;
    }

    const rounded = min + Math.round((value - min) / step) * step;
    // Remove arithmetic noise without imposing a fixed number of decimal places.
    return Math.max(min, Math.min(max, Number(rounded.toPrecision(15))));
}

/**
 * Converts a value to a percentage, including fixed and shifted logarithmic ranges.
 * @param {number} value The bounded value.
 * @param {number} min The lower bound.
 * @param {number} max The upper bound.
 * @param {boolean} logarithmic Whether to use logarithmic scaling.
 * @returns {number} The percentage.
 */
export function getPercent(value, min, max, logarithmic) {
    if (min === max) {
        return 0;
    }

    return 100 * (logarithmic ?
        Math.log1p(value - min) / Math.log1p(max - min) :
        (value - min) / (max - min));
}

/**
 * Converts a percentage back to a value.
 * @param {number} percent The percentage.
 * @param {number} min The lower bound.
 * @param {number} max The upper bound.
 * @param {boolean} logarithmic Whether to use logarithmic scaling.
 * @returns {number} The bounded value.
 */
export function getValue(percent, min, max, logarithmic) {
    percent = Math.max(0, Math.min(100, percent));
    if (percent === 0 || min === max) {
        return min;
    }
    if (percent === 100) {
        return max;
    }

    return min + (logarithmic ?
        Math.expm1(Math.log1p(max - min) * percent / 100) :
        (max - min) * percent / 100);
}

/**
 * Validates and normalizes numeric component options before registration.
 * @param {object} options The merged component options.
 * @returns {object} The validated options.
 * @throws {RangeError} When bounds, steps, dimensions, or modes are invalid.
 * @throws {TypeError} When value formatters are not functions.
 */
export function validateOptions(options) {
    const result = { ...options };
    for (const key of ['min', 'max', 'step', 'tickSize', 'handleSize', 'handleSizeRatio', 'sliderSize', 'verticalHeight', 'tickSnapBounds', 'disabledOpacity']) {
        result[key] = parseNumber(result[key], NaN);
        if (!Number.isFinite(result[key])) {
            throw new RangeError(`Slider ${key} must be finite.`);
        }
    }

    if (result.min > result.max || !Number.isFinite(result.max - result.min)) {
        throw new RangeError('Slider bounds must form a finite ascending interval.');
    }
    for (const key of ['step', 'tickSize', 'handleSize', 'handleSizeRatio', 'sliderSize', 'verticalHeight']) {
        if (result[key] <= 0) {
            throw new RangeError(`Slider ${key} must be positive.`);
        }
    }
    if (
        result.tickSnapBounds < 0 ||
        result.disabledOpacity < 0 ||
        result.disabledOpacity > 1 ||
        !['horizontal', 'vertical'].includes(result.orientation) ||
        !['linear', 'logarithmic'].includes(result.scale) ||
        ![false, 'show', 'always'].includes(result.tooltip) ||
        typeof result.rangeSeparator !== 'string' ||
        !result.rangeSeparator.length
    ) {
        throw new RangeError('Invalid Slider mode, separator, snap bounds, or opacity.');
    }
    if (typeof result.valueText !== 'function' || typeof result.rangeText !== 'function') {
        throw new TypeError('Slider valueText and rangeText must be functions.');
    }

    result.defaultValue = parseNumber(result.defaultValue, result.min);
    return result;
}

export { parseNumber as toNumber };
