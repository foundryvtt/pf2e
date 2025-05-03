import OutlineOverlayFilter from "@client/canvas/rendering/filters/outline-overlay.mjs";
import { PlaceableObject, Token } from "../../placeables/_module.mjs";
import PointVisionSource from "../../sources/point-vision-source.mjs";
import DetectionMode from "../detection-mode.mjs";

/**
 * Detection mode that see creatures in contact with the ground.
 */
export default class DetectionModeTremor extends DetectionMode {
    static override getDetectionFilter(): OutlineOverlayFilter;

    protected override _canDetect(visionSource: PointVisionSource<Token>, target: PlaceableObject): boolean;
}
