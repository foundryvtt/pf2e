/**
 * Management class for Gamepad events.
 */
export default class GamepadManager {
    /**
     * How often Gamepad polling should check for button presses
     */
    static GAMEPAD_POLLER_INTERVAL_MS: number;

    /**
     * Begin listening to gamepad events.
     * @internal
     */
    _activateListeners(): void;
}
