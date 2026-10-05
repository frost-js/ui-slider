/**
 * Parses a finite numeric value, using a fallback for missing or invalid input.
 * @param {*} value The value to parse.
 * @param {number} fallback The fallback value.
 * @returns {number} The parsed value or fallback.
 */
export function parseNumber(value, fallback) {
    if (
        !['number', 'string'].includes(typeof value) ||
        `${value}`.trim() === ''
    ) {
        return fallback;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : fallback;
}

/**
 * Parses a positive finite number, using a fallback for invalid input.
 * @param {*} value The value to parse.
 * @param {number} fallback The positive fallback value.
 * @returns {number} The positive number or fallback.
 */
export function parsePositiveNumber(value, fallback) {
    const number = parseNumber(value, fallback);

    return number > 0 ? number : fallback;
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

    // A step finer than floating-point resolution can overflow the step count.
    if (!Number.isFinite(rounded)) {
        return value;
    }

    // Remove arithmetic noise without imposing a fixed number of decimal places.
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

export { parseNumber as toNumber };
