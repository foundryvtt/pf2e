import { PlaceableObject, Token } from "../../placeables/_module.mjs";
import PointVisionSource from "../../sources/point-vision-source.mjs";
import DetectionMode from "../detection-mode.mjs";

/**
 * Detection mode that see ALL creatures (no blockers).
 * If not constrained by walls, see everything within the range.
 */
export default class DetectionModeAll extends DetectionMode {
    static override getDetectionFilter(): PIXI.Filter;

    protected override _canDetect(visionSource: PointVisionSource<Token>, target: PlaceableObject): boolean;
}
