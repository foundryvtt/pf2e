import { PlaceableObject, Token } from "../../placeables/_module.mjs";
import PointVisionSource from "../../sources/point-vision-source.mjs";
import DetectionMode from "../detection-mode.mjs";

/**
 * Detection mode that see invisible creatures.
 * This detection mode allows the source to:
 * - See/Detect the invisible target as if visible.
 * - The "See" version needs sight and is affected by blindness
 */
export default class DetectionModeInvisibility extends DetectionMode {
    static override getDetectionFilter(): PIXI.Filter;

    protected override _canDetect(visionSource: PointVisionSource<Token>, target: PlaceableObject): boolean;
}
