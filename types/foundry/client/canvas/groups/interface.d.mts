import { Point } from "@common/_types.mjs";
import GridLayer from "../layers/grid.mjs";
import CanvasGroupMixin from "./canvas-group-mixin.mjs";

/** A container group which displays interface elements rendered above other canvas groups. */
export default class InterfaceCanvasGroup extends CanvasGroupMixin(PIXI.Container) {
    grid: GridLayer;

    /**
     * Display scrolling status text originating from this ObjectHUD container.
     * @param origin  An origin point where the text should first emerge
     * @param content The text content to display
     * @param options Options which customize the text animation
     */
    createScrollingText(origin: Point, content: string, options: CreateScrollingTextOptions): Promise<void | null>;
}

interface CreateScrollingTextOptions extends Partial<PIXI.TextStyle> {
    /** The duration of the scrolling effect in milliseconds */
    duration?: number;
    /** The distance in pixels that the scrolling text should travel */
    distance?: number;
    /** An amount of randomization between [0, 1] applied to the initial position */
    jitter?: number;
    /** The original anchor point where the text first appears */
    anchor: number;
    /** The direction in which the text scrolls */
    direction?: number;
    /** Additional parameters of PIXI.TextStyle which are applied to the text */
    textStyle?: PIXI.ITextStyle;
}
