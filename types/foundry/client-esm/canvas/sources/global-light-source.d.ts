import type BaseLightSource from "./base-light-source.d.ts";

/**
 * A specialized subclass of the LightSource which is used to render global light source linked to the scene.
 */
export default class GlobalLightSource extends BaseLightSource<null> {}
