/**
 * An extension of PIXI.Mesh which emulate a PIXI.Sprite with a specific shader.
 * @param [texture=PIXI.Texture.EMPTY]      Texture bound to this sprite mesh.
 * @param [shaderClass=BaseSamplerShader]   Shader class used by this sprite mesh.
 * @todo fill in
 */
declare class SpriteMesh extends PIXI.Mesh {
    constructor(texture?: PIXI.Texture, shaderCls?: typeof BaseSamplerShader);

    protected _cachedTint: number[];

    protected _textureID: number;

    protected _textureTrimmedID: number;

    protected _transformTrimmedID: number;

    override isSprite: boolean;

    /**
     * Used to force an alpha mode on this sprite mesh.
     * If this property is non null, this value will replace the texture alphaMode when computing color channels.
     * Affects how tint, worldAlpha and alpha are computed each others.
     */
    get alphaMode(): PIXI.ALPHA_MODES | undefined;

    set alphaMode(mode: PIXI.ALPHA_MODES);

    /**
     * Returns the SpriteMesh associated batch plugin. By default the returned plugin is that of the associated shader.
     * If a plugin is forced, it will returns the forced plugin.
     * @type {string}
     */
    get pluginName(): string;

    set pluginName(name: string);

    override get width(): number;

    override set width(width: number);

    override get height(): number;

    override set height(height: number);

    override get texture(): PIXI.Texture;

    override set texture(texture: PIXI.Texture);

    /**
     * Create a SpriteMesh from another source.
     * You can specify texture options and a specific shader class derived from AbstractBaseShader.
     * @param source           Source to create texture from.
     * @param [textureOptions] See {@link PIXI.BaseTexture}'s constructor for options.
     * @param [shaderCls]      The shader class to use. BaseSamplerShader by default.
     */
    static from(
        source: string | PIXI.Texture | HTMLCanvasElement | HTMLVideoElement,
        textureOptions?: object,
        shaderCls?: typeof AbstractBaseShader
    ): SpriteMesh;
}
