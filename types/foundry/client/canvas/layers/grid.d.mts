import { SceneDimensions } from "@client/documents/_types.mjs";
import { GridType } from "@common/constants.mjs";
import Color from "@common/utils/color.mjs";
import { GridHighlight, GridMesh } from "../containers/_module.mjs";
import CanvasLayer, { CanvasLayerOptions } from "./base/canvas-layer.mjs";

/**
 * A CanvasLayer responsible for drawing a square grid
 */
export default class GridLayer extends CanvasLayer {
    /**
     * The grid mesh.
     */
    mesh: GridMesh;

    /**
     * The Grid Highlight container
     */
    highlight: PIXI.Container;

    /**
     * Map named highlight layers
     * @type {}
     */
    highlightLayers: Record<string, GridHighlight>;

    static override get layerOptions(): GridLayerOptions;

    static override get instance(): GridLayer;

    protected override _draw(options?: object): Promise<void>;

    /**
     * Creates the grid mesh.
     */
    protected _drawMesh(): Promise<GridMesh>;

    /**
     * Initialize the grid mesh appearance and configure the grid shader.
     * @param options.style     The grid style
     * @param options.thickness The grid thickness
     * @param options.color     The grid color
     * @param options.alpha     The grid alpha
     */
    initializeMesh(options?: { style: string; thickness?: number; color?: string; alpha?: number }): void;

    /* -------------------------------------------- */
    /*  Grid Highlighting Methods                   */
    /* -------------------------------------------- */

    /**
     * Define a new Highlight graphic
     * @param name The name for the referenced highlight layer
     */
    addHighlightLayer(name: string): GridHighlight | undefined;

    /**
     * Clear a specific Highlight graphic
     * @param name The name for the referenced highlight layer
     */
    clearHighlightLayer(name: string): void;
    /**
     * Destroy a specific Highlight graphic
     * @param name The name for the referenced highlight layer
     */
    destroyHighlightLayer(name: string): void;

    /**
     * Obtain the highlight layer graphic by name
     * @param {string} name     The name for the referenced highlight layer
     */
    getHighlightLayer(name: string): GridHighlight | undefined;

    /**
     * Add highlighting for a specific grid position to a named highlight graphic
     * @param name    The name for the referenced highlight layer
     * @param options Options for the grid position that should be highlighted
     * @param options.x      The x-coordinate of the highlighted position
     * @param options.y      The y-coordinate of the highlighted position
     * @param options.color  The fill color of the highlight
     * @param options.border The border color of the highlight
     * @param options.alpha  The opacity of the highlight
     * @param options.shape  A predefined shape to highlight
     */
    highlightPosition(
        name: string,
        options: {
            x: number;
            y: number;
            color?: Maybe<number | Color>;
            border?: PIXI.ColorSource | null;
            alpha?: number;
            shape?: PIXI.Polygon | null;
        },
    ): void;
}

interface GridDrawOptions {
    type?: GridType | null;
    dimensions?: SceneDimensions | null;
    gridColor?: string | null;
    gridAlpha?: number | null;
}

interface MeasureDistancesOptions {
    /** Return the distance in grid increments rather than the co-ordinate distance. */
    gridSpaces?: boolean;
}

interface GridLayerOptions extends CanvasLayerOptions {
    name: "grid";
}
