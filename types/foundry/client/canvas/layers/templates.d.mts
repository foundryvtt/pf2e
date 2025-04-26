import { SceneControl } from "../../applications/ui/scene-controls.mjs";
import MeasuredTemplate from "../placeables/template.mjs";
import { PlaceablesLayerOptions } from "./_types.mjs";
import PlaceablesLayer, { PlaceablesLayerPointerEvent } from "./base/placeables-layer.mjs";

/**
 * This Canvas Layer provides a container for MeasuredTemplate objects.
 * @category Canvas
 */
export default class TemplateLayer<
    TObject extends MeasuredTemplate = MeasuredTemplate,
> extends PlaceablesLayer<TObject> {
    static override get layerOptions(): PlaceablesLayerOptions;

    static override documentName: "MeasuredTemplate";

    override get hookName(): string;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    override _getCopyableObjects(options?: object): TObject[];

    protected override _deactivate(): void;

    protected override _draw(options?: object): Promise<void>;

    /** Register game settings used by the TemplatesLayer */
    static registerSettings(): void;

    static override prepareSceneControls(): SceneControl;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _onDragLeftStart(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftMove(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onMouseWheel(event: WheelEvent): void;
}
