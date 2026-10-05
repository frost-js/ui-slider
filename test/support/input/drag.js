/**
 * Dispatches a synthetic mouse or touch gesture on the slider track.
 * @param {object} options The drag event options.
 * @param {string} options.type The mouse or touch event type.
 * @param {number} [options.fraction=.5] The horizontal position as a fraction of the track.
 * @param {number} [options.id=1] The touch identifier.
 * @param {number} [options.button=0] The mouse button value.
 * @returns {boolean} Whether the component prevented the event's default action.
 */
export function dispatchDragEvent({ type, fraction = .5, id = 1, button = 0 }) {
    const track = $.findOne('#host .progress.position-relative');
    const rect = $.rect(track, { offset: true });
    const x = rect.left + rect.width * fraction;
    const y = rect.top + rect.height / 2;
    const target = type === 'touchstart' || type === 'mousedown' ? track : window;

    if (type.startsWith('mouse')) {
        return !$.triggerOne(target, type, {
            data: { button, pageX: x, pageY: y },
        });
    }

    // Retain the active touches so multi-finger sequences exercise the factory's count checks.
    window.sliderTouches ??= new Map();
    const touch = { identifier: id, target: track, pageX: x, pageY: y };

    if (type === 'touchstart' || type === 'touchmove' && window.sliderTouches.has(id)) {
        window.sliderTouches.set(id, touch);
    } else if (type === 'touchend' || type === 'touchcancel') {
        window.sliderTouches.delete(id);
    }

    return !$.triggerOne(target, type, {
        data: {
            touches: [...window.sliderTouches.values()],
            changedTouches: [touch],
        },
    });
}
