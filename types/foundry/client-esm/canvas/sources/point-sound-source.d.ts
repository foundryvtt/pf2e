import type { PointEffectSource } from "./point-effect-source-mixes.d.ts";

/**
 * A specialized subclass of the BaseEffectSource which describes a point-based source of sound.
 */
export default class PointSoundSource<
    TObject extends PlaceableObject = PlaceableObject,
> extends PointEffectSource<TObject> {
    static sourceType: "sound";

    protected override _getPolygonConfiguration(): PointSourcePolygonConfig;

    /** Get the effective volume at which an AmbientSound source should be played for a certain listener. */
    getVolumeMultiplier(listener: Point, options?: { easing?: boolean }): number;
}
