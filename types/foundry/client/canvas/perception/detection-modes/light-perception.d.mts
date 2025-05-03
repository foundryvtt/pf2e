import { CanvasVisibilityTest } from "@client/_module.mjs";
import { PlaceableObject, Token } from "../../placeables/_module.mjs";
import PointVisionSource from "../../sources/point-vision-source.mjs";
import DetectionMode, { TokenDetectionMode } from "../detection-mode.mjs";

/**
 * This detection mode tests whether the target is visible due to being illuminated by a light source.
 * By default tokens have light perception with an infinite range if light perception isn't explicitely
 * configured.
 */
export default class DetectionModeLightPerception extends DetectionMode {
    protected override _testPoint(
        visionSource: PointVisionSource<Token>,
        mode: TokenDetectionMode,
        target: PlaceableObject,
        test: CanvasVisibilityTest,
    ): boolean;
}
