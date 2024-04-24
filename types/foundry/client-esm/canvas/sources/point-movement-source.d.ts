import type { PointEffectSource } from "./point-effect-source-mixes.d.ts";

/**
 * A specialized subclass of the BaseEffectSource which describes a movement-based source.
 */
export default class PointMovementSource<TObject extends PlaceableObject> extends PointEffectSource<TObject> {
    static sourceType: "move";
}
