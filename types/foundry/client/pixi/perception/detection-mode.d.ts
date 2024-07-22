import type { PointVisionSource } from "../../../client-esm/canvas/sources/module.ts";
import type * as fields from "../../../common/data/fields.d.ts";

declare global {
    /**
     * A Detection Mode which can be associated with any kind of sense/vision/perception.
     * A token could have multiple detection modes.
     */
    class DetectionMode extends foundry.abstract.DataModel<null, DetectionModeSchema> {
        id: string;
        label: string;
        tokenConfig: boolean;
        walls: boolean;
        type: DetectionType;

        static override defineSchema(): DetectionModeSchema;

        /** Get the detection filter pertaining to this mode. */
        static getDetectionFilter(): PIXI.Filter | undefined;

        /** An optional filter to apply on the target when it is detected with this mode. */
        protected static _detectionFilter: PIXI.Filter | undefined;

        /**
         * The type of the detection mode. If its sight based, sound based, etc.
         * It is related to wall's WALL_RESTRICTION_TYPES
         * @see CONST.WALL_RESTRICTION_TYPES
         */
        static DETECTION_TYPES: {
            SIGHT: 0; // Sight, and anything depending on light perception
            SOUND: 1; // What you can hear. Includes echolocation for bats per example
            MOVE: 2; // This is mostly a sense for touch and vibration, like tremorsense, movement detection, etc.
            OTHER: 3; // Can't fit in other types (smell, life sense, trans-dimensional sense, sense of humor...)
        };

        /** The identifier of the basic sight detection mode. */
        static BASIC_MODE_ID: string;

        /* -------------------------------------------- */
        /*  Visibility Testing                          */
        /* -------------------------------------------- */

        /**
         * Test visibility of a target object or array of points for a specific vision source.
         * @param visionSource The vision source being tested
         * @param mode         The detection mode configuration
         * @param config       The visibility test configuration
         * @returns Is the test target visible?
         */
        testVisibility(
            visionSource: PointVisionSource<Token>,
            mode: TokenDetectionMode,
            config?: CanvasVisibilityTestConfig,
        ): boolean;

        /**
         * Can this VisionSource theoretically detect a certain object based on its properties?
         * This check should not consider the relative positions of either object, only their state.
         * @param visionSource The vision source being tested
         * @param target       The target object being tested
         * @returns Can the target object theoretically be detected by this vision source?
         */
        protected _canDetect(visionSource: PointVisionSource<Token>, target: PlaceableObject): boolean;

        /**
         * Evaluate a single test point to confirm whether it is visible.
         * Standard detection rules require that the test point be both within LOS and within range.
         * @param visionSource The vision source being tested
         * @param mode         The detection mode configuration
         * @param target       The target object being tested
         * @param test         The test case being evaluated
         */
        protected _testPoint(
            visionSource: PointVisionSource<Token>,
            mode: TokenDetectionMode,
            target: PlaceableObject,
            test: CanvasVisibilityTest,
        ): boolean;

        /**
         * Test whether the line-of-sight requirement for detection is satisfied.
         * Always true if the detection mode bypasses walls, otherwise the test point must be contained by the LOS polygon.
         * The result of is cached for the vision source so that later checks for other detection modes do not repeat it.
         * @param visionSource The vision source being tested
         * @param mode         The detection mode configuration
         * @param target       The target object being tested
         * @param test         The test case being evaluated
         * @returns Is the LOS requirement satisfied for this test?
         */
        protected _testLOS(
            visionSource: PointVisionSource<Token>,
            mode: TokenDetectionMode,
            target: PlaceableObject,
            test: CanvasVisibilityTest,
        ): boolean;

        /**
         * Test whether the target is within the vision angle.
         * @param {VisionSource} visionSource       The vision source being tested
         * @param {TokenDetectionMode} mode         The detection mode configuration
         * @param {PlaceableObject} target          The target object being tested
         * @param {CanvasVisibilityTest} test       The test case being evaluated
         * @returns                       Is the point within the vision angle?
         */
        protected _testAngle(
            visionSource: PointVisionSource,
            mode: TokenDetectionMode,
            target: PlaceableObject,
            test: CanvasVisibilityTest,
        ): boolean;

        /**
         * Verify that a target is in range of a source.
         * @param visionSource The vision source being tested
         * @param mode         The detection mode configuration
         * @param target       The target object being tested
         * @param test         The test case being evaluated
         * @returns Is the target within range?
         */
        protected _testRange(
            visionSource: PointVisionSource<Token>,
            mode: TokenDetectionMode,
            target: PlaceableObject,
            test: CanvasVisibilityTest,
        ): boolean;
    }

    /**
     * This detection mode tests whether the target is visible due to being illuminated by a light source.
     * By default tokens have light perception with an infinite range if light perception isn't explicitely
     * configured.
     */
    class DetectionModeLightPerception extends DetectionMode {
        protected override _testPoint(
            visionSource: PointVisionSource<Token>,
            mode: TokenDetectionMode,
            target: PlaceableObject,
            test: CanvasVisibilityTest,
        ): boolean;
    }

    /**
     * A special detection mode which models a form of darkvision (night vision).
     * This mode is the default case which is tested first when evaluating visibility of objects.
     */
    class DetectionModeBasicSight extends DetectionMode {
        protected override _testPoint(
            visionSource: PointVisionSource<Token>,
            mode: TokenDetectionMode,
            target: PlaceableObject,
            test: CanvasVisibilityTest,
        ): boolean;
    }

    /**
     * Detection mode that see invisible creatures.
     * This detection mode allows the source to:
     * - See/Detect the invisible target as if visible.
     * - The "See" version needs sight and is affected by blindness
     */
    class DetectionModeInvisibility extends DetectionMode {
        static override getDetectionFilter(): PIXI.Filter;

        protected override _canDetect(visionSource: PointVisionSource<Token>, target: PlaceableObject): boolean;
    }

    /**
     * Detection mode that see creatures in contact with the ground.
     */
    class DetectionModeTremor extends DetectionMode {
        static override getDetectionFilter(): OutlineOverlayFilter;

        protected override _canDetect(visionSource: PointVisionSource<Token>, target: PlaceableObject): boolean;
    }

    /**
     * Detection mode that see ALL creatures (no blockers).
     * If not constrained by walls, see everything within the range.
     */
    class DetectionModeAll extends DetectionMode {
        static override getDetectionFilter(): PIXI.Filter;

        protected override _canDetect(visionSource: PointVisionSource<Token>, target: PlaceableObject): boolean;
    }

    interface TokenDetectionMode {
        /** The id of the detection mode, a key from CONFIG.Canvas.detectionModes */
        id: string;
        /** Whether or not this detection mode is presently enabled */
        enabled: boolean;
        /** The maximum range in distance units at which this mode can detect targets.
         *  If null, the detection range is unlimited.
         */
        range: number | null;
    }

    type DetectionType = (typeof DetectionMode.DETECTION_TYPES)[keyof typeof DetectionMode.DETECTION_TYPES];
}

type DetectionModeSchema = {
    id: fields.StringField;
    label: fields.StringField;
    tokenConfig: fields.BooleanField;
    walls: fields.BooleanField;
    angle: fields.BooleanField;
    type: fields.NumberField;
};
