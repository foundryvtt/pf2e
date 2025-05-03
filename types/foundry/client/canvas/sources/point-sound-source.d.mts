import { Point } from "@common/_types.mjs";
import { PointSourcePolygonConfig } from "../geometry/_types.mjs";
import PlaceableObject from "../placeables/placeable-object.mjs";
import BaseEffectSource from "./base-effect-source.mjs";
import PointEffectSourceMixin from "./point-effect-source.mjs";

/**
 * A specialized subclass of the BaseEffectSource which describes a point-based source of sound.
 */
export default class PointSoundSource<TObject extends PlaceableObject = PlaceableObject> extends PointEffectSourceMixin(
    BaseEffectSource,
)<TObject> {
    static sourceType: "sound";

    protected override _getPolygonConfiguration(): PointSourcePolygonConfig;

    /** Get the effective volume at which an AmbientSound source should be played for a certain listener. */
    getVolumeMultiplier(listener: Point, options?: { easing?: boolean }): number;
}
