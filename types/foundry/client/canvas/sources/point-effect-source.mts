import { ElevatedPoint } from "@common/_types.mjs";
import { PointSourcePolygonConfig } from "../geometry/_module.mjs";
import Edge from "../geometry/edges/edge.mjs";
import BaseEffectSource, { BaseEffectSourceData } from "./base-effect-source.mjs";

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
export default function PointEffectSourceMixin<TBase extends AbstractConstructorOf<BaseEffectSource>>(
    BaseSource: TBase,
) {
    abstract class PointEffectSource extends BaseSource {
        /** The Edge instances added by this source. */
        declare edges: Edge[];

        /**
         * Whether this Point Effect source can create edges or not.
         * Overriding classes can define dynamic behavior if needed.
         * Default to false so that typical point sources do not create edges.
         */
        get requiresEdges(): boolean {
            return false;
        }

        /** A convenience reference to the radius of the source. */
        get radius(): number {
            return 0;
        }

        /** The priority of this point effect source. */
        get priority(): number {
            return 0;
        }

        /** The (elevated) origin of this point effect source. */
        get origin(): ElevatedPoint {
            return { x: 0, y: 0, elevation: 0 };
        }

        protected override _configure(changes?: object): void {
            changes;
        }

        protected override _initialize(data?: Partial<BaseEffectSourceData>): void {
            data;
        }

        /* -------------------------------------------- */
        /*  Point Source Geometry Methods               */
        /* -------------------------------------------- */

        protected _initializeSoftEdges(): void {}

        /** Configure the parameters of the polygon that is generated for this source. */
        protected _getPolygonConfiguration(): PointSourcePolygonConfig {
            return {} as PointSourcePolygonConfig;
        }

        protected override _createShapes(): void {}

        protected override _destroy(): void {}

        /* -------------------------------------------- */
        /*  Rendering methods                           */
        /* -------------------------------------------- */

        protected _drawMesh(layerId: string): unknown {
            layerId;
            return;
        }

        protected _updateGeometry(): void {}

        /* -------------------------------------------- */
        /*  Edge Management                             */
        /* -------------------------------------------- */

        /** Create the Edge instances that correspond to this source. */
        protected _createEdges(): void {}

        /** Remove edges from the active Edges collection. */
        protected _deleteEdges(): void {}
    }

    return PointEffectSource;
}
