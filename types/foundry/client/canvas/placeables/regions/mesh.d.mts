import AbstractBaseShader from "@client/canvas/rendering/shaders/base-shader.mjs";
import { Point } from "@common/_types.mjs";
import Region from "../region.mjs";

/**
 * A mesh of a {@link Region}.
 */
export default class RegionMesh extends PIXI.Container {
    /**
     * Create a RegionMesh.
     * @param region      The Region to create the RegionMesh from.
     * @param shaderClass The shader class to use.
     */
    constructor(region: Region, shaderClass?: AbstractBaseShader);

    /**
     * The Region of this RegionMesh.
     */
    get region(): RegionMesh;

    /**
     * The shader bound to this RegionMesh.
     */
    get shader(): AbstractBaseShader;

    /**
     * The blend mode assigned to this RegionMesh.
     */
    get blendMode(): PIXI.BLEND_MODES;

    set blendMode(value: PIXI.BLEND_MODES);

    /**
     * The tint applied to the mesh. This is a hex value.
     *
     * A value of 0xFFFFFF will remove any tint effect.
     * @type {number}
     * @default 0xFFFFFF
     */
    get tint(): number;

    set tint(tint: number);

    /**
     * The tint applied to the mesh. This is a hex value. A value of 0xFFFFFF will remove any tint effect.
     */
    protected _tintColor: PIXI.Color;

    /**
     * Used to track a tint or alpha change to execute a recomputation of _cachedTint.
     */
    protected _tintAlphaDirty: boolean;

    /**
     * Initialize shader based on the shader class type.
     * @param shaderClass The shader class, which must inherit from AbstractBaseShader.
     */
    setShaderClass(shaderClass: typeof AbstractBaseShader): void;

    override updateTransform(): void;

    protected override _render(renderer: PIXI.Renderer): void;

    protected override _calculateBounds(): void;

    /**
     * Tests if a point is inside this RegionMesh.
     */
    containsPoint(point: Point): boolean;

    override destroy(options: PIXI.IDestroyOptions): void;
}
