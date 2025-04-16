import { PlaceableObject, Token } from "../../placeables/_module.mjs";
import PointVisionSource from "../../sources/point-vision-source.mjs";
import DetectionMode from "../detection-mode.mjs";

/**
 * A special detection mode which models a form of darkvision (night vision).
 * This mode is the default case which is tested first when evaluating visibility of objects.
 */
export default class DetectionModeDarkvision extends DetectionMode {
    protected override _canDetect(visionSource: PointVisionSource<Token>, target: PlaceableObject): boolean;
}
