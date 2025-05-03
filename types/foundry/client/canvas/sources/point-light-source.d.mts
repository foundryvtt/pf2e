import { CanvasVisibilityTestConfiguration } from "@client/_module.mjs";
import Config from "@client/config.mjs";
import { PointSourcePolygonConfig } from "../geometry/_module.mjs";
import { AmbientLight, Token } from "../placeables/_module.mjs";
import BaseLightSource, { LightSourceData } from "./base-light-source.mjs";
import PointEffectSourceMixin from "./point-effect-source.mjs";

/**
 * A specialized subclass of the BaseLightSource which renders a source of light as a point-based effect.
 * @extends {BaseLightSource}
 * @mixes PointEffectSourceMixin
 */
export default class PointLightSource<TObject extends Token | AmbientLight | null> extends PointEffectSourceMixin(
    BaseLightSource,
)<TObject> {
    static override effectsCollection: "lightSources";

    protected static override get ANIMATIONS(): Config["Canvas"]["lightAnimations"];

    override get requiresEdges(): boolean;

    /* -------------------------------------------- */
    /*  Light Source Initialization                 */
    /* -------------------------------------------- */

    protected override _initialize(data?: Partial<LightSourceData>): void;

    protected override _createShapes(): void;

    protected override _configure(changes?: object): void;

    protected override _getPolygonConfiguration(): PointSourcePolygonConfig;

    /* -------------------------------------------- */
    /*  Visibility Testing                          */
    /* -------------------------------------------- */

    /**
     * Test whether this LightSource provides visibility to see a certain target object.
     * @param config The visibility test configuration
     * @returns Is the target object visible to this source?
     */
    testVisibility(config: CanvasVisibilityTestConfiguration): boolean;

    /* -------------------------------------------- */

    /**
     * Can this LightSource theoretically detect a certain object based on its properties?
     * This check should not consider the relative positions of either object, only their state.
     * @param target The target object being tested
     * @returns Can the target object theoretically be detected by this vision source?
     */
    protected _canDetectObject(target: TObject): boolean;
}
