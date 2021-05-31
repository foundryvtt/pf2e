/**
 * This Canvas Layer provides a container for MeasuredTemplate objects.
 * @todo: fill this in
 */
declare interface TemplateContainer extends PIXI.Container {
    children: MeasuredTemplate[];
}

declare interface TemplateLayerOptions extends LayerOptions {
    name: 'templates';
    sortActiveTop: boolean;
    zIndex: number;
}

declare class TemplateLayer extends PlaceablesLayer<MeasuredTemplate> {
    static get layerOptions(): TemplateLayerOptions;

    static documentName: 'MeasuredTemplate';

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    activate(): this;

    deactivate(): this;

    /** Register game settings used by the TemplatesLayer */
    static registerSettings(): void;

    objects: TemplateContainer;
}
