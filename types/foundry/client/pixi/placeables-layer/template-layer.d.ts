export {};

declare global {
    class TemplateLayer<TTemplate extends MeasuredTemplate = MeasuredTemplate> extends PlaceablesLayer<TTemplate> {
        static override get layerOptions(): TemplateLayerOptions;

        static documentName: "MeasuredTemplate";

        override quadtree: CanvasQuadtree<TTemplate>;

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

        protected override _onDragLeftStart(event: PlaceablesLayerEvent<TTemplate>): Promise<TTemplate | void>;

        protected override _onDragLeftMove(event: PlaceablesLayerEvent<TTemplate>): void;

        protected override _onMouseWheel(event: WheelEvent): Promise<TTemplate["document"] | undefined> | void;
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
