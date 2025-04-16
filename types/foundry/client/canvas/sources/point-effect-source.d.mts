import { ElevatedPoint } from "@common/_types.mjs";
import Collection from "@common/utils/collection.mjs";
import { PointSourcePolygonConfig } from "../geometry/_module.mjs";
import Edge from "../geometry/edges/edge.mjs";
import PointSourcePolygon from "../geometry/shapes/source-polygon.mjs";
import BaseEffectSource, { BaseEffectSourceOptions } from "./base-effect-source.mjs";

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
export default function PointEffectSourceMixin<TBase extends typeof BaseEffectSource>(
    BaseSource: TBase,
): {
    new (options?: Partial<BaseEffectSourceOptions>): {
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

        /** @inheritDoc */
        _configure(changes: any): void;
        /** @inheritDoc */
        _initialize(data: any): void;
        /** @inheritDoc */
        _initializeSoftEdges(): void;
        /**
         * Configure the parameters of the polygon that is generated for this source.
         * @returns {PointSourcePolygonConfig}
         * @protected
         */
        _getPolygonConfiguration(): PointSourcePolygonConfig;
        /** @inheritDoc */
        _createShapes(): void;
        shape: PointSourcePolygon<any>;
        /** @inheritDoc */
        _destroy(): void;
        /** @override */
        _drawMesh(layerId: any): any;
        /** @override */
        _updateGeometry(): void;
        _geometry: any;
        /**
         * Create the Edge instances that correspond to this source.
         * @protected
         */
        _createEdges(): void;
        /**
         * Remove edges from the active Edges collection.
         * @protected
         */
        _deleteEdges(): void;
        object: object | null;
        sourceId: string;
        data: object;
        _flags: Record<string, boolean | number>;
        readonly x: number;
        readonly y: number;
        readonly elevation: number;
        readonly effectsCollection: Collection<string, BaseEffectSource>;
        readonly updateId: number;
        "__#197@#updateId": number;
        readonly active: boolean;
        readonly attached: boolean;
        "__#197@#attached": boolean;
        readonly suppressed: boolean;
        suppression: Record<string, boolean>;
        initialize(data?: object, { reset }?: { reset?: boolean }): BaseEffectSource;
        refresh(): void;
        _refresh(): void;
        destroy(): void;
        add(): void;
        remove(): void;
        testPoint(point: ElevatedPoint): boolean;
    };
    /** @inheritDoc */
    defaultData: any;
    sourceType: string;
    effectsCollection: string;
};
