import { ElevatedPoint } from "@common/_types.mjs";
import { PointSourcePolygonConfig } from "../geometry/_module.mjs";
import Edge from "../geometry/edges/edge.mjs";
import { PlaceableObject } from "../placeables/_module.mjs";
import BaseEffectSource, { BaseEffectSourceData, BaseEffectSourceOptions } from "./base-effect-source.mjs";

export interface PointEffectSourceData {
    /** The radius of the source */
    radius: number;
    /** A secondary radius used for limited angles */
    externalRadius: number;
    /** The angle of rotation for this point source */
    rotation: number;
    /** The angle of emission for this point source */
    angle: number;
    /** Whether or not the source is constrained by walls */
    walls: boolean;
    /** Strength of this source to beat or not negative/positive sources */
    priority: number;
}

/**
 * Provides a common framework for effect sources that emanate from a central point and extend within a specific radius.
 * This mixin can be used to manage any effect with a point-based origin, such as light, darkness, or other effects.
 * @param BaseSource  The base source class to extend
 * @mixin
 */
export default function PointEffectSourceMixin<
    TObject extends PlaceableObject<any>,
    TBase extends typeof BaseEffectSource<TObject>,
>(
    BaseSource: TBase,
): {
    defaultData: BaseEffectSourceOptions<TObject>;
    new (...args: any[]): PointEffectSource & InstanceType<TBase>;
} & TBase;

export class PointEffectSource {
    static defaultData: BaseEffectSourceData;

    /**
     * The Edge instances added by this source.
     */
    edges: Edge[];

    /**
     * Whether this Point Effect source can create edges or not.
     * Overriding classes can define dynamic behavior if needed.
     * Default to false so that typical point sources do not create edges.
     */
    get requiresEdges(): boolean;

    /**
     * A convenience reference to the radius of the source.
     */
    get radius(): number;

    /**
     * The priority of this point effect source.
     */
    get priority(): number;

    /**
     * The (elevated) origin of this point effect source.
     */
    get origin(): ElevatedPoint;

    protected _configure(changes: Record<string, unknown>): void;

    protected _initialize(data: Record<string, unknown>): void;

    /* -------------------------------------------- */
    /*  Point Source Geometry Methods               */
    /* -------------------------------------------- */

    protected _initializeSoftEdges(): void;

    /**
     * Configure the parameters of the polygon that is generated for this source.
     */
    protected _getPolygonConfiguration(): PointSourcePolygonConfig;

    protected _createShapes(): void;

    protected _destroy(): void;

    /* -------------------------------------------- */
    /*  Rendering methods                           */
    /* -------------------------------------------- */

    protected _drawMesh(layerId: string): PIXI.Mesh;

    protected _updateGeometry(): void;

    /* -------------------------------------------- */
    /*  Edge Management                             */
    /* -------------------------------------------- */

    /**
     * Create the Edge instances that correspond to this source.
     */
    protected _createEdges(): void;

    /**
     * Remove edges from the active Edges collection.
     */
    protected _deleteEdges(): void;
}
