export {};

declare global {
    /**
     * An abstract base class for displaying a heads-up-display interface bound to a Placeable Object on the canvas
     * @todo Fill in
     */
    abstract class BasePlaceableHUD<TObject extends PlaceableObject | undefined> extends Application {
        /** Reference a PlaceableObject this HUD is currently bound to */
        object: TObject;

        static override get defaultOptions(): ApplicationOptions;

        get document(): NonNullable<TObject>["document"] | undefined;

        get layer(): NonNullable<TObject>["layer"] | undefined;

        /**
         * Bind the HUD to a new PlaceableObject and display it
         * @param object A PlaceableObject instance to which the HUD should be bound
         */
        bind(object: NonNullable<TObject>): void;

        /** Clear the HUD by fading out it's active HTML and recording the new display state */
        clear(): void;

        protected override _render(force?: boolean, options?: RenderOptions): Promise<void>;

        override getData(): BasePlaceableHUDData<NonNullable<TObject>>;

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */

        activateListeners(html: JQuery): void;

        /**
         * Handle mouse clicks to control a HUD control button
         * @param event The originating click event
         */
        protected _onClickControl(event: MouseEvent): void | Promise<void>;

        /**
         * Handle initial click to focus an attribute update field
         * @param event The mouse click event
         */
        protected _onAttributeClick(event: MouseEvent): void;

        /**
         * Force field handling on an Enter keypress even if the value of the field did not change.
         * This is important to suppose use cases with negative number values.
         * @param event The originating keydown event
         */
        protected _onAttributeKeydown(event: KeyboardEvent): void;

        /**
         * Handle attribute updates
         * @param event The originating focusout event
         */
        protected _onAttributeUpdate(event: FocusEvent): void;

        /**
         * Handle attribute bar update
         * @param name  The name of the attribute
         * @param input The raw string input value for the update
         */
        protected _updateAttribute(name: string, input: string): Promise<void>;

        /**
         * Parse an attribute bar input string into a new value for the attribute field.
         * @param name  The name of the attribute
         * @param attr  The current value of the attribute
         * @param input The raw string input value
         * @returns The parsed input value
         */
        protected _parseAttributeInput(
            name: string,
            attr: object | number,
            input: string,
        ): { value: number; delta?: number; isDelta: boolean; isBar: boolean };

        /**
         * Toggle the visible state of all controlled objects in the Layer
         * @param MouseEvent event    The originating click event
         */
        private _onToggleVisibility(event: MouseEvent): Promise<NonNullable<TObject>["document"]>;

        /**
         * Toggle locked state of all controlled objects in the Layer
         * @param {PointerEvent} event    The originating click event
         * @private
         */
        private _onToggleLocked(event: MouseEvent): Promise<NonNullable<TObject>["document"]>;

        /**
         * Handle sorting the z-order of the object
         * @param event The originating mouse click event
         * @param up Move the object upwards in the vertical stack? If false, the object is moved downwards.
         */
        protected _onSort(event: MouseEvent, up: boolean): Promise<void>;
    }

    type BasePlaceableHUDData<TObject extends PlaceableObject> = TObject["document"]["_source"] & {
        id: string;
        classes: string;
        appId: number;
        isGM: boolean;
        icons: ControlIconsConfig;
    };
}
