import type { PointEffectLightSource } from "./point-effect-source-mixes.ts";

export default class PointDarknessSource<
    TObject extends Token | AmbientLight,
> extends PointEffectLightSource<TObject> {}
