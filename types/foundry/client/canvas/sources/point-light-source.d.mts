import { AmbientLight, Token } from "../placeables/_module.mjs";
import type { PointEffectLightSource } from "./point-effect-source-mixes.mjs";

export default class PointLightSource<
    TObject extends Token | AmbientLight | null,
> extends PointEffectLightSource<TObject> {}
