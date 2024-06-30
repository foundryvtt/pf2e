import { PrimaryOccludableObjectMixin } from "./primary-occludable-object.ts";

/**
 * A basic PCO sprite mesh which is handling occlusion and depth.
 * @param [options] The constructor options.
 * @param [options.texture]     Texture passed to the SpriteMesh.
 * @param [options.shaderClass] The shader class used to render this sprite.
 * @param [options.name]        The name of this sprite.
 * @param [options.object]      Any object that owns this sprite.
 */
/* eslint-disable no-unused-expressions */
export class PrimarySpriteMesh extends PrimaryOccludableObjectMixin(SpriteMesh) {
    constructor(
        options: { texture?: PIXI.Texture; name?: string | null; object?: object },
        shaderClass: typeof PrimaryBaseSamplerShader,
    ) {
        options;
        shaderClass;
        super(options.texture, shaderClass);
    }

    declare object: object | null;

    declare name: string | null;

    /** The texture alpha data. */
    protected declare _textureAlphaData: TextureAlphaData | null;

    /**
     * The texture alpha threshold used for point containment tests.
     * If set to a value larger than 0, the texture alpha data is
     * extracted from the texture at 25% resolution.
     */
    declare textureAlphaThreshold: number;

    /* -------------------------------------------- */
    /*  PIXI Events                                 */
    /* -------------------------------------------- */

    protected override _onTextureUpdate(): void {}

    /* -------------------------------------------- */
    /*  Helper Methods                              */
    /* -------------------------------------------- */

    override setShaderClass(shaderClass: typeof PrimaryBaseSamplerShader): void {
        shaderClass;
    }

    /* -------------------------------------------- */

    /**
     * An all-in-one helper method: Resizing the PCO according to desired dimensions and options.
     * This helper computes the width and height based on the following factors:
     *
     * - The ratio of texture width and base width.
     * - The ratio of texture height and base height.
     *
     * Additionally, It takes into account the desired fit options:
     *
     * - (default) "fill" computes the exact width and height ratio.
     * - "cover" takes the maximum ratio of width and height and applies it to both.
     * - "contain" takes the minimum ratio of width and height and applies it to both.
     * - "width" applies the width ratio to both width and height.
     * - "height" applies the height ratio to both width and height.
     *
     * You can also apply optional scaleX and scaleY options to both width and height. The scale is applied after fitting.
     *
     * **Important**: By using this helper, you don't need to set the height, width, and scale properties of the DisplayObject.
     *
     * **Note**: This is a helper method. Alternatively, you could assign properties as you would with a PIXI DisplayObject.
     *
     * @param baseWidth             The base width used for computations.
     * @param baseHeight            The base height used for computations.
     * @param [options]             The options.
     * @param [options.fit="fill"]  The fit type.
     * @param [options.scaleX=1]    The scale on X axis.
     * @param [options.scaleY=1]    The scale on Y axis.
     */
    resize(
        baseWidth: number,
        baseHeight: number,
        options?: {
            fit?: "fill" | "cover" | "contain" | "width" | "height";
            scaleX?: number;
            scaleY?: number;
        },
    ): void {
        baseWidth;
        baseHeight;
        options;
    }

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    protected override _updateBatchData(): void {}

    protected override _calculateCanvasBounds(): void {}

    /**
     * Is the given point in canvas space contained in this object?
     * @param point                   The point in canvas space
     * @param [textureAlphaThreshold] The minimum texture alpha required for containment
     */
    override containsCanvasPoint(point: PIXI.IPointData, textureAlphaThreshold?: number): boolean {
        point;
        textureAlphaThreshold;
        return true;
    }

    /**
     * Is the given point in world space contained in this object?
     * @param point                   The point in world space
     * @param [textureAlphaThreshold] The minimum texture alpha required for containment
     */
    override containsPoint(point: PIXI.IPointData, textureAlphaThreshold?: number): boolean {
        point;
        textureAlphaThreshold;
        return true;
    }

    /* -------------------------------------------- */
    /*  Rendering Methods                           */
    /* -------------------------------------------- */

    override renderDepthData(renderer: PIXI.Renderer): void {
        renderer;
    }

    /* -------------------------------------------- */

    /**
     * Render the sprite with ERASE blending.
     * Note: The sprite must not have visible/renderable children.
     * @param renderer The renderer
     * @internal
     */
    _renderVoid(renderer: PIXI.Renderer): void {
        renderer;
    }
}
