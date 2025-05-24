import { DeepReadonly, ElevatedPoint, Point, SocketRequest, SocketResponse, TokenPosition } from "@common/_types.mjs";
import { DataModel } from "@common/abstract/_module.mjs";
import { DataField } from "@common/data/fields.mjs";
import { EffectDurationData } from "@common/documents/active-effect.mjs";
import { GridMeasurePathCostFunction3D, GridOffset3D } from "@common/grid/_types.mjs";
import { DocumentHTMLEmbedConfig } from "./applications/ux/text-editor.mjs";
import { AVSettingsData } from "./av/settings.mjs";
import { CanvasAnimationData, CanvasAnimationEasingFunction } from "./canvas/animation/_types.mjs";
import { Ray } from "./canvas/geometry/_module.mjs";
import { PingData } from "./canvas/interaction/_types.mjs";
import AmbientLight from "./canvas/placeables/light.mjs";
import Token, { TokenShape } from "./canvas/placeables/token.mjs";
import PointVisionSource from "./canvas/sources/point-vision-source.mjs";
import Roll from "./dice/roll.mjs";
import { TableResult, TokenDocument, User } from "./documents/_module.mjs";
import { Color } from "./utils/_module.mjs";

export interface HotReloadData {
    /** The type of package which was modified */
    packageType: string;

    /** The id of the package which was modified */
    packageId: string;

    /** The updated stringified file content */
    content: string;

    /** The relative file path which was modified */
    path: string;

    /** The file extension which was modified, e.g. "js", "css", "html" */
    extension: string;
}

export interface RulerWaypoint {
    /** The x-coordinate in pixels. */
    x: number;

    /** The y-coordinate in pixels. */
    y: number;

    /** The elevation in grid units. */
    elevation: number;

    /** The index of the waypoint. */
    index: number;

    /**
     * The ray from the center point of previous to the
     * center point of this waypoint, or null if there is
     * no previous waypoint.
     */
    ray: Ray | null;

    /** The measurements at this waypoint. */
    measurement: GridMeasurePathResultWaypoint;

    /**
     * The previous waypoint, if any.
     */
    previous: RulerWaypoint | null;
    /**
     * The next waypoint, if any.
     */
    next: RulerWaypoint | null;
}

export interface TokenMeasuredMovementWaypoint {
    /** The top-left x-coordinate in pixels (integer). */
    x: number;

    /** The top-left y-coordinate in pixels (integer). */
    y: number;

    /** The elevation in grid units. */
    elevation: number;

    /** The width in grid spaces (positive). */
    width: number;

    /** The height in grid spaces (positive). */
    height: number;

    /** The shape type (see {@link CONST.TOKEN_SHAPES}). */
    shape: TokenShape;

    /** The movement action from the previous to this waypoint. */
    action: string;

    /** Teleport from the previous to this waypoint? */
    teleport: boolean;

    /** Is the movement from the previous to this waypoint forced? */
    forced: boolean;

    /** The terrain data from the previous to this waypoint. */
    terrain: DataModel | null;

    /** Was this waypoint snapped to the grid? */
    snapped: boolean;

    /** Was this waypoint explicitly placed by the user? */
    explicit: boolean;

    /** Is this waypoint a checkpoint? */
    checkpoint: boolean;

    /** Is this waypoint intermediate? */
    intermediate: boolean;

    /** The ID of the user that moved the token to from the previous to this waypoint. */
    userId: string;

    /** The movement cost from the previous to this waypoint (nonnegative). */
    cost: number;
}

export type TokenMovementWaypoint = Omit<TokenMeasuredMovementWaypoint, "terrain" | "intermediate" | "userId" | "cost">;

export interface TokenMeasureMovementPathWaypoint {
    /** The top-left x-coordinate in pixels (integer). Default: the previous or source x-coordinate. */
    x?: number;

    /**
     * The top-left y-coordinate in pixels (integer).
     *                                  Default: the previous or source y-coordinate.
     */
    y?: number;
    /**
     * The elevation in grid units.
     *                          Default: the previous or source elevation.
     */
    elevation?: number;
    /**
     * The width in grid spaces (positive).
     *                              Default: the previous or source width.
     */
    width?: number;
    /**
     * The height in grid spaces (positive).
     *                             Default: the previous or source height.
     */
    height?: number;
    /**
     * The shape type (see {@link CONST.TOKEN_SHAPES}).
     *                        Default: the previous or source shape.
     */
    shape?: TokenShape;
    /**
     * The movement action from the previous to this waypoint.
     *                             Default: `CONFIG.Token.movement.defaultAction`.
     */
    action?: string;
    /**
     * Teleport from the previous to this waypoint? Default: `false`.
     */
    teleport?: boolean;
    /**
     * Is the movement from the previous to this waypoint forced?
     *                      Default: `false`.
     */
    forced?: boolean;
    /**
     * The terrain data of this segment. Default: `null`.
     */
    terrain?: DataModel | null;

    /** A predetermined cost (nonnegative) or cost function to be used instead of `options.cost`. */
    cost?: number | TokenMovementCostFunction;
}

export interface TokenMovementSegmentData
    extends Pick<
        TokenMeasuredMovementWaypoint,
        "width" | "height" | "shape" | "action" | "teleport" | "forced" | "terrain"
    > {}

export type TokenMovementCostFunction = GridMeasurePathCostFunction3D<TokenMovementSegmentData>;

export interface TokenGetCompleteMovementPathWaypoint {
    /**
     * The top-left x-coordinate in pixels (integer).
     *                        Default: the previous or prepared x-coordinate.
     */
    x?: number;
    /**
     * The top-left y-coordinate in pixels (integer).
     *                        Default: the previous or prepared y-coordinate.
     */
    y?: number;
    /**
     * The elevation in grid units.
     *                Default: the previous or prepared elevation.
     */
    elevation?: number;
    /**
     * The width in grid spaces (positive).
     *                    Default: the previous or prepared width.
     */
    width?: number;
    /**
     * The height in grid spaces (positive).
     *                   Default: the previous or prepared height.
     */
    height?: number;
    /**
     * The shape type (see {@link CONST.TOKEN_SHAPES}).
     *              Default: the previous or prepared shape.
     */
    shape?: TokenShape;
    /**
     * The movement action from the previous to this waypoint.
     *                   Default: `CONFIG.Token.movement.defaultAction`.
     */
    action?: string;
    /**
     * Teleport from the previous to this waypoint? Default: `false`.
     */
    teleport?: boolean;
    /**
     * Is the movement from the previous to this waypoint forced?
     *            Default: `false`.
     */
    forced?: boolean;
    /**
     * The terrain data of this segment. Default: `null`.
     */
    terrain?: DataModel | null;
    /**
     * Was this waypoint snapped to the grid? Default: `false`.
     */
    snapped?: boolean;
    /**
     * Was this waypoint explicitly placed by the user? Default: `false`.
     */
    explicit?: boolean;
    /**
     * Is this waypoint a checkpoint? Default: `false`.
     */
    checkpoint?: boolean;
    /**
     * Is this waypoint intermediate? Default: `false`.
     */
    intermediate?: boolean;
}

export interface TokenCompleteMovementWaypoint extends Omit<TokenMeasuredMovementWaypoint, "userId" | "cost"> {}

export interface TokenFindMovementPathWaypoint {
    /**
     * The top-left x-coordinate in pixels (integer).
     *                     Default: the previous or source x-coordinate.
     */
    x?: number;
    /**
     * The top-left y-coordinate in pixels (integer).
     *                     Default: the previous or source y-coordinate.
     */
    y?: number;
    /**
     * The elevation in grid units.
     *             Default: the previous or source elevation.
     */
    elevation?: number;
    /**
     * The width in grid spaces (positive).
     *                 Default: the previous or source width.
     */
    width?: number;
    /**
     * The height in grid spaces (positive).
     *                Default: the previous or source height.
     */
    height?: number;
    /**
     * The shape type (see {@link CONST.TOKEN_SHAPES}).
     *           Default: the previous or source shape.
     */
    shape?: TokenShape;

    /**
     * The movement action from the previous to this waypoint.
     */
    action?: string;
    /**
     * Teleport from the previous to this waypoint?
     */
    teleport?: boolean;
    /**
     * Is the movement from the previous to this waypoint forced?
     */
    forced?: boolean;
    /**
     * Was this waypoint snapped to the grid? Default: `false`.
     */
    snapped?: boolean;
    /**
     * Was this waypoint explicitly placed by the user? Default: `false`.
     */
    explicit?: boolean;
    /**
     * Is this waypoint a checkpoint? Default: `false`.
     */
    checkpoint?: boolean;
}

export interface TokenConstrainMovementPathWaypoint {
    /**
     * The top-left x-coordinate in pixels (integer).
     * Default: the previous or source x-coordinate.
     */
    x?: number;
    /**
     * The top-left y-coordinate in pixels (integer).
     *                        Default: the previous or source y-coordinate.
     */
    y?: number;
    /**
     * The elevation in grid units.
     *                Default: the previous or source elevation.
     */
    elevation?: number;
    /**
     * The width in grid spaces (positive).
     *                    Default: the previous or source width.
     */
    width?: number;
    /**
     * The height in grid spaces (positive).
     *                   Default: the previous or source height.
     */
    height?: number;
    /**
     * The shape type (see {@link CONST.TOKEN_SHAPES}).
     *              Default: the previous or source shape.
     */
    shape?: TokenShape;
    /**
     * The movement action from the previous to this waypoint.
     *                   Default: `CONFIG.Token.movement.defaultAction`.
     */
    action?: string;
    /**
     * Teleport from the previous to this waypoint? Default: `false`.
     */
    teleport?: boolean;
    /**
     * Is the movement from the previous to this waypoint forced?
     *            Default: `false`.
     */
    forced?: boolean;
    /**
     * The terrain data of this segment. Default: `null`.
     */
    terrain?: DataModel | null;
    /**
     * Was this waypoint snapped to the grid? Default: `false`.
     */
    snapped?: boolean;
    /**
     * Was this waypoint explicitly placed by the user? Default: `false`.
     */
    explicit?: boolean;
    /**
     * Is this waypoint a checkpoint? Default: `false`.
     */
    checkpoint?: boolean;
}

export interface TokenSegmentizeMovementWaypoint {
    /**
     * The x-coordinate in pixels (integer).
     * Default: the previous or source x-coordinate.
     */
    x?: number;

    /**
     * The y-coordinate in pixels (integer).
     * Default: the previous or source y-coordinate.
     */
    y?: number;

    /**
     * The elevation in grid units.
     * Default: the previous or source elevation.
     */
    elevation?: number;

    /**
     * The width in grid spaces (positive).
     * Default: the previous or source width.
     */
    width?: number;

    /**
     * The height in grid spaces (positive).
     * Default: the previous or source height.
     */
    height?: number;

    /**
     * The shape type (see {@link CONST.TOKEN_SHAPES}).
     *              Default: the previous or source shape.
     */
    shape?: TokenShape;
    /**
     * The movement action from the previous to this waypoint.
     *                   Default: `CONFIG.Token.movement.defaultAction`.
     */
    action?: string;
    /**
     * Teleport from the previous to this waypoint? Default: `false`.
     */
    teleport?: boolean;
    /**
     * Is the movement from the previous to this waypoint forced?
     *            Default: `false`.
     */
    forced?: boolean;
    /**
     * The terrain data of this segment. Default: `null`.
     */
    terrain?: DataModel | null;
    /**
     * Was this waypoint snapped to the grid? Default: `false`.
     */
    snapped?: boolean;
}

export type TokenRegionMovementWaypoint = TokenPosition;

export interface TokenRegionMovementSegment {
    /**
     * The type of this segment (see {@link CONST.REGION_MOVEMENT_SEGMENTS}).
     */
    type: RegionMovementSegment;
    /**
     * The waypoint that this segment starts from.
     */
    from: TokenRegionMovementWaypoint;
    /**
     * The waypoint that this segment goes to.
     */
    to: TokenRegionMovementWaypoint;
    /**
     * The movement action between the waypoints.
     */
    action: string;
    /**
     * Teleport between the waypoints?
     */
    teleport: boolean;
    /**
     * Is the movement on this segment forced?
     */
    forced: boolean;
    /**
     * The terrain data of this segment.
     */
    terrain: DataModel | null;
    /**
     * Is the destination snapped to the grid?
     */
    snapped: boolean;
}

export interface TokenMovementSectionData {
    /**
     * The waypoints of the movement path
     */
    waypoints: TokenMeasuredMovementWaypoint[];
    /**
     * The distance of the movement path
     */
    distance: number;
    /**
     * The cost of the movement path
     */
    cost: number;
    /**
     * The number of spaces moved along the path
     */
    spaces: number;
    /**
     * The number of diagonals moved along the path
     */
    diagonals: number;
}

export interface TokenMovementHistoryData {
    /**
     * The recorded waypoints of the movement path
     */
    recorded: TokenMovementSectionData;
    /**
     * The unrecored waypoints of the movement path
     */
    unrecorded: TokenMovementHistoryData;
    /**
     * The distance of the combined movement path
     */
    distance: number;
    /**
     * The cost of the combined movement path
     */
    cost: number;
    /**
     * The number of spaces moved along the combined path
     */
    spaces: number;
    /**
     * The number of diagonals moved along the combined path
     */
    diagonals: number;
}

export type TokenMovementMethod = "api" | "config" | "dragging" | "keyboard" | "undo";

export type TokenMovementState = "completed" | "paused" | "pending" | "stopped";

export interface TokenMovementData {
    /** The ID of the movement */
    id: string;

    /** The chain of prior movement IDs that this movement is a continuation of */
    chain: string[];

    /** The origin of movement */
    origin: TokenPosition;

    /** The destination of movement */
    destination: TokenPosition;

    /** The waypoints and measurements of the passed path */
    passed: TokenMovementSectionData;

    /** The waypoints and measurements of the pending path */
    pending: TokenMovementSectionData;

    /** The waypoints and measurements of the history path */
    history: TokenMovementHistoryData;

    /** Was the movement recorded in the movement history? */
    recorded: boolean;

    /** The method of movement */
    method: TokenMovementMethod;

    /** The options to constrain movement */
    constrainOptions: Omit<TokenConstrainMovementPathOptions, "preview" | "history">;

    /** Automatically rotate the token in the direction of movement? */
    autoRotate: boolean;

    /** Show the ruler during the movement animation of the token? */
    showRuler: boolean;

    /** The user that moved the token */
    user: User;

    /**
     * The state of the movement
     */
    state: TokenMovementState;
    /**
     * The update options of the movement operation
     */
    updateOptions: object;
}

export interface TokenMovementOperation extends Omit<TokenMovementData, "user" | "state" | "updateOptions"> {}

export interface TokenMovementContinuationData {
    /**
     * The movement ID
     */
    movementId: string;
    /**
     * The number of continuations
     */
    continueCounter: number;
    /**
     * Was continued?
     */
    continued: boolean;
    /**
     * The continuation promise
     */
    continuePromise: Promise<boolean> | null;
    /**
     * The promise to wait for before continuing movement
     */
    waitPromise: Promise<void>;
    /**
     * Resolve function of the wait promise
     */
    resolveWaitPromise: () => {} | undefined;
    /**
     * The promise that resolves after the update workflow
     */
    postWorkflowPromise: Promise<void>;
    /**
     * The movement continuation states
     */
    states: {
        [movementId: string]: {
            handles: Map<string | symbol, TokenMovementContinuationHandle>;
            callbacks: Array<(continued: boolean) => void>;
            pending: Set<string>;
        };
    };
}

export interface TokenMovementContinuationHandle {
    /**
     * The movement ID
     */
    movementId: string;
    /**
     * The continuation promise
     */
    continuePromise: Promise<boolean> | undefined;
}

export type TokenResumeMovementCallback = () => Promise<boolean>;

export interface TokenMeasureMovementPathOptions {
    /**
     * Measure a preview path?
     * @default false
     */
    preview?: boolean;
}

export interface TokenConstrainMovementPathOptions {
    /**
     * Constrain a preview path? Default: `false`.
     */
    preview?: boolean;

    /**
     * Ignore walls? Default: `false`.
     */
    ignoreWalls?: boolean;

    /**
     * Ignore cost? Default: `false`.
     */
    ignoreCost?: boolean;

    /**
     * Consider movement history? If true, uses the current movement history.
     * If waypoints are passed, use those as the history. Default: `false`.
     */
    history?: boolean | DeepReadonly<TokenMeasuredMovementWaypoint[]>;
}

export interface TokenFindMovementPathOptions {
    /**
     * Find a preview path? Default: `false`.
     */
    preview?: boolean;
    /**
     * Ignore walls? Default: `false`.
     */
    ignoreWalls?: boolean;
    /**
     * Ignore cost? Default: `false`.
     */
    ignoreCost?: boolean;
    /**
     * Consider movement history? If true, uses the current movement history.
     * If waypoints are passed, use those as the history. Default: `false`.
     */
    history?: boolean | DeepReadonly<TokenMeasuredMovementWaypoint[]>;
    /**
     * Unless the path can be found instantly, delay the start of the pathfinding
     *                computation by this number of milliseconds. Default: `0`.
     */
    delay?: number;
}

export interface TokenFindMovementPathJob {
    /**
     * The result of the pathfinding job. Undefined while the
     * search is in progress, null if the job was cancelled,
     * and the (partial) path if the job completed.
     */
    result: TokenMovementWaypoint[] | null | undefined;
    /**
     * The promise returning the (partial) path that as found
     * or null if cancelled.
     */
    promise: Promise<TokenMovementWaypoint[] | null>;
    /**
     * If this function is called and the job hasn't completed
     * yet, the job is cancelled.
     */
    cancel: () => void;
}

export interface TokenGetTerrainMovementPathWaypoint extends Omit<TokenGetCompleteMovementPathWaypoint, "terrain"> {}

export interface TokenTerrainMovementWaypoint extends Omit<TokenMeasuredMovementWaypoint, "userId" | "cost"> {}

export interface TokenRulerData {
    /** The waypoints that were already passed by the Token */
    passedWaypoints: TokenMeasuredMovementWaypoint[];

    /** The waypoints that the Token will try move to next */
    pendingWaypoints: TokenMeasuredMovementWaypoint[];

    /** Movement planned by Users */
    plannedMovement: Record<string, TokenPlannedMovement>;
}

export interface TokenPlannedMovement {
    /** The found path, which goes through all but the unreachable waypoints */
    foundPath: TokenMeasuredMovementWaypoint[];

    /**
     * The unreachable waypoints, which are those that
     * are not reached by the found path
     */
    unreachableWaypoints: TokenMeasuredMovementWaypoint[];
    /**
     * The movement history
     */
    history: TokenMeasuredMovementWaypoint[];
    /**
     * Is the path hidden?
     */
    hidden: boolean;
    /**
     * Is the pathfinding still in progress?
     */
    searching: boolean;
}

export interface TokenRulerWaypointData {
    /**
     * The index of the waypoint, which is equal to the number of
     * explicit waypoints from the first to this waypoint.
     */
    index: number;
    /**
     * The stage this waypoint belongs to.
     */
    stage: "passed" | "pending" | "planned";
    /**
     * Is this waypoint hidden?
     */
    hidden: boolean;
    /**
     * Is this waypoint unreachable?
     */
    unreachable: boolean;
    /**
     * The center point of the Token at this waypoint.
     */
    center: Point;
    /**
     * The size of the Token in pixels at this waypoint.
     */
    size: {
        width: number;
        height: number;
    };
    /**
     * The ray from the center point of previous to the center
     * point of this waypoint, or null if there is no previous
     * waypoint.
     */
    ray: Ray | null;
    /**
     * The measurements at this waypoint.
     */
    measurement: GridMeasurePathResultWaypoint;
    /**
     * The previous waypoint, if any.
     */
    previous: TokenRulerWaypoint | null;
    /**
     * The next waypoint, if any.
     */
    next: TokenRulerWaypoint | null;
}

export interface TokenRulerWaypoint extends TokenMeasuredMovementWaypoint, TokenRulerWaypointData {}

export interface TokenDragContext {
    token: Token;
    clonedToken: Token;
    origin: TokenPosition;
    destination: Omit<TokenMovementWaypoint, "width" | "height" | "shape" | "action" | "teleport"> &
        Partial<Pick<TokenMovementWaypoint, "width" | "height" | "shape" | "action" | "teleport">>;
    waypoints: (Omit<TokenMovementWaypoint, "width" | "height" | "shape" | "action" | "teleport"> &
        Partial<Pick<TokenMovementWaypoint, "width" | "height" | "shape" | "action" | "teleport">>)[];
    foundPath: TokenMovementWaypoint[];
    unreachableWaypoints: TokenMovementWaypoint[];
    hidden: boolean;
    updating: boolean;
    search: TokenFindMovementPathJob;
    searching: boolean;
    searchId: number;
    searchOptions: TokenFindMovementPathOptions;
}

export interface TokenAnimationData {
    /** The x position in pixels */
    x: number;

    /** The y position in pixels */
    y: number;

    /** The elevation in grid units */
    elevation: number;

    /** The width in grid spaces */
    width: number;

    /** The height in grid spaces */
    height: number;

    /** The alpha value */
    alpha: number;

    /** The rotation in degrees */
    rotation: number;

    /** The texture data */
    texture: {
        src: string;
        anchorX: number;
        anchorY: number;
        scaleX: number;
        scaleY: number;
        tint: Color;
    };

    /** The ring data */
    ring: {
        subject: {
            texture: string;
            scale: number;
        };
    };
}

export interface TokenAnimationContext {
    /** The name of the animation. */
    name: string | symbol;

    /** The animation chain. */
    chain: {
        to: Partial<TokenAnimationData>;
        options: Omit<TokenAnimationOptions, "duration"> & { duration: number };
        promise: Promise<void>;
        resolve: () => void;
        reject: (error: Error) => void;
    }[];

    /** The final animation state. */
    to: Partial<TokenAnimationData>;

    /** The duration of the animation. */
    duration: number;

    /** The current time of the animation. */
    time: number;

    /** Asynchronous functions that are executed before the animation starts */
    preAnimate: ((context: TokenAnimationContext) => Promise<void>)[];

    /**
     * Synchronous functions that are executed after the animation ended. They may be executed before the `preAnimate`
     * functions have finished if the animation is terminated.
     */
    postAnimate: ((context: TokenAnimationContext) => void)[];

    /** Synchronous functions executed each frame after `ontick` and before {@link Token#_onAnimationUpdate}. */
    onAnimate: ((context: TokenAnimationContext) => void)[];

    /** The promise of the animation that resolves once it completes or is terminated. */
    promise: Promise<void>;
}

export interface TokenAnimationOptions {
    /** The name of the animation, or null if nameless. Default: {@link Token#animationName}. */
    name?: string | symbol | null;

    /** Chain the animation to the existing one of the same name? Default: `false`. */
    chain?: boolean;

    /**
     * The duration of the animation in milliseconds (nonnegative). Default: automatic (determined by
     * {@link Token#_getAnimationDuration}, which returns 1000 by default unless it's a movement animation).
     */
    duration?: number;

    /**
     * A desired base movement speed in grid size per second (positive), which determines the `duration` if the given
     * `duration` is undefined and either `x`, `y`, `width`, `height`, or `rotation` is animated.
     * Default: automatically determined by {@link Token#_getAnimationMovementSpeed}, which returns
     * `CONFIG.Token.movement.defaultSpeed` by default.
     */
    movementSpeed?: number;

    /** The movement action. Default: `CONFIG.Token.movement.defaultAction`. */
    action?: string;

    /** Teleportation instead of animating the movement? Default: `false`. */
    teleport?: boolean;

    /** Forced movement? Default: `false`. */
    forced?: boolean;

    /** The terrain data. Default: `null`. */
    terrain?: DataModel | null;

    /**
     * The desired texture transition type. Default: automatic (determined by {@link Token#_getAnimationTransition},
     * which returns `"fade"` by default).
     */
    transition?: TokenAnimationTransition;

    /** The easing function of the animation. Default: `undefined` (linear). */
    easing?: CanvasAnimationEasingFunction;

    /** An on-tick callback. */
    ontick?: (elapsedMS: number, animation: CanvasAnimationData, data: TokenAnimationData) => void;
}

export type TokenMovementActionCostFunction = (
    baseCost: number,
    from: Readonly<GridOffset3D>,
    to: Readonly<GridOffset3D>,
    distance: number,
    segment: DeepReadonly<TokenMovementSegmentData>,
) => number;

export interface TokenMovementActionConfig {
    /** The label of the movement action. */
    label: string;

    /** The icon of the movement action. */
    icon: string;

    /**
     * The number that is used to sort the movement actions / movement action configs.
     * Determines the order of cycling. Default: `0`.
     */
    order: number;

    /**
     * Is teleportation? If true, the movement does not go through all grid spaces
     * between the origin and destination: it goes from the origin immediately to the
     * destination grid space. Default: `false`.
     */
    teleport: boolean;

    /**
     * Is the movement measured? The distance, cost, spaces, and diagonals
     * of a segment that is not measured are always 0. Default: `true`.
     */
    measure: boolean;

    /** The type of walls that block this movement, if any. Default: `"move"`. */
    walls: string | null;

    /** Is segment of the movement visualized by the ruler? Default: `true`. */
    visualize: boolean;

    /** Get the default animation options for this movement action. Default: `() => ({})`. */
    getAnimationOptions: (token: Token) => Partial<TokenAnimationOptions>;

    /**
     * Can the current User select this movement action for the given Token? If selectable, the movement action of the
     * Token can set to this movement action by the User via the UI and when cycling. Default: `() => true`.
     */
    canSelect: (token: TokenDocument) => boolean;

    /**
     * If set, this function is used to derive the terrain difficulty from from nonderived difficulties,
     * which are those that do not have `deriveTerrainDifficulty` set.
     * Used by {@link foundry.data.regionBehaviors.ModifyMovementCostRegionBehaviorType}.
     * Derived terrain difficulties are not configurable via the behavior UI.
     */
    deriveTerrainDifficulty: ((nonDerivedDifficulties: { [action: string]: number }) => number) | null;

    /** The cost modification function. Default: `() => cost => cost`. */
    getCostFunction: (
        token: TokenDocument,
        options: TokenMeasureMovementPathOptions,
    ) => TokenMovementActionCostFunction;
}

export type TokenAnimationTransition =
    | "crosshatch"
    | "dots"
    | "fade"
    | "glitch"
    | "hole"
    | "holeSwirl"
    | "hologram"
    | "morph"
    | "swirl"
    | "waterDrop"
    | "waves"
    | "wind"
    | "whiteNoise";

export interface RegionSegmentizeMovementPathWaypoint extends ElevatedPoint {
    /** Teleport from the previous to this waypoint? Default: `false`. */
    teleport?: boolean;
}

export interface RegionMovementSegment {
    /** The type of this segment (see {@link CONST.REGION_MOVEMENT_SEGMENTS}). */
    type: RegionMovementSegment;
    /** The waypoint that this segment starts from. */
    from: ElevatedPoint;
    /** The waypoint that this segment goes to. */
    to: ElevatedPoint;
    /** The movement action between the waypoints. */
    action: string;
    /** Teleport between the waypoints? */
    teleport: boolean;
    /** Is the movement on this segment forced? */
    forced: boolean;
    /** Is the destination snapped to the grid? */
    snapped: boolean;
}

export interface SceneDimensions {
    /** The width of the canvas. */
    width: number;
    /** The height of the canvas. */
    height: number;
    /** The grid size. */
    size: number;
    /** The canvas rectangle. */
    rect: PIXI.Rectangle;
    /** The X coordinate of the scene rectangle within the larger canvas. */
    sceneX: number;
    /** The Y coordinate of the scene rectangle within the larger canvas. */
    sceneY: number;
    /** The width of the scene. */
    sceneWidth: number;
    /** The height of the scene. */
    sceneHeight: number;
    /** The scene rectangle. */
    sceneRect: PIXI.Rectangle;
    /** The number of distance units in a single grid space. */
    distance: number;
    /** The factor to convert distance units to pixels. */
    distancePixels: number;
    /** The units of distance. */
    units: string;
    /** The aspect ratio of the scene rectangle. */
    ratio: number;
    /** The length of the longest line that can be drawn on the canvas. */
    maxR: number;
    /** The number of grid rows on the canvas. */
    rows: number;
    /** The number of grid columns on the canvas. */
    columns: number;
}

export interface CanvasViewPosition {
    /** The x-coordinate which becomes `stage.pivot.x` */
    x: number;
    /** The y-coordinate which becomes `stage.pivot.y` */
    y: number;
    /** The zoom level up to `CONFIG.Canvas.maxZoom` which becomes `stage.scale.x` and `y` */
    scale: number;
}

export interface CanvasVisibilityTest {
    point: ElevatedPoint;
    los: Map<PointVisionSource<Token | AmbientLight>, boolean>;
}

export interface CanvasVisibilityTestConfiguration {
    /** The target object */
    object: object | null;
    /** An array of visibility tests */
    tests: CanvasVisibilityTest[];
}

export interface CanvasVisibilityTextureConfiguration {
    resolution: number;
    width: number;
    height: number;
    mipmap: number;
    scaleMode: number;
    alphaMode: number;
    multisample: number;
    format: number;
}

export interface TrackedAttributesDescription {
    /** A list of property path arrays to attributes with both a value and a max property. */
    bar: string[][];
    /** A list of property path arrays to attributes that have only a value property. */
    value: string[][];
}

export interface ReticuleOptions {
    /**
     * The amount of margin between the targeting arrows and the token's bounding box, expressed as a fraction of an
     * arrow's size.
     */
    margin?: number;

    /** The alpha value of the arrows. */
    alpha?: number;

    /** The size of the arrows as a proportion of grid size. Default: `CONFIG.Canvas.targeting.size`. */
    size?: number;

    /** The color of the arrows. */
    color?: number;

    /** The arrows' border style configuration. */
    border?: { color?: number; width?: number };
}

export interface ActivityData {
    /** The ID of the scene that the user is viewing. */
    sceneId?: string | null;

    /** The position of the user's cursor. */
    cursor?: Point;

    /** The state of the user's ruler, if they are currently using one. */
    ruler?: ElevatedPoint[];

    /** The IDs of the tokens the user has targeted in the currently viewed scene. */
    targets?: string[];

    /** Whether the user has an open WS connection to the server or not. */
    active?: boolean;

    /** Is the user emitting a ping at the cursor coordinates? */
    ping?: PingData;

    /** The state of the user's AV settings. */
    av?: AVSettingsData;
}

export interface CanvasPerformanceSettings {
    /** The performance mode in CONST.CANVAS_PERFORMANCE_MODES */
    mode: number;

    /** Whether to use mipmaps, "ON" or "OFF" */
    mipmap: string;

    /** Whether to apply MSAA at the overall canvas level */
    msaa: boolean;

    /** Whether to apply SMAA at the overall canvas level */
    smaa: boolean;

    /** Maximum framerate which should be the render target */
    fps: number;

    /** Whether to display token movement animation */
    tokenAnimation: boolean;

    /** Whether to display light source animation */
    lightAnimation: boolean;

    /** Whether to render soft edges for light sources */
    lightSoftEdges: boolean;
}

export interface CanvasSupportedComponents {
    /** Is WebGL2 supported? */
    webGL2: boolean;

    /** Is reading pixels in RED format supported? */
    readPixelsRED: boolean;

    /** Is the OffscreenCanvas supported? */
    offscreenCanvas: boolean;
}

export interface CanvasDimensions extends SceneDimensions {
    /** The minimum, maximum, and default canvas scale. */
    scale: { min: number; max: number; default: number };

    /** The scaling factor for canvas UI elements. Based on the normalized grid size (100px). */
    uiScale: number;
}

/**
 * The data that is planned to be imported for the adventure, categorized into new documents that will be created and
 * existing documents that will be updated.
 */
export interface AdventureImportData {
    /** Arrays of document data to create, organized by document name */
    toCreate: Record<string, object[]>;

    /** Arrays of document data to update, organized by document name */
    toUpdate: Record<string, object[]>;

    /** The total count of documents to import */
    documentCount: number;
}

/**
 * A callback function that is invoked and awaited during import data preparation before the adventure import proceeds.
 * This can be used to perform custom pre-processing on the import data.
 */
export type AdventurePreImportCallback = (data: AdventureImportData, options: AdventureImportOptions) => Promise<void>;

/**
 * Options which customize how the adventure import process is orchestrated.
 * Modules can use the preImportAdventure hook to extend these options by adding preImport or postImport callbacks.
 */
export interface AdventureImportOptions {
    /** Display a warning dialog if existing documents would be overwritten */
    dialog?: boolean;

    /** A subset of adventure fields to import */
    importFields?: string[];

    /** An array of awaited pre-import callbacks */
    preImport?: AdventurePreImportCallback[];

    /** An array of awaited post-import callbacks */
    postImport?: AdventurePostImportCallback[];
}

/**
 * A report of the world Document instances that were created or updated during the import process.
 */
export interface AdventureImportResult {
    /** Documents created as a result of the import, grouped by document name */
    created: Record<string, Document[]>;

    /** Documents updated as a result of the import, grouped by document name */
    updated: Record<string, Document[]>;
}

/**
 * A callback function that is invoked and awaited after import but before the overall import workflow concludes.
 * This can be used to perform additional custom adventure setup steps.
 */
export type AdventurePostImportCallback = (
    result: AdventureImportResult,
    options: AdventureImportOptions,
) => Promise<void>;

export interface ActiveEffectDuration extends EffectDurationData {
    /** The duration type, either "seconds", "turns", or "none" */
    type: string;

    /** The total effect duration, in seconds of world time or as a decimal number with the format {rounds}.{turns} */
    duration: number | null;

    /** The remaining effect duration, in seconds of world time or as a decimal number with the format rounds.turns */
    remaining: number | null;

    /** A formatted string label that represents the remaining duration */
    label: string;

    /** An internal flag used determine when to recompute seconds-based duration */
    _worldTime?: number;

    /** An internal flag used determine when to recompute turns-based duration */
    _combatTime?: number;
}

export interface CombatHistoryData {
    round: number;
    turn: number | null;
    tokenId: string | null;
    combatantId: string | null;
}

export interface CombatTurnEventContext {
    /** The round */
    round: number;
    /** The turn */
    turn: number;
    /** Was skipped? */
    skipped: boolean;
}

export interface CombatRoundEventContext extends Omit<CombatTurnEventContext, "turn"> {}

export interface JournalEntryPageHeading {
    /** The heading level, 1-6. */
    level: number;

    /** The raw heading text with any internal tags omitted. */
    text: string;

    /** The generated slug for this heading. */
    slug: string;

    /** The currently rendered element for this heading, if it exists. */
    element?: HTMLHeadingElement;

    /** Any child headings of this one. */
    children: string[];

    /** The linear ordering of the heading in the table of contents. */
    order: number;
}

/**
 * An object containing the executed Roll and the produced results
 */
export interface RollTableDraw {
    /** The Dice roll which generated the draw */
    roll: Roll;

    /** An array of drawn TableResult documents */
    results: TableResult[];
}

export type SearchableField = DataField | { [K in string]: SearchableField };

export interface FromCompendiumOptions {
    /** Clear the currently assigned folder. */
    clearFolder?: boolean;

    /** Clear the current sort order. */
    clearSort?: boolean;

    /** Clear Document ownership. */
    clearOwnership?: boolean;

    /** Retain the Document ID from the source Compendium. */
    keepId?: boolean;
}

export interface RollTableHTMLEmbedConfig extends DocumentHTMLEmbedConfig {
    rollable?: boolean;
}

export type ManageCompendiumRequest = SocketRequest;
export type ManageCompendiumResponse = SocketResponse;

export interface WorldCompendiumPackConfiguration {
    folder?: string;
    sort?: number;
    locked?: boolean;
}

export type WorldCompendiumConfiguration = Record<string, WorldCompendiumPackConfiguration>;
