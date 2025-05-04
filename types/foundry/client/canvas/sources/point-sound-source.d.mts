import { ElevatedPoint } from "@common/_types.mjs";
import Collection from "@common/utils/collection.mjs";
import { PointSourcePolygonConfig } from "../geometry/_types.mjs";
import BaseEffectSource from "./base-effect-source.mjs";
import PointEffectSourceMixin from "./point-effect-source.mjs";

/**
 * A specialized subclass of the BaseEffectSource which describes a point-based source of sound.
 */
export default class PointSoundSource extends PointEffectSourceMixin(BaseEffectSource) {
    static override sourceType: "sound";

    override get effectsCollection(): Collection<string, PointSoundSource>;

    protected override _getPolygonConfiguration(): PointSourcePolygonConfig;

    /**
     * Get the effective volume at which an AmbientSound source should be played for a certain listener.
     */
    getVolumeMultiplier(listener: ElevatedPoint, options?: { easing?: boolean }): number;
}
