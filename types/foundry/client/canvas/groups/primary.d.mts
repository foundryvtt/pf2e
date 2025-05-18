import Collection from "@common/utils/collection.mjs";
import CachedContainer from "../containers/advanced/cached-container.mjs";
import SpriteMesh from "../containers/elements/sprite-mesh.mjs";
import { CanvasQuadtree } from "../geometry/quad-tree.mjs";
import { Drawing, Tile, Token } from "../placeables/_module.mjs";
import { PrimaryGraphics, PrimarySpriteMesh } from "../primary/_module.mjs";
import { PrimaryCanvasObject } from "../primary/primary-canvas-object.mts";
import PrimaryCanvasGroupAmbienceFilter from "../rendering/filters/environment.mjs";
import CanvasGroupMixin from "./canvas-group-mixin.mjs";

/**
 * The primary Canvas group which generally contains tangible physical objects which exist within the Scene.
 * This group is a {@link foundry.canvas.containers.CachedContainer}
 * which is rendered to the Scene as a {@link foundry.canvas.containers.SpriteMesh}.
 * This allows the rendered result of the Primary Canvas Group to be affected by a
 * {@link foundry.canvas.rendering.shaders.BaseSamplerShader}.
 * @extends {CachedContainer}
 * @mixes CanvasGroupMixin
 * @category Canvas
 */
export default class PrimaryCanvasGroup extends CanvasGroupMixin(CachedContainer) {
    constructor(sprite: SpriteMesh);

    /**
     * Sort order to break ties on the group/layer level.
     */
    static SORT_LAYERS: {
        SCENE: 0;
        TILES: 500;
        DRAWINGS: 600;
        TOKENS: 700;
        WEATHER: 1000;
    };

    static override groupName: "primary";

    static override textureConfiguration: {
        scaleMode: PIXI.SCALE_MODES.NEAREST;
        format: PIXI.FORMATS.RGB;
        multisample: PIXI.MSAA_QUALITY.NONE;
    };

    override clearColor: [0, 0, 0, 0];

    /**
     * The background color in RGB.
     * @internal
     */
    _backgroundColor: [red: number, green: number, blue: number];

    /**
     * Track the set of HTMLVideoElements which are currently playing as part of this group.
     */
    videoMeshes: Set<PrimarySpriteMesh>;

    /**
     * Occludable objects above this elevation are faded on hover.
     */
    hoverFadeElevation: number;

    /**
     * Allow API users to override the default elevation of the background layer.
     * This is a temporary solution until more formal support for scene levels is added in a future release.
     */
    static BACKGROUND_ELEVATION: number;

    /* -------------------------------------------- */
    /*  Group Attributes                            */
    /* -------------------------------------------- */

    /**
     * The primary background image configured for the Scene, rendered as a SpriteMesh.
     */
    background: PrimarySpriteMesh;

    /**
     * The primary foreground image configured for the Scene, rendered as a SpriteMesh.
     */
    foreground: PrimarySpriteMesh;

    /**
     * A Quadtree which partitions and organizes primary canvas objects.
     */
    quadtree: CanvasQuadtree;

    /**
     * The collection of PrimaryDrawingContainer objects which are rendered in the Scene.
     */
    drawings: Collection<string, PrimaryGraphics>;

    /**
     * The collection of SpriteMesh objects which are rendered in the Scene.
     */
    tokens: Collection<string, PrimarySpriteMesh>;

    /**
     * The collection of SpriteMesh objects which are rendered in the Scene.
     */
    tiles: Collection<string, PrimarySpriteMesh>;

    /**
     * The ambience filter which is applying post-processing effects.
     * @internal
     */
    _ambienceFilter: PrimaryCanvasGroupAmbienceFilter;

    /* -------------------------------------------- */
    /*  Group Properties                            */
    /* -------------------------------------------- */

    /**
     * Return the base HTML image or video element which provides the background texture.
     */
    get backgroundSource(): HTMLImageElement | HTMLVideoElement | null;

    /**
     * Return the base HTML image or video element which provides the foreground texture.
     * @returns {HTMLImageElement|HTMLVideoElement|null}
     */
    get foregroundSource(): HTMLImageElement | HTMLVideoElement | null;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /**
     * Refresh the primary mesh.
     */
    refreshPrimarySpriteMesh(): void;

    /**
     * Update this group. Calculates the canvas transform and bounds of all its children and updates the quadtree.
     */
    update(): void;

    protected override _draw(options?: object): Promise<void>;

    protected override _render(renderer: PIXI.Renderer): void;

    /* -------------------------------------------- */
    /*  Tear-Down                                   */
    /* -------------------------------------------- */

    protected override _tearDown(options: object): Promise<void>;

    /* -------------------------------------------- */
    /*  Token Management                            */
    /* -------------------------------------------- */

    /**
     * Draw the SpriteMesh for a specific Token object.
     * @param token The Token being added
     * @returns The added PrimarySpriteMesh
     */
    addToken(token: Token): PrimarySpriteMesh;

    /**
     * Remove a TokenMesh from the group.
     * @param token The Token being removed
     */
    removeToken(token: Token): void;

    /* -------------------------------------------- */
    /*  Tile Management                             */
    /* -------------------------------------------- */

    /**
     * Draw the SpriteMesh for a specific Token object.
     * @param tile The Tile being added
     * @returns The added PrimarySpriteMesh
     */
    addTile(tile: Tile): PrimarySpriteMesh;

    /**
     * Remove a TokenMesh from the group.
     * @param tile The Tile being removed
     */
    removeTile(tile: Tile): void;

    /* -------------------------------------------- */
    /*  Drawing Management                          */
    /* -------------------------------------------- */

    /**
     * Add a PrimaryGraphics to the group.
     * @param drawing The Drawing being added
     * @returns The created PrimaryGraphics instance
     */
    addDrawing(drawing: Drawing): PrimaryGraphics;

    /**
     * Remove a PrimaryGraphics from the group.
     * @param drawing The Drawing being removed
     */
    removeDrawing(drawing: Drawing): void;

    /**
     * Override the default PIXI.Container behavior for how objects in this container are sorted.
     */
    override sortChildren(): void;

    /**
     * The sorting function used to order objects inside the Primary Canvas Group.
     * Overrides the default sorting function defined for the PIXI.Container.
     * Sort Tokens PCO above other objects except WeatherEffects, then Drawings PCO, all else held equal.
     * @param a An object to display
     * @param b Some other object to display
     * @internal
     */
    static _compareObjects(
        a: PrimaryCanvasObject | PIXI.DisplayObject,
        b: PrimaryCanvasObject | PIXI.DisplayObject,
    ): number;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Handle mousemove events on the primary group to update the hovered state of its children.
     * @param currentPos Current mouse position
     * @param hasMouseMoved Has the mouse been moved (or it is a simulated mouse move event)?
     * @internal
     */
    _onMouseMove(currentPos: PIXI.Point, hasMouseMoved: boolean): void;
}
