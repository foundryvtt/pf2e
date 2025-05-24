import { ElevatedPoint } from "@common/_types.mjs";
import Collection from "@common/utils/collection.mjs";
import { PointSourcePolygonConfig } from "../geometry/_types.mjs";
import AmbientSound from "../placeables/sound.mjs";
import BaseEffectSource from "./base-effect-source.mjs";
import { PointEffectSource } from "./point-effect-source.mjs";

declare const PointEffectBaseSoundSource: {
    new <TObject extends AmbientSound>(...args: any): BaseEffectSource<TObject> & PointEffectSource;
} & Omit<typeof BaseEffectSource, "new"> &
    typeof PointEffectSource;

interface PointEffectBaseSoundSource<TObject extends AmbientSound>
    extends InstanceType<typeof PointEffectBaseSoundSource<TObject>> {}

/**
 * A specialized subclass of the BaseEffectSource which describes a point-based source of sound.
 */
export default class PointSoundSource<TObject extends AmbientSound> extends PointEffectBaseSoundSource<TObject> {
    static override sourceType: "sound";

    override get effectsCollection(): Collection<string, PointSoundSource<TObject>>;

    protected override _getPolygonConfiguration(): PointSourcePolygonConfig;

    /**
     * Get the effective volume at which an AmbientSound source should be played for a certain listener.
     */
    getVolumeMultiplier(listener: ElevatedPoint, options?: { easing?: boolean }): number;
}
