import { TokenMovementActionConfig, TokenRulerData, TokenRulerWaypoint } from "@client/_module.mjs";
import { GridOffset3D } from "@common/grid/_types.mjs";
import { Token } from "../_module.mjs";
import BaseTokenRuler from "./base-ruler.mjs";

/**
 * The default implementation of the Token ruler.
 */
export default class TokenRuler<TObject extends Token> extends BaseTokenRuler<TObject> {
    constructor(token: TObject);

    /**
     * A handlebars template used to render each waypoint label.
     */
    static WAYPOINT_LABEL_TEMPLATE: string;

    protected override _onVisibleChange(): void;

    /**
     * Configure the properties of the outline.
     * Called in {@link TokenRuler#draw}.
     * @returns The thickness in pixels and the color
     */
    protected _configureOutline(): { thickness: number; color: PIXI.ColorSource };

    /**
     * Configure the properties of the dash line.
     * Called in {@link TokenRuler#draw}.
     * @returns The dash in pixels, the gap in pixels, and the speed in pixels per second
     */
    protected _configureDashLine(): { dash: number; gap: number; speed: number };

    override draw(): Promise<void>;

    override clear(): void;

    override destroy(): void;

    override refresh(rulerData: DeepReadonly<TokenRulerData>): void;

    /**
     * Get the context used to render a ruler waypoint label.
     */
    protected _getWaypointLabelContext(
        waypoint: DeepReadonly<TokenRulerWaypoint>,
        state: WaypointLabelRenderState,
    ): WaypointLabelRenderContext | void;

    /**
     * Get the style of the waypoint at the given waypoint.
     * @param waypoint The waypoint
     * @returns The radius, color, and alpha of the waypoint. If the radius is 0, no waypoint marker is drawn.
     */
    protected _getWaypointStyle(waypoint: DeepReadonly<TokenRulerWaypoint>): {
        radius: number;
        color?: PIXI.ColorSource;
        alpha?: number;
    };

    /**
     * Get the style of the segment from the previous to the given waypoint.
     * @param waypoint The waypoint
     * @returns The line width, color, and alpha of the segment. If the width is 0, no segment is drawn.
     */
    protected _getSegmentStyle(waypoint: DeepReadonly<TokenRulerWaypoint>): {
        width: number;
        color?: PIXI.ColorSource;
        alpha?: number;
    };

    /**
     * Get the style to be used to highlight the grid offset.
     * @param waypoint The waypoint
     * @param offset An occupied grid offset at the given waypoint that is to be highlighted
     * @returns The color, alpha, texture, and texture matrix to be used to draw the grid space. If the alpha is 0, the
     *          grid space is not highlighted.
     */
    protected _getGridHighlightStyle(
        waypoint: DeepReadonly<Omit<TokenRulerWaypoint, "index" | "center" | "size" | "ray">>,
        offset: DeepReadonly<GridOffset3D>,
    ): { color?: PIXI.ColorSource; alpha?: number; texture?: PIXI.Texture; matrix?: PIXI.Matrix | null };
}

export interface WaypointLabelRenderContext {
    action: TokenMovementActionConfig;
    cssClass: string;
    secret: boolean;
    units: string;
    uiScale: number;
    position: { x: number; y: number };
    distance: { total: string; delta?: string };
    cost: { total: string; units: string };
}

export interface WaypointLabelRenderState {
    hasElevation?: boolean;
    initialize?: boolean;
    previousElevation?: number;
}
