/**
 * Dispatches touch-style pointer input for gestures unavailable through Playwright's mouse API.
 * @param {object} options The pointer event settings.
 * @param {string} options.type The pointer event type.
 * @param {number} [options.fraction=.5] The position along the track.
 * @param {number} [options.id=1] The pointer identifier.
 * @param {boolean} [options.primary=true] Whether this is the primary pointer.
 * @param {number} [options.button=0] The pressed button.
 * @returns {boolean} Whether the component prevented the default action.
 */
export function dispatchPointer({ type, fraction = .5, id = 1, primary = true, button = 0 }) {
    const track = document.querySelector('#host .progress.position-relative');
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
};
