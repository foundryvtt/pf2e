export {};

declare global {
    /**
     * An abstract base class for displaying a heads-up-display interface bound to a Placeable Object on the canvas
     * @todo Fill in
     */
    abstract class BasePlaceableHUD<TPlaceableObject extends PlaceableObject> extends Application {
        /**
         * Reference a PlaceableObject this HUD is currently bound to
         */
        object: TPlaceableObject;

        constructor(...args: ConstructorParameters<typeof Application>);

        /**
         * Bind the HUD to a new PlaceableObject and display it
         * @param object A PlaceableObject instance to which the HUD should be bound
         */
        bind(object: TPlaceableObject): void;

        override getData(): BasePlaceableHUDData<TPlaceableObject>;

        /**
         * Clear the HUD by fading out it's active HTML and recording the new display state
         */
        clear(): void;
    }

    type BasePlaceableHUDData<T extends PlaceableObject> = T["document"]["_source"] & {
        id: string;
        classes: string;
        appId: number;
        isGM: boolean;
        icons: ControlIconsConfig;
    };
}
