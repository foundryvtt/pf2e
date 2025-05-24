import { CanvasVisibilityTestConfiguration } from "@client/_module.mjs";
import { PointSourcePolygonConfig } from "../geometry/_types.mjs";
import { AmbientLight, PlaceableObject, Token } from "../placeables/_module.mjs";
import BaseLightSource from "./base-light-source.mjs";
import { PointEffectSource } from "./point-effect-source.mjs";

declare const PointEffectBaseLightSource: {
    new <TObject extends Token | AmbientLight | null>(...args: any): BaseLightSource<TObject> & PointEffectSource;
} & Omit<typeof BaseLightSource, "new"> &
    typeof PointEffectSource;

interface PointEffectBaseLightSource<TObject extends AmbientLight | Token | null>
    extends InstanceType<typeof PointEffectBaseLightSource<TObject>> {}

/**
 * A specialized subclass of the BaseLightSource which renders a source of light as a point-based effect.
 */
export default class PointLightSource<
    TObject extends AmbientLight | Token,
> extends PointEffectBaseLightSource<TObject> {
    static override effectsCollection: "lightSources";

    override get requiresEdges(): boolean;

    /* -------------------------------------------- */
    /*  Light Source Initialization                 */
    /* -------------------------------------------- */

    protected override _initialize(data: Record<string, unknown>): void;

    protected override _createShapes(): void;

    protected override _configure(changes: Record<string, unknown>): void;

    protected override _getPolygonConfiguration(): PointSourcePolygonConfig;

    /* -------------------------------------------- */
    /*  Visibility Testing                          */
    /* -------------------------------------------- */

    /**
     * Test whether this LightSource provides visibility to see a certain target object.
     * @param config The visibility test configuration
     * @returns Is the target object visible to this source?
     */
    testVisibility({ tests, object }: CanvasVisibilityTestConfiguration): boolean;

    /**
     * Can this LightSource theoretically detect a certain object based on its properties?
     * This check should not consider the relative positions of either object, only their state.
     * @param target The target object being tested
     * @returns Can the target object theoretically be detected by this vision source?
     */
    protected _canDetectObject(target: PlaceableObject): boolean;
}

export {};
