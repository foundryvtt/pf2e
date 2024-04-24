import type { PointEffectLightSource } from "./point-effect-source-mixes.d.ts";

export default class PointLightSource<TObject extends Token | AmbientLight> extends PointEffectLightSource<TObject> {}
