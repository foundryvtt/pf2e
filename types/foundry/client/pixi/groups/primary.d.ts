export {};

declare global {
    /**
     * The primary Canvas group which generally contains tangible physical objects which exist within the Scene.
     * This group is a {@link CachedContainer} which is rendered to the Scene as a {@link SpriteMesh}.
     * This allows the rendered result of the Primary Canvas Group to be affected by a {@link BaseSamplerShader}.
     * @category - Canvas
     * @todo Fill in
     */
    class PrimaryCanvasGroup extends CachedContainer {}
}
