/**
 * This Canvas Layer provides a container for MeasuredTemplate objects.
 * @extends {PlaceablesLayer}
 * @see {@link MeasuredTemplate}
 */
declare interface TemplateContainer extends PIXI.Container {
    children: MeasuredTemplate[];
}

declare class TemplateLayer extends PlaceablesLayer {
    objects: TemplateContainer;
}
