import SpriteMesh from "../elements/sprite-mesh.mjs";

/**
 * A special type of PIXI.Container which draws its contents to a cached RenderTexture.
 * This is accomplished by overriding the Container#render method to draw to our own special RenderTexture.
 */
export default class CachedContainer extends PIXI.Container {
    /**
     * Construct a CachedContainer.
     * @param sprite A specific sprite to bind to this CachedContainer and its renderTexture.
     */
    constructor(sprite: PIXI.Sprite | SpriteMesh);

    /**
     * The texture configuration to use for this cached container
     */
    static textureConfiguration: {
        multisample: PIXI.MSAA_QUALITY;
        scaleMode: PIXI.SCALE_MODES;
        format: PIXI.FORMATS;
        mipmap?: PIXI.MIPMAP_MODES;
    };

    /**
     * A map of render textures, linked to their render function and an optional RGBA clear color.
     */
    protected _renderPaths: Map<PIXI.RenderTexture, { renderFunction: Function; clearColor: number[] }>;

    /**
     * An RGBA array used to define the clear color of the RenderTexture
     */
    clearColor: number[];

    /**
     * Should our Container also be displayed on screen, in addition to being drawn to the cached RenderTexture?
     */
    displayed: boolean;

    /**
     * If true, the Container is rendered every frame.
     * If false, the Container is rendered only if {@link renderDirty} is true.
     */
    autoRender: boolean;

    /**
     * Does the Container need to be rendered?
     * Set to false after the Container is rendered.
     */
    renderDirty: boolean;

    /**
     * The primary render texture bound to this cached container.
     */
    get renderTexture(): PIXI.RenderTexture;

    /**
     * Set the alpha mode of the cached container render texture.
     */
    set alphaMode(mode: PIXI.ALPHA_MODES);

    /**
     * A PIXI.Sprite or SpriteMesh which is bound to this CachedContainer.
     * The RenderTexture from this Container is associated with the Sprite which is automatically rendered.
     */
    get sprite(): PIXI.Sprite | SpriteMesh;

    set sprite(sprite: PIXI.Sprite | SpriteMesh);

    /**
     * Create a render texture, provide a render method and an optional clear color.
     * @param options.renderFunction Render function that will be called to render into the RT.
     * @param options.clearColor     An optional clear color to clear the RT before rendering into it.
     * @returns A reference to the created render texture.
     */
    createRenderTexture(options?: { renderFunction?: Function; clearColor?: number[] }): PIXI.RenderTexture;

    /**
     * Remove a previously created render texture.
     * @param renderTexture The render texture to remove.
     * @param destroy       Should the render texture be destroyed?
     */
    removeRenderTexture(renderTexture: PIXI.RenderTexture, destroy?: boolean): void;

    /**
     * Clear the cached container, removing its current contents.
     * @param destroy Tell children that we should destroy texture as well.
     * @returns A reference to the cleared container for chaining.
     */
    clear(destroy?: boolean): this;

    /**
     * Removes all internal references and listeners as well as removes children from the display list.
     * Do not use a Container after calling `destroy`.
     */
    override destroy(options?: PIXI.IDestroyOptions | boolean): void;

    /**
     * Renders the object using the WebGL renderer.
     */
    override render(renderer: PIXI.Renderer): void;

    /**
     * Resize a render texture passed as a parameter with the renderer.
     * @param renderer The active canvas renderer.
     * @param rt       The render texture to resize.
     */
    static resizeRenderTexture(renderer: PIXI.Renderer, rt: PIXI.RenderTexture): void;
}
