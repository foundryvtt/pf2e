import { PointVisionSource } from "@client/canvas/sources/_module.mjs";
import { Point } from "@common/_types.mjs";
import { CanvasVisibilityTestConfiguration, CanvasVisibilityTextureConfiguration } from "../../_types.mjs";
import { CanvasVisionContainer } from "../layers/_types.mjs";
import { AmbientLight, Token } from "../placeables/_module.mjs";
import CanvasGroupMixin from "./canvas-group-mixin.mjs";

/**
 * The visibility group which implements dynamic vision, lighting, and fog of war
 * This group uses an event-driven workflow to perform the minimal required calculation in response to changes.
 *
 * ### Hook Events
 * - {@link hookEvents.initializeVisionMode}
 * - {@link hookEvents.initializeVisionSources}
 * - {@link hookEvents.sightRefresh}
 * - {@link hookEvents.visibilityRefresh}
 */
export default class CanvasVisibility extends CanvasGroupMixin(PIXI.Container) {
    static override groupName: "visibility";

    /**
     * The currently revealed vision.
     */
    vision: CanvasVisionContainer;

    /**
     * The exploration container which tracks exploration progress.
     */
    explored: PIXI.Container;

    /**
     * The optional visibility overlay sprite that should be drawn instead of the unexplored color in the fog of war.
     * @type {PIXI.Sprite}
     */
    visibilityOverlay: PIXI.Sprite;

    /**
     * The active vision source data object
     */
    visionModeData: { source: PointVisionSource<AmbientLight | Token> | null; activeLightingOptions: object };

    /**
     * Define whether each lighting layer is enabled, required, or disabled by this vision mode.
     * The value for each lighting channel is a number in LIGHTING_VISIBILITY
     */
    lightingVisibility: {
        illumination: number;
        background: number;
        coloration: number;
        darkness: number;
        any: boolean;
    };

    /* -------------------------------------------- */
    /*  Canvas Visibility Properties                */
    /* -------------------------------------------- */

    /**
     * A status flag for whether the group initialization workflow has succeeded.
     */
    get initialized(): boolean;

    /**
     * Indicates whether containment filtering is required when rendering vision into a texture.
     */
    get needsContainment(): boolean;

    /**
     * Does the currently viewed Scene support Token field of vision?
     */
    get tokenVision(): boolean;

    /**
     * The configured options used for the saved fog-of-war texture.
     */
    get textureConfiguration(): CanvasVisibilityTextureConfiguration;

    /**
     * Optional overrides for exploration sprite dimensions.
     */
    set explorationRect(rect: PIXI.Rectangle);

    /* -------------------------------------------- */
    /*  Group Initialization                        */
    /* -------------------------------------------- */

    /**
     * Initialize all Token vision sources which are present on this group.
     */
    initializeSources(): void;

    /* -------------------------------------------- */

    /**
     * Initialize the vision mode.
     */
    initializeVisionMode(): void;

    /* -------------------------------------------- */
    /*  Group Rendering                             */
    /* -------------------------------------------- */

    protected override _draw(options?: object): Promise<void>;

    protected override _tearDown(options: object): Promise<void>;

    /**
     * Update the display of the visibility group.
     * Organize sources into rendering queues and draw lighting containers for each source
     */
    refresh(): void;

    /**
     * Update vision (and fog if necessary)
     */
    refreshVisibility(): void;

    /**
     * Reset the exploration container with the fog sprite
     */
    resetExploration(): void;

    /* -------------------------------------------- */
    /*  Visibility Testing                          */
    /* -------------------------------------------- */

    /**
     * Restrict the visibility of certain canvas assets (like Tokens or DoorControls) based on the visibility polygon
     * These assets should only be displayed if they are visible given the current player's field of view
     */
    restrictVisibility(): void;

    /**
     * Test whether a target point on the Canvas is visible based on the current vision and LOS polygons.
     * @param point The point in space to test
     * @param options Additional options which modify visibility testing.
     * @param options.tolerance A numeric radial offset which allows for a non-exact match. For example, if tolerance is
     *                          2 then the test will pass if the point is within 2px of a vision polygon.
     * @param options.object An optional reference to the object whose visibility is being tested
     * @returns Whether the point is currently visible.
     */
    testVisibility(point: Point, options: { tolerance?: number; object?: object | null }): boolean;

    /**
     * Create the visibility test config.
     * @param point The point in space to test
     * @param options Additional options which modify visibility testing.
     * @param options.tolerance A numeric radial offset which allows for a non-exact match. For example, if tolerance is
     *                          2 then the test will pass if the point is within 2px of a vision polygon.
     * @param options.object An optional reference to the object whose visibility is being tested
     * @internal
     */
    _createVisibilityTestConfig(
        point: Point,
        options?: { tolerance?: number; object?: object | null },
    ): CanvasVisibilityTestConfiguration;
}
