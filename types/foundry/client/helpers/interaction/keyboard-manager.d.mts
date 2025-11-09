import { KeybindingAction, KeyboardEventContext, ModifierKey } from "@client/_types.mjs";

/**
 * A set of helpers and management functions for dealing with user input from keyboard events.
 * {@link https://keycode.info/}
 * @see {@link foundry.Game#keyboard}
 */
export default class KeyboardManager {
    constructor();

    /**
     * Begin listening to keyboard events.
     * @internal
     */
    _activateListeners(): void;

    /**
     * The set of key codes which are currently depressed (down)
     */
    downKeys: Set<string>;

    /**
     * The set of movement keys which were recently pressed
     */
    moveKeys: Set<string>;

    /**
     * Allowed modifier keys.
     */
    static MODIFIER_KEYS: {
        CONTROL: "Control";
        SHIFT: "Shift";
        ALT: "Alt";
    };

    /**
     * Track which KeyboardEvent#code presses associate with each modifier.
     */
    static MODIFIER_CODES: {
        Alt: ["AltLeft", "AltRight"];
        Control: ["ControlLeft", "ControlRight", "MetaLeft", "MetaRight", "Meta", "OsLeft", "OsRight"];
        Shift: ["ShiftLeft", "ShiftRight"];
    };

    /**
     * Key codes which are "protected" and should not be used because they are reserved for browser-level actions.
     */
    static PROTECTED_KEYS: ["F5", "F11", "F12", "PrintScreen", "ScrollLock", "NumLock", "CapsLock"];

    /**
     * The OS-specific string display for what their Command key is
     */
    static CONTROL_KEY_STRING: "⌘" | "Control";

    /**
     * A special mapping of how special KeyboardEvent#code values should map to displayed strings or symbols.
     * Values in this configuration object override any other display formatting rules which may be applied.
     * @type {Record<string, string>}
     */
    static KEYCODE_DISPLAY_MAPPING: {
        ArrowLeft: "⬅";
        ArrowRight: "➡";
        ArrowUp: "⬆";
        ArrowDown: "⬇";
        Backquote: "`";
        Backslash: "\\";
        BracketLeft: "[";
        BracketRight: "]";
        Comma: ",";
        Control: typeof KeyboardManager.CONTROL_KEY_STRING;
        Equal: "=";
        Meta: "⌘" | "⊞";
        MetaLeft: "⌘" | "⊞";
        MetaRight: "⌘" | "⊞";
        OsLeft: "⌘" | "⊞";
        OsRight: "⌘" | "⊞";
        Minus: "-";
        NumpadAdd: "Numpad+";
        NumpadSubtract: "Numpad-";
        Period: ".";
        Quote: "'";
        Semicolon: ";";
        Slash: "/";
    };

    /**
     * Determines whether an `HTMLElement` currently has focus, which may influence keybinding actions.
     *
     * An element is considered to have focus if:
     * 1. It has a `dataset.keyboardFocus` attribute explicitly set to `"true"` or an empty string (`""`).
     * 2. It is an `<input>`, `<select>`, or `<textarea>` element, all of which inherently accept keyboard input.
     * 3. It has the `isContentEditable` property set to `true`, meaning it is an editable element.
     * 4. It is a `<button>` element inside a `<form>`, which suggests interactive use.
     *
     * An element is considered **not** focused if:
     * 1. There is no currently active element (`document.activeElement` is not an `HTMLElement`).
     * 2. It has a `dataset.keyboardFocus` attribute explicitly set to `"false"`.
     *
     * If none of these conditions are met, the element is assumed to be unfocused.
     */
    get hasFocus(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Emulates a key being pressed, triggering the Keyboard event workflow.
     * @param up If True, emulates the `keyup` Event. Else, the `keydown` event
     * @param code The KeyboardEvent#code which is being pressed
     * @param options Additional options to configure behavior.
     * @param options.altKey Emulate the ALT modifier as pressed
     * @param options.ctrlKey Emulate the CONTROL modifier as pressed
     * @param options.shiftKey Emulate the SHIFT modifier as pressed
     * @param options.repeat Emulate this as a repeat event
     * @param options.force Force the event to be handled.
     */
    static emulateKeypress(
        up: boolean,
        code: string,
        options?: { altKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; repeat?: boolean; force?: boolean },
    ): KeyboardEventContext;

    /**
     * Format a KeyboardEvent#code into a displayed string.
     * @param code The input code
     * @returns The displayed string for this code
     */
    static getKeycodeDisplayString(code: string): string;

    /**
     * Get a standardized keyboard context for a given event.
     * Every individual keypress is uniquely identified using the KeyboardEvent#code property.
     * A list of possible key codes is documented here: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values
     *
     * @param event The originating keypress event
     * @param up A flag for whether the key is down or up
     * @returns The standardized context of the event
     */
    static getKeyboardEventContext(event: KeyboardEvent, up?: boolean): KeyboardEventContext;

    /**
     * Report whether a modifier in KeyboardManager.MODIFIER_KEYS is currently actively depressed.
     * @param modifier A modifier in MODIFIER_KEYS
     * @returns Is this modifier key currently down (active)?
     */
    isModifierActive(modifier: ModifierKey): boolean;

    /**
     * Report whether a core action key is currently actively depressed.
     * @param action The core action to verify (ex: "target")
     * @returns Is this core action key currently down (active)?
     */
    isCoreActionKeyActive(action: string): boolean;

    /**
     * Given a standardized pressed key, find all matching registered Keybind Actions.
     * @param context A standardized keyboard event context
     * @returns The matched Keybind Actions. May be empty.
     * @internal
     */
    static _getMatchingActions(context: KeyboardEventContext): KeybindingAction[];

    /**
     * Processes a keyboard event context, checking it against registered keybinding actions
     * @param context The keyboard event context
     * @param options Additional options to configure behavior.
     * @param options.force Force the event to be handled.
     */
    protected _processKeyboardContext(context: KeyboardEventContext, options?: { force?: boolean }): void;

    /**
     * Emulate a key-up event for any currently down keys. When emulating, we go backwards such that combinations such as
     * "CONTROL + S" emulate the "S" first in order to capture modifiers.
     * @param options Options to configure behavior.
     * @param options.force Force the keyup events to be handled.
     */
    releaseKeys({ force }?: { force?: boolean }): void;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Release any down keys when focusing a form element.
     * @param event The focus event.
     */
    protected _onFocusIn(event: FocusEvent): void;
}
