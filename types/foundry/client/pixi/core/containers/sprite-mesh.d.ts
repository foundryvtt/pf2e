/**
 * An extension of PIXI.Mesh which emulate a PIXI.Sprite with a specific shader.
 * @param [texture=PIXI.Texture.EMPTY]      Texture bound to this sprite mesh.
 * @param [shaderClass=BaseSamplerShader]   Shader class used by this sprite mesh.
 */
declare class SpriteMesh extends PIXI.Container {
    constructor(texture?: PIXI.Texture, shaderClass?: typeof BaseSamplerShader);

    /** Snapshot of some parameters of this display object to render in batched mode. */
    protected _batchData: {
        _texture: PIXI.Texture;
        _tintRGB: number;
        blendMode: PIXI.BLEND_MODES;
        indices: number[];
        object: SpriteMesh;
        uvs: number[];
        vertexData: number[];
        worldAlpha: number;
    };

    /** The indices of the geometry. */
    indices: Uint16Array;

    /** The width of the sprite (this is initially set by the texture). */
    protected _width: number;

    /** The height of the sprite (this is initially set by the texture) */
    protected _height: number;

    /** The texture that the sprite is using. */
    protected _texture: PIXI.Texture;

    /** The texture ID. */
    protected _textureID: number;

    /**
     * Cached tint value so we can tell when the tint is changed.
     * @type {[red: number, green: number, blue: number, alpha: number]}
     * @internal
     */
    protected _cachedTint: [red: number, green: number, blue: number, alpha: number];

    /** The texture trimmed ID. */
    protected _textureTrimmedID: number;

    /**
     * This is used to store the uvs data of the sprite, assigned at the same time
     * as the vertexData in calculateVertices().
     */
    protected uvs: Float32Array;

    /**
     * The anchor point defines the normalized coordinates
     * in the texture that map to the position of this
     * sprite.
     *
     * By default, this is `(0,0)` (or `texture.defaultAnchor`
     * if you have modified that), which means the position
     * `(x,y)` of this `Sprite` will be the top-left corner.
     *
     * Note: Updating `texture.defaultAnchor` after
     * constructing a `Sprite` does _not_ update its anchor.
     *
     * {@link https://docs.cocos2d-x.org/cocos2d-x/en/sprites/manipulation.html}
     * @defaultValue `this.texture.defaultAnchor`
     */
    protected _anchor: PIXI.ObservablePoint;

    /** This is used to store the vertex data of the sprite (basically a quad). */
    protected vertexData: Float32Array;

    /** This is used to calculate the bounds of the object IF it is a trimmed sprite. */
    protected vertexTrimmedData: Float32Array | null;

    /** The transform ID. */
    protected _transformID: number;

    /** The transform ID. */
    protected _transformTrimmedID: number;

    /** The tint applied to the sprite. This is a hex value. A value of 0xFFFFFF will remove any tint effect. */
    protected _tintColor: PIXI.Color;

    /** The tint applied to the sprite. This is a RGB value. A value of 0xFFFFFF will remove any tint effect. */
    protected _tintRGB: number;

    /**
     * An instance of a texture uvs used for padded SpriteMesh.
     * Instanced only when padding becomes non-zero.
     */
    protected _textureUvs: PIXI.TextureUvs | null;

    /** Used to track a tint or alpha change to execute a recomputation of _cachedTint. */
    protected _tintAlphaDirty: boolean;

    /** The shader bound to this mesh. */
    get shader(): BaseSamplerShader;

    /** The shader bound to this mesh. */
    protected _shader: BaseSamplerShader;

    /** The x padding in pixels (must be a non-negative value.) */
    get paddingX(): number;
    set paddingX(value: number);

    /** They y padding in pixels (must be a non-negative value.) */
    get paddingY(): number;
    set paddingY(value: number);

    /** The maximum x/y padding in pixels (must be a non-negative value.) */
    get padding(): number;
    set padding(value: number);

    protected _paddingX: number;
    protected _paddingY: number;

    /**
     * The blend mode applied to the SpriteMesh.
     * @defaultValue PIXI.BLEND_MODES.NORMAL
     */
    get blendMode(): PIXI.BLEND_MODES;
    set blendMode(value: PIXI.BLEND_MODES);

    /**
     * If true PixiJS will Math.round() x/y values when rendering, stopping pixel interpolation.
     * Advantages can include sharper image quality (like text) and faster rendering on canvas.
     * The main disadvantage is movement of objects may appear less smooth.
     * To set the global default, change PIXI.settings.ROUND_PIXELS
     * @defaultValue PIXI.settings.ROUND_PIXELS
     */
    get roundPixels(): boolean;
    set roundPixels(value: boolean);

    /**
     * Used to force an alpha mode on this sprite mesh.
     * If this property is non null, this value will replace the texture alphaMode when computing color channels.
     * Affects how tint, worldAlpha and alpha are computed each others.
     */
    get alphaMode(): PIXI.ALPHA_MODES;
    set alphaMode(mode: PIXI.ALPHA_MODES);

    /**
     * Returns the SpriteMesh associated batch plugin. By default the returned plugin is that of the associated shader.
     * If a plugin is forced, it will returns the forced plugin.
     */
    get pluginName(): string;
    set pluginName(name: string);

    override get width(): number;
    override set width(width: number);

    override get height(): number;
    override set height(height: number);

    /** The texture that the sprite is using. */
    get texture(): PIXI.Texture;
    set texture(texture: PIXI.Texture | null);

    /**
     * The anchor sets the origin point of the sprite. The default value is taken from the {@link PIXI.Texture|Texture}
     * and passed to the constructor.
     *
     * The default is `(0,0)`, this means the sprite's origin is the top left.
     *
     * Setting the anchor to `(0.5,0.5)` means the sprite's origin is centered.
     *
     * Setting the anchor to `(1,1)` would mean the sprite's origin point will be the bottom right corner.
     *
     * If you pass only single parameter, it will set both x and y to the same value as shown in the example below.
     */
    get anchor(): PIXI.ObservablePoint;
    set anchor(anchor: PIXI.ObservablePoint);

    /**
     * The tint applied to the sprite. This is a hex value.
     *
     * A value of 0xFFFFFF will remove any tint effect.
     * @defaultValue 0xFFFFFF
     */
    get tint(): number;
    set tint(tint: number);

    /** The HTML source element for this SpriteMesh texture. */
    get sourceElement(): HTMLImageElement | HTMLVideoElement | null;

    /** Is this SpriteMesh rendering a video texture? */
    get isVideo(): boolean;

    /** When the texture is updated, this event will fire to update the scale and frame. */
    protected _onTextureUpdate(): void;

    /** Called when the anchor position updates. */
    protected _onAnchorUpdate(): void;

    /** Update uvs and push vertices and uv buffers on GPU if necessary. */
    updateUvs(): void;

    /**
     * Initialize shader based on the shader class type.
     * @param shaderClass The shader class
     */
    setShaderClass(shaderClass: typeof BaseSamplerShader): void;

    override updateTransform(): void;

    /** Calculates worldTransform * vertices, store it in vertexData. */
    calculateVertices(): void;

    /**
     * Calculates worldTransform * vertices for a non texture with a trim. store it in vertexTrimmedData.
     * This is used to ensure that the true width and height of a trimmed texture is respected.
     */
    calculateTrimmedVertices(): void;

    protected override _render(renderer: PIXI.Renderer): void;

    /** Update the batch data object. */
    protected _updateBatchData(): void;

    protected override _calculateBounds(): void;

    override getLocalBounds(rect: PIXI.Rectangle): PIXI.Rectangle;

    containsPoint(point: Point): boolean;

    override destroy(options?: boolean | PIXI.IDestroyOptions): void;

    /**
     * Create a SpriteMesh from another source.
     * You can specify texture options and a specific shader class derived from BaseSamplerShader.
     * @param {string|PIXI.Texture|HTMLCanvasElement|HTMLVideoElement} source  Source to create texture from.
     * @param {object} [textureOptions]               See {@link PIXI.BaseTexture}'s constructor for options.
     * @param {BaseSamplerShader} [shaderClass]       The shader class to use. BaseSamplerShader by default.
     * @returns {SpriteMesh}
     */
    static from(
        source: string | PIXI.Texture | HTMLCanvasElement | HTMLVideoElement,
        textureOptions: PIXI.IBaseTextureOptions,
        shaderClass: BaseSamplerShader,
    ): SpriteMesh;
}
