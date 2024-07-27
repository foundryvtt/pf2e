export {};

declare global {
    class TemplateLayer<TObject extends MeasuredTemplate = MeasuredTemplate> extends PlaceablesLayer<TObject> {
        static override get layerOptions(): TemplateLayerOptions;

        static documentName: "MeasuredTemplate";

        override quadtree: CanvasQuadtree<TObject>;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        override activate(): this;

        override deactivate(): this;

        /** Register game settings used by the TemplatesLayer */
        static registerSettings(): void;

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */

        protected override _onDragLeftStart(event: PlaceablesLayerPointerEvent<TObject>): Promise<TObject | void>;

        protected override _onDragLeftMove(event: PlaceablesLayerPointerEvent<TObject>): void;

        protected override _onMouseWheel(event: WheelEvent): Promise<TObject> | void;
    }

    /**
     * This Canvas Layer provides a container for MeasuredTemplate objects.
     * @todo: fill this in
     */
    interface TemplateLayerOptions extends PlaceablesLayerOptions {
        name: "templates";
        sortActiveTop: boolean;
        zIndex: number;
    }
}
