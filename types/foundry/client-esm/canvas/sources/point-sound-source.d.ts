import type { PointEffectSource } from "./point-effect-source-mixes.d.ts";

/**
 * A specialized subclass of the PointSource abstraction which is used to control the rendering of sound sources.
 * @param object The AmbientSound object that generates this sound source
 */
export default class PointSoundSource<TObject extends PlaceableObject> extends PointEffectSource<TObject> {
    static sourceType: "sound";

    protected override _getPolygonConfiguration(): PointSourcePolygonConfig;

    /** Get the effective volume at which an AmbientSound source should be played for a certain listener. */
    getVolumeMultiplier(listener: Point, options?: { easing?: boolean }): number;
}
