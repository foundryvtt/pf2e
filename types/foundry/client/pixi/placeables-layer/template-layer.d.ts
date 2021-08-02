/**
 * This Canvas Layer provides a container for MeasuredTemplate objects.
 * @todo: fill this in
 */
declare interface TemplateLayerOptions extends PlaceablesLayerOptions {
    name: "templates";
    sortActiveTop: boolean;
    zIndex: number;
}

declare class TemplateLayer<
    TMeasuredTemplate extends MeasuredTemplate = MeasuredTemplate
> extends PlaceablesLayer<TMeasuredTemplate> {
    static override get layerOptions(): TemplateLayerOptions;

    static documentName: "MeasuredTemplate";

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

    protected override _onDragLeftStart(event: PIXI.InteractionEvent): Promise<void>;

    protected override _onDragLeftMove(event: PIXI.InteractionEvent): Promise<void>;

    protected override _onMouseWheel(event: WheelEvent): void;
}
