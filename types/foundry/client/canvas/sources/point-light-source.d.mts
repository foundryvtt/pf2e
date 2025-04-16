import type { PointEffectLightSource } from "./point-effect-source-mixes.d.mts";

export default class PointLightSource<
    TObject extends Token | AmbientLight | null,
> extends PointEffectLightSource<TObject> {}
