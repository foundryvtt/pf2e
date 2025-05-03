import PlaceableObject from "../placeables/placeable-object.mjs";
import BaseEffectSource from "./base-effect-source.mjs";
import PointEffectSourceMixin from "./point-effect-source.mjs";

/**
 * A specialized subclass of the BaseEffectSource which describes a movement-based source.
 */
export default class PointMovementSource<TObject extends PlaceableObject> extends PointEffectSourceMixin(
    BaseEffectSource,
)<TObject> {
    static sourceType: "move";
}
