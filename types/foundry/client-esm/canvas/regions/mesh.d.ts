/** A mesh of a {@link Region}. */
export class RegionMesh<TShader extends AbstractBaseShader = RegionShader> extends PIXI.Container {
    /**
     * Create a RegionMesh.
     * @param region           The Region to create the RegionMesh from.
     * @param [shaderClass]    The shader class to use.
     */
    constructor(region: Region, shaderClass?: TShader);

    /** The Region of this RegionMesh. */
    get region(): Region;

    /** The shader bound to this RegionMesh. */
    get shader(): TShader;

    /** The blend mode assigned to this RegionMesh.*/
    get blendMode(): (typeof PIXI.BLEND_MODES)[keyof typeof PIXI.BLEND_MODES];
    set blendMode(value: (typeof PIXI.BLEND_MODES)[keyof typeof PIXI.BLEND_MODES]);

    /**
     * The tint applied to the mesh. This is a hex value.
     *
     * A value of 0xFFFFFF will remove any tint effect.
     * @defaultValue 0xFFFFFF
     */
    get tint(): number;
    set tint(tint: number);

    /** The tint applied to the mesh. This is a hex value. A value of 0xFFFFFF will remove any tint effect. */
    protected _tintColor: PIXI.Color;

    /**
     * Cached tint value for the shader uniforms.
     * @returns [red, green, blue, alpha]
     * @internal
     */
    protected _cachedTint: [number, number, number, number];

    /** Used to track a tint or alpha change to execute a recomputation of _cachedTint. */
    protected _tintAlphaDirty: boolean;

    /**
     * Initialize shader based on the shader class type.
     * @param shaderClass  The shader class, which must inherit from {@link AbstractBaseShader}.
     */
    setShaderClass(shaderClass: AbstractBaseShader): void;

    /**
     * Tests if a point is inside this RegionMesh.
     * @param   point
     */
    containsPoint(point: Point): boolean;
}
