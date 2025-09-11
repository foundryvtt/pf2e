import { KeybindingAction, KeybindingActionBinding, KeybindingActionConfig } from "@client/_types.mjs";

/**
 * A class responsible for managing defined game keybinding.
 * Each keybinding is a string key/value pair belonging to a certain namespace and a certain store scope.
 *
 * When Foundry Virtual Tabletop is initialized, a singleton instance of this class is constructed within the global
 * Game object as as game.keybindings.
 *
 * @see {@link foundry.Game#keybindings}
 * @see {@link ControlsConfig}
 */
export default class ClientKeybindings {
    constructor();

    /**
     * Registered Keybinding actions
     */
    actions: Map<string, KeybindingActionConfig>;

    /**
     * A mapping of a string key to possible Actions that might execute off it
     */
    activeKeys: Map<string, KeybindingAction[]>;

    /**
     * A stored cache of Keybind Actions Ids to Bindings
     */
    bindings: Map<string, KeybindingActionBinding[]>;

    static MOVEMENT_DIRECTIONS: {
        UP: "up";
        LEFT: "left";
        DOWN: "down";
        RIGHT: "right";
        DESCEND: "descend";
        ASCEND: "ascend";
    };

    static ZOOM_DIRECTIONS: {
        IN: "in";
        OUT: "out";
    };

    /**
     * An alias of the movement key set tracked by the keyboard
     */
    get moveKeys(): Set<string>;

    /**
     * Initializes the keybinding values for all registered actions
     */
    initialize(): void;

    /**
     * Register a new keybinding
     *
     * @param namespace The namespace the Keybinding Action belongs to
     * @param action A unique machine-readable id for the Keybinding Action
     * @param data Configuration for keybinding data
     *
     * @example Define a keybinding which shows a notification
     * ```js
     * game.keybindings.register("myModule", "showNotification", {
     *   name: "My Settings Keybinding",
     *   hint: "A description of what will occur when the Keybinding is executed.",
     *   uneditable: [
     *     {
     *       key: "Digit1",
     *       modifiers: ["Control"]
     *     }
     *   ],
     *   editable: [
     *     {
     *       key: "F1"
     *     }
     *   ],
     *   onDown: () => { ui.notifications.info("Pressed!") },
     *   onUp: () => {},
     *   restricted: true,             // Restrict this Keybinding to gamemaster only?
     *   reservedModifiers: ["Alt"],  // On ALT, the notification is permanent instead of temporary
     *   precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
     * });
     * ```
     */
    register(namespace: string, action: string, data: KeybindingActionConfig): void;

    /**
     * Get the current Bindings of a given namespace's Keybinding Action
     *
     * @param namespace The namespace under which the setting is registered
     * @param action The keybind action to retrieve
     *
     * @example Retrieve the current Keybinding Action Bindings
     * ```js
     * game.keybindings.get("myModule", "showNotification");
     * ```
     */
    get(namespace: string, action: string): KeybindingActionBinding[];

    /**
     * Set the editable Bindings of a Keybinding Action for a certain namespace and Action
     *
     * @param namespace The namespace under which the Keybinding is registered
     * @param action The Keybinding action to set
     * @param bindings The Bindings to assign to the Keybinding
     *
     * @example Update the current value of a keybinding
     * ```js
     * game.keybindings.set("myModule", "showNotification", [
     *     {
     *       key: "F2",
     *       modifiers: [ "CONTROL" ]
     *     }
     * ]);
     * ```
     */
    set(namespace: string, action: string, bindings: KeybindingActionBinding[]): Promise<void>;

    /**
     * Reset all client keybindings back to their default configuration.
     */
    resetDefaults(): Promise<void>;

    /**
     * Compares two Keybinding Actions based on their Order
     * @param a The first Keybinding Action
     * @param b the second Keybinding Action
     * @internal
     */
    static _compareActions(
        a: Pick<KeybindingAction, "precedence" | "order">,
        b: Pick<KeybindingAction, "precedence" | "order">,
    ): number;

    /* ---------------------------------------- */
    /*  Core Keybinding Actions                 */
    /* ---------------------------------------- */

    /**
     * Register core keybindings.
     * @param view The active game view
     * @internal
     */
    _registerCoreKeybindings(view: string): void;
}
