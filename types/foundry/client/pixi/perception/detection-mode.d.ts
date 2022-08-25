export {};

declare global {
    /**
     * A Detection Mode which can be associated with any kind of sense/vision/perception.
     * A token could have multiple detection modes.
     */
    class DetectionMode {
        static DETECTION_TYPES: {
            SIGHT: 0; // Sight, and anything depending on light perception
            SOUND: 1; // What you can hear. Includes echolocation for bats per example
            MOVE: 2; // This is mostly a sense for touch and vibration, like tremorsense, movement detection, etc.
            OTHER: 3; // Can't fit in other types (smell, life sense, trans-dimensional sense, sense of humor...)
        };

        /**
         * Test visibility of a target object or array of points for a specific vision source.
         * @param visionSource The vision source being tested
         * @param mode         The detection mode configuration
         * @param config       The visibility test configuration
         * @returns Is the test target visible?
         */
        testVisibility(
            visionSource: VisionSource<Token>,
            mode: DetectionModeConfig,
            config?: CanvasVisibilityTestConfig
        ): boolean;

        /**
         * Can this VisionSource theoretically detect a certain object based on its properties?
         * This check should not consider the relative positions of either object, only their state.
         * @param visionSource The vision source being tested
         * @param target       The target object being tested
         * @returns Can the target object theoretically be detected by this vision source?
         */
        protected _canDetect(visionSource: VisionSource<Token>, target: PlaceableObject): boolean;

        /**
         * Evaluate a single test point to confirm whether it is visible.
         * Standard detection rules require that the test point be both within LOS and within range.
         * @param visionSource The vision source being tested
         * @param mode         The detection mode configuration
         * @param target       The target object being tested
         * @param test         The test case being evaluated
         */
        protected _testPoint(
            visionSource: VisionSource<Token>,
            mode: DetectionModeConfig,
            target: PlaceableObject,
            test: CanvasVisibilityTest
        ): boolean;
    }

    /**
     * A special detection mode which models standard human vision.
     * This mode is the default case which is tested first when evaluating visibility of objects.
     * It is also a special case, in that it is the only detection mode which considers the area of distant light sources.
     */
    class DetectionModeBasicSight extends DetectionMode {}

    interface DetectionModeConfig {
        id: string;
        enabled: boolean;
        range: number;
    }

    type DetectionType = typeof DetectionMode.DETECTION_TYPES[keyof typeof DetectionMode.DETECTION_TYPES];
}
