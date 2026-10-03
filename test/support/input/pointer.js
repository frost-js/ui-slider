/**
 * Dispatches a synthetic touch pointer event on the slider track.
 * @param {object} options The pointer event options.
 * @param {string} options.type The event type.
 * @param {number} [options.fraction=.5] The horizontal position as a fraction of the track.
 * @param {number} [options.id=1] The pointer identifier.
 * @param {boolean} [options.primary=true] Whether this is the primary pointer.
 * @param {number} [options.button=0] The mouse button value.
 * @returns {boolean} Whether the component prevented the event's default action.
 */
export function dispatchPointer({ type, fraction = .5, id = 1, primary = true, button = 0 }) {
    const track = $.findOne('#host .progress.position-relative');
    const rect = track.getBoundingClientRect();
    const event = new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerType: 'touch',
        pointerId: id,
        isPrimary: primary,
        button,
        clientX: rect.left + rect.width * fraction,
        clientY: rect.top + rect.height / 2,
    });
    const target = type === 'pointerdown' ? track : window;
    target.dispatchEvent(event);
    return event.defaultPrevented;
}
