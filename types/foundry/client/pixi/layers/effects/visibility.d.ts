import type { PointVisionSource } from "../../../../client-esm/canvas/sources/module.ts";

declare global {
    /**
     * The visibility Layer which implements dynamic vision, lighting, and fog of war
     * This layer uses an event-driven workflow to perform the minimal required calculation in response to changes.
     * @see {@link PointSource}
     * @category - Canvas
     *
     * @property explored The exploration container which tracks exploration progress
     * @property vision   The container of current vision exploration
     */
    class CanvasVisibility extends CanvasLayer {
        /** The current vision container which provides line-of-sight for vision sources and field-of-view of light sources. */
        vision: PIXI.Container;

        /** The canonical line-of-sight polygon which defines current Token visibility. */
        los: PIXI.Graphics;

        /** The optional visibility overlay sprite that should be drawn instead of the unexplored color in the fog of war. */
        visibilityOverlay: PIXI.Sprite;

        /** The active vision source data object */
        visionModeData: {
            source: PointVisionSource | null;
            activeLightingOptions: object;
        };

        /**
         * Define whether each lighting layer is enabled, required, or disabled by this vision mode.
         * The value for each lighting channel is a number in LIGHTING_VISIBILITY
         */
        lightingVisibility: {
            background: LightingVisibility;
            illumination: LightingVisibility;
            coloration: LightingVisibility;
            any: boolean;
        };

        /* -------------------------------------------- */
        /*  Canvas Visibility Properties                */
        /* -------------------------------------------- */

        /** A status flag for whether the layer initialization workflow has succeeded. */
        get initialized(): boolean;

        /** Does the currently viewed Scene support Token field of vision? */
        get tokenVision(): boolean;

        /** The configured options used for the saved fog-of-war texture. */
        get textureConfiguration(): FogTextureConfiguration;

        /** Optional overrides for exploration sprite dimensions. */
        set explorationRect(rect: FogTextureConfiguration);

        /* -------------------------------------------- */
        /*  Layer Initialization                        */
        /* -------------------------------------------- */

        /**
         * Initialize all Token vision sources which are present on this layer
         */
        initializeSources(): void;

        /* -------------------------------------------- */
        /*  Layer Rendering                             */
        /* -------------------------------------------- */

        protected _draw(options: object): Promise<void>;

        protected override _tearDown(options: object): Promise<void>;

        /**
         * Update the display of the sight layer.
         * Organize sources into rendering queues and draw lighting containers for each source
         */
        refresh(): void;

        /** Update vision (and fog if necessary) */
        refreshVisibility(): void;

        /** Reset the exploration container with the fog sprite */
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
         * @param point     The point in space to test, an object with coordinates x and y.
         * @param [options] Additional options which modify visibility testing.
         * @param [options.tolerance=2] A numeric radial offset which allows for a non-exact match.
         *                              For example, if tolerance is 2 then the test will pass if the point
         *                              is within 2px of a vision polygon.
         * @param [options.object]      An optional reference to the object whose visibility is being tested
         * @returns Whether the point is currently visible.
         */
        testVisibility(point: Point, options?: { tolerance?: number; object?: object | null }): boolean;
    }

    interface VisibilityTextureConfiguration {
        resolution: number;
        width: number;
        height: number;
        mipmap: PIXI.MIPMAP_MODES;
        scaleMode: PIXI.SCALE_MODES;
        multisample: PIXI.MSAA_QUALITY;
    }

    interface FogTextureConfiguration extends VisibilityTextureConfiguration {
        alphaMode: PIXI.ALPHA_MODES;
        format: PIXI.FORMATS;
    }

    interface CanvasVisibilityTestConfig {
        /** The target object */
        object: object | null;
        /** An array of visibility tests */
        tests: CanvasVisibilityTest[];
    }

    interface CanvasVisibilityTest {
        point: Point;
        elevation: number;
        los: Map<PointVisionSource<Token>, boolean>;
    }
}
