import { User } from "@client/documents/_module.mjs";
import { SceneControl } from "../../applications/ui/scene-controls.mjs";
import AmbientLight from "../placeables/light.mjs";
import { PlaceablesLayerOptions } from "./_types.mjs";
import PlaceablesLayer, { PlaceablesLayerPointerEvent } from "./base/placeables-layer.mjs";

/**
 * The Lighting Layer which ambient light sources as part of the CanvasEffectsGroup.
 * @category Canvas
 */
export default class LightingLayer<TObject extends AmbientLight = AmbientLight> extends PlaceablesLayer<TObject> {
    static override documentName: "AmbientLight";

    static override get layerOptions(): PlaceablesLayerOptions;

    override get hookName(): string;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _draw(options?: object): Promise<void>;

    protected override _tearDown(options?: object): Promise<void>;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Refresh the fields of all the ambient lights on this scene. */
    refreshFields(): void;

    protected override _activate(): void;

    static override prepareSceneControls(): SceneControl;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _canDragLeftStart(user: User, event: PlaceablesLayerPointerEvent<PIXI.Container>): boolean;

    protected override _onDragLeftStart(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftMove(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftCancel(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onMouseWheel(event: WheelEvent): void;

    /* -------------------------------------------- */

    /**
     * Actions to take when the darkness level of the Scene is changed
     * @param event
     * @internal
     */
    _onDarknessChange(event: PIXI.FederatedEvent): void;
}
