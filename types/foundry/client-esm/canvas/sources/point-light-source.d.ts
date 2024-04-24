import type { PointEffectLightSource } from "./point-effect-source-mixes.d.ts";

export default class PointLightSource<
    TObject extends Token | AmbientLight | null,
> extends PointEffectLightSource<TObject> {}
