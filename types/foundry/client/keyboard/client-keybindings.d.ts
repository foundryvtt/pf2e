export {};

declare global {
    /**
     * A class responsible for managing defined game keybinding.
     * Each keybinding is a string key/value pair belonging to a certain namespace and a certain store scope.
     *
     * When Foundry Virtual Tabletop is initialized, a singleton instance of this class is constructed within the global
     * Game object as as game.keybindings.
     */
    class ClientKeybindings {
        /** Registered Keybinding actions */
        actions: Map<string, KeybindingActionConfig>;

        /** A mapping of a string key to possible Actions that might execute off it */
        activeKeys: Map<string, KeybindingAction[]>;

        /** A stored cache of Keybind Actions Ids to Bindings */
        bindings: Map<string, KeybindingActionBinding[]>;

        protected _registered: number;

        /** A timestamp which tracks the last time a pan operation was performed */
        private _moveTime: number;

        constructor();

        static MOVEMENT_DIRECTIONS: {
            UP: "up";
            LEFT: "left";
            DOWN: "down";
            RIGHT: "right";
        };

        static ZOOM_DIRECTIONS: { IN: "in"; OUT: "out" };

        /** An alias of the movement key set tracked by the keyboard */
        get moveKeys(): Set<string>;

        /** Initializes the keybinding values for all registered actions */
        initialize(): void;

        /**
         * Register a new keybinding
         *
         * @param namespace The namespace the Keybinding Action belongs to
         * @param action    A unique machine-readable id for the Keybinding Action
         * @param data      Configuration for keybinding data
         *
         * @example <caption>Define a keybinding which shows a notification</caption>
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
         *   restricted: true,                         // Restrict this Keybinding to gamemaster only?
         *   reservedModifiers: ["Alt""],              // If the ALT modifier is pressed, the notification is permanent instead of temporary
         *   precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
         * }
         */
        register(namespace: string, action: string, data: KeybindingActionConfig): void;

        /**
         * Get the current Bindings of a given namespace's Keybinding Action
         *
         * @param namespace The namespace under which the setting is registered
         * @param action    The keybind action to retrieve
         *
         * @example <caption>Retrieve the current Keybinding Action Bindings</caption>
         * game.keybindings.get("myModule", "showNotification");
         */
        get(namespace: string, action: string): KeybindingActionBinding[];

        /**
         * Set the editable Bindings of a Keybinding Action for a certain namespace and Action
         *
         * @param namespace The namespace under which the Keybinding is registered
         * @param action    The Keybinding action to set
         * @param bindings  The Bindings to assign to the Keybinding
         *
         * @example <caption>Update the current value of a keybinding</caption>
         * game.keybindings.set("myModule", "showNotification", [
         *     {
         *       key: "F2",
         *       modifiers: [ "CONTROL" ]
         *     }
         * ]);
         */
        set(namespace: string, action: string, bindings: KeybindingActionBinding[]): Promise<void>;

        /** Reset all client keybindings back to their default configuration. */
        resetDefaults(): Promise<void>;

        /**
         * A helper method that, when given a value, ensures that the returned value is a standardized Binding array
         * @param values An array of keybinding assignments to be validated
         * @return An array of keybinding assignments confirmed as valid
         */
        private static _validateBindings(values: KeybindingActionBinding[]): KeybindingActionBinding[];

        /**
         * Validate that assigned modifiers are allowed
         * @param keys An array of modifiers which may be valid
         * @returns An array of modifiers which are confirmed as valid
         */
        private static _validateModifiers(keys: string[]): string[];

        /**
         * Compares two Keybinding Actions based on their Order
         * @param a The first Keybinding Action
         * @param b the second Keybinding Action
         */
        private static _compareActions(a: KeybindingAction, b: KeybindingAction): number;

        /* ---------------------------------------- */
        /*  Core Keybinding Actions                 */
        /* ---------------------------------------- */

        /** Register core keybindings */
        private _registerCoreKeybindings(): void;

        /**
         * Handle Select all action
         * @param event   The originating keyboard event
         * @param context The context data of the event
         */
        private static _onSelectAllObjects(event: KeyboardEvent, context: KeyboardEventContext): boolean;

        /**
         * Handle Cycle View actions
         * @param context The context data of the event
         */
        private static _onCycleView(context: KeyboardEventContext): boolean;

        /**
         * Handle Dismiss actions
         * @param context The context data of the event
         */
        private static _onDismiss(context: KeyboardEventContext): boolean;

        /**
         * Open Character sheet for current token or controlled actor
         * @param {} context    The context data of the event
         * @private
         */
        private static _onToggleCharacterSheet(
            event: KeyboardEvent,
            context: KeyboardEventContext,
        ): ActorSheet<Actor> | Promise<ActorSheet<Actor>>;

        /**
         * Handle action to target the currently hovered token.
         * @param context    The context data of the event
         */
        private static _onTarget(context: KeyboardEventContext): boolean;

        /**
         * Handle DELETE Keypress Events
         * @param event   The originating keyboard event
         * @param context The context data of the event
         */
        private static _onDelete(event: KeyboardEvent, context: KeyboardEventContext): boolean;

        /**
         * Handle keyboard movement once a small delay has elapsed to allow for multiple simultaneous key-presses.
         * @param context The context data of the event
         * @param layer   The Placeables layer
         */
        private _handleMovement(context: KeyboardEventContext, layer: TokenLayer<Token> | TilesLayer<Tile>): void;

        /** Handle panning the canvas using CTRL + directional keys */
        private _handleCanvasPan(): Promise<void>;

        /**
         * Handle Measured Ruler Movement Action
         * @param context The context data of the event
         */
        private static _onMeasuredRulerMovement(context: KeyboardEventContext): boolean;

        /**
         * Handle Pause Action
         * @param context The context data of the event
         */
        private static _onPause(context: KeyboardEventContext): boolean;

        /**
         * Handle Highlight action
         * @param context The context data of the event
         */
        private static _onHighlight(context: KeyboardEventContext): boolean;

        /**
         * Handle Pan action
         * @param context            The context data of the event
         * @param movementDirections The Directions being panned in
         */
        private _onPan(context: KeyboardEventContext, movementDirections: PanningDirection[]): boolean;

        /**
         * Handle Macro executions
         * @param context The context data of the event
         */
        private static _onMacroExecute(context: KeyboardEventContext, number: number): boolean;

        /** Handle Macro page swaps */
        private static _onMacroPageSwap(context: KeyboardEventContext, page: number): boolean;

        /**
         * Handle action to copy data to clipboard
         * @param context The context data of the event
         */
        private static _onCopy(context: KeyboardEventContext): boolean;

        /**
         * Handle Paste action
         * @param context The context data of the event
         */
        private static _onPaste(context: KeyboardEventContext): boolean;

        /**
         * Handle Undo action
         * @param context The context data of the event
         */
        private static _onUndo(context: KeyboardEventContext): boolean;

        /**
         * Handle presses to keyboard zoom keys
         * @param context The context data of the event
         * @param zoomDirection The direction to zoom
         */
        private static _onZoom(context: KeyboardEventContext, zoomDirection: "in" | "out"): boolean;
    }

    type PanningDirection = "up" | "right" | "down" | "left";
}
