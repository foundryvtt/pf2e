/**
 * Provide the necessary methods to get a snapshot of the framebuffer into a render texture.
 * Class meant to be used as a singleton.
 * Created with the precious advices of dev7355608.
 */
export default class FramebufferSnapshot {
    constructor();

    /**
     * The RenderTexture that is the render destination for the framebuffer snapshot.
     */
    framebufferTexture: PIXI.RenderTexture;

    /**
     * Get the framebuffer texture snapshot.
     * @param renderer The renderer for this context.
     * @returns The framebuffer snapshot.
     */
    getFramebufferTexture(renderer: PIXI.Renderer): PIXI.RenderTexture;
}
