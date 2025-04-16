/**
 * Management class for Mouse events.
 * @see {@link foundry.Game#mouse}
 */
export default class MouseManager {
    constructor();

    /**
     * Specify a rate limit for mouse wheel to gate repeated scrolling.
     * This is especially important for continuous scrolling mice which emit hundreds of events per second.
     * This designates a minimum number of milliseconds which must pass before another wheel event is handled
     */
    static MOUSE_WHEEL_RATE_LIMIT: number;

    /**
     * Begin listening to mouse events.
     * @internal
     */
    _activateListeners(): void;
}
