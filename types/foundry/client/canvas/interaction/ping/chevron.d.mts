import { CanvasAnimationData } from "@client/canvas/animation/_types.mjs";
import { Point } from "@common/_types.mjs";
import { ImageFilePath } from "@common/constants.mjs";
import { PingOptions } from "../_types.mjs";
import Ping from "./ping.mjs";

/**
 * A type of ping that points to a specific location.
 */
export default class ChevronPing extends Ping {
    /**
     * @param origin The canvas coordinates of the origin of the ping.
     * @param options Additional options to configure the ping animation.
     */
    constructor(origin: Point, options?: PingOptions);

    /**
     * The path to the chevron texture.
     */
    static CHEVRON_PATH: ImageFilePath;

    override animate(): Promise<boolean>;

    protected override _animateFrame(dt: number, animation: CanvasAnimationData): void;
}
