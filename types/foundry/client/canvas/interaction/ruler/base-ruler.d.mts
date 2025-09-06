import User from "@client/documents/user.mjs";
import { ElevatedPoint, Point } from "@common/_types.mjs";
import { RenderFlag } from "../_types.mjs";
import { RenderFlagsObject } from "../render-flags.mjs";

/**
 * The ruler that is used to measure distances on the Canvas.
 */
export default abstract class BaseRuler extends RenderFlagsObject {
    /**
     * @param user The User for whom to construct the Ruler instance
     */
    constructor(user: User);

    static RENDER_FLAGS: Record<string, RenderFlag>;

    /**
     * Is the Ruler ready to measure?
     */
    static get canMeasure(): boolean;

    /**
     * Snaps the given point to the grid.
     * @param point The point that is to be snapped
     * @returns The snapped point
     */
    static getSnappedPoint(point: Point): Point;

    /**
     * The User who this Ruler belongs to.
     */
    get user(): User;

    /**
     * Is this Ruler active? True, if the path of the Ruler is nonempty.
     */
    get active(): boolean;

    /**
     * The Ruler is visible if it is active and either not hidden or its User is the current User.
     */
    get visible(): boolean;

    /**
     * The sequence of points that the Ruler measures.
     */
    get path(): readonly Readonly<ElevatedPoint>[];

    /**
     * Set the sequence of points that the Ruler measures.
     */
    set path(value: ElevatedPoint[]);

    /**
     * The first point of the path, or undefined if the path is empty.
     */
    get origin(): ElevatedPoint | undefined;

    /**
     * The last point of the path, or undefined if the path is empty.
     */
    get destination(): ElevatedPoint | undefined;

    /**
     * Is this Ruler hidden? If true, only the User of the Ruler can see it.
     */
    get hidden(): boolean;

    set hidden(value: boolean);

    /**
     * Called when the Ruler's path has changed.
     */
    protected _onPathChange(): void;

    /**
     * Called when the Ruler becomes hidden or unhidden.
     */
    protected _onHiddenChange(): void;

    /**
     * Reset the path and the hidden state of the Ruler.
     */
    reset(): void;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /**
     * Draw the Ruler.
     */
    abstract draw(): Promise<void>;

    /**
     * Destroy the Ruler.
     */
    abstract destroy(): void;

    /**
     * Refresh the Ruler.
     */
    refresh(): void;

    /**
     * Refresh the Ruler.
     */
    protected abstract _refresh(): void;

    override applyRenderFlags(): void;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Add a waypoint.
     * @param point        The (unsnapped) waypoint
     * @param options.snap Snap the added waypoint?
     */
    protected _addDragWaypoint(point: Point, options?: { snap?: boolean }): void;

    /**
     * Remove the second to last waypoint.
     */
    protected _removeDragWaypoint(): void;

    /**
     * Change the elevation of the destination.
     * @param delta           The number vertical steps
     * @param options.precise Round elevations to multiples of the grid distance divided by
     *                        `CONFIG.Canvas.elevationSnappingPrecision`? If false, rounds to multiples of the grid
     *                        distance.
     */
    protected _changeDragElevation(delta: number, options?: { precise?: boolean }): void;

    /**
     * Handle the beginning of a new Ruler measurement workflow.
     * @param event The drag start event
     */
    protected _onDragStart(event: PIXI.FederatedPointerEvent): void;

    /**
     * Handle the end of the Ruler measurement workflow
     * @param event The drag cancel event
     * @returns If false, the cancellation of the drag workflow is prevented
     */
    protected _onDragCancel(event: PIXI.FederatedPointerEvent): false | void;

    /**
     * Handle left-click events on the Canvas during Ruler measurement.
     * @param event The pointer-down event
     */
    protected _onClickLeft(event: PIXI.FederatedPointerEvent): void;

    /**
     * Handle right-click events on the Canvas during Ruler measurement.
     * @param event The pointer-down event
     */
    protected _onClickRight(event: PIXI.FederatedPointerEvent): void;

    /**
     * Continue a Ruler measurement workflow for left-mouse movements on the Canvas.
     * @param event The mouse move event
     */
    protected _onMouseMove(event: PIXI.FederatedPointerEvent): void;

    /**
     * Conclude a Ruler measurement workflow by releasing the left-mouse button.
     * @param event The pointer-up event
     */
    protected _onMouseUp(event: PIXI.FederatedPointerEvent): void;

    /**
     * Adjust the elevation of Ruler waypoints by scrolling up/down.
     * @param event The mousewheel event
     */
    protected _onMouseWheel(event: PIXI.FederatedWheelEvent): void;
}
