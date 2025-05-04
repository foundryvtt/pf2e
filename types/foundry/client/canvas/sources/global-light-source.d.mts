import BaseLightSource from "./base-light-source.mjs";

/**
 * A specialized subclass of the LightSource which is used to render global light source linked to the scene.
 */
export default class GlobalLightSource extends BaseLightSource {}

export default interface GlobalLightSource extends BaseLightSource {
    object: null;
}
