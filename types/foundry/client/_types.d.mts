import { DeepReadonly, ElevatedPoint, Point, SocketRequest, SocketResponse, TokenPosition } from "@common/_types.mjs";
import { DataModel } from "@common/abstract/_module.mjs";
import { DataField } from "@common/data/fields.mjs";
import { GridMeasurePathResultWaypoint, GridOffset3D } from "@common/grid/_types.mjs";
import { DocumentHTMLEmbedConfig } from "./applications/ux/text-editor.mjs";
import { AVSettingsData } from "./av/settings.mjs";
import { CanvasAnimationData, CanvasAnimationEasingFunction } from "./canvas/animation/_types.mjs";
import { Ray } from "./canvas/geometry/_module.mjs";
import { PingData } from "./canvas/interaction/_types.mjs";
import AmbientLight from "./canvas/placeables/light.mjs";
import Token, { TokenShape } from "./canvas/placeables/token.mjs";
import PointVisionSource from "./canvas/sources/point-vision-source.mjs";
import {
    SceneDimensions,
    TokenDocument,
    TokenGetCompleteMovementPathWaypoint,
    TokenMeasuredMovementWaypoint,
    TokenMovementSegmentData,
    TokenMovementWaypoint,
} from "./documents/_module.mjs";
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

interface TokenConstrainedMovementWaypoint
    extends Omit<TokenMeasuredMovementWaypoint, "userId" | "movementId" | "cost"> {}

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
     * The config of the movement action
     */
    actionConfig: TokenMovementActionConfig;
    /**
     * The ID of movement, or null if planned movement.
     */
    movementId: string | null;
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
    size: { width: number; height: number };
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

export interface TokenRulerWaypoint extends Omit<TokenMeasuredMovementWaypoint, "movementId">, TokenRulerWaypointData {}

export interface TokenDragContext {
    token: Token;
    clonedToken: Token;
    origin: TokenPosition;
    destination: Omit<TokenMovementWaypoint, "width" | "height" | "shape" | "action"> &
        Partial<Pick<TokenMovementWaypoint, "width" | "height" | "shape" | "action">>;
    waypoints: (Omit<TokenMovementWaypoint, "width" | "height" | "shape" | "action"> &
        Partial<Pick<TokenMovementWaypoint, "width" | "height" | "shape" | "action">>)[];
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

    /** An image filename. Takes precedence over the icon if both are supplied. */
    img: string | null;

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

export interface TrackedAttributesDescription {
    /** A list of property path arrays to attributes with both a value and a max property. */
    bar: string[][];
    /** A list of property path arrays to attributes that have only a value property. */
    value: string[][];
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

/* ----------------------------------------- */
/*  Settings Type Definitions                */
/* ----------------------------------------- */

/** A Client Setting */
export interface SettingConfig<
    TChoices extends Record<string, unknown> | undefined = Record<string, unknown> | undefined,
> {
    /** A unique machine-readable id for the setting */
    key: string;
    /** The namespace the setting belongs to */
    namespace: string;
    /** The human readable name */
    name: string;
    /** An additional human readable hint */
    hint?: string;
    /** The scope the Setting is stored in, either World or Client */
    scope: "world" | "client";
    /** Indicates if this Setting should render in the Config application */
    config: boolean;
    /** This will prompt the user to reload the application for the setting to take effect. */
    requiresReload?: boolean;
    /** The JS Type that the Setting is storing */
    type:
        | NumberConstructor
        | StringConstructor
        | BooleanConstructor
        | ObjectConstructor
        | ArrayConstructor
        | ConstructorOf<DataModel>
        | DataField;
    /** For string Types, defines the allowable values */
    choices?: TChoices;
    /** For numeric Types, defines the allowable range */
    range?: this["type"] extends NumberConstructor ? { min: number; max: number; step: number } : never;
    /** The default value */
    default?: number | string | boolean | object | (() => number | string | boolean | object);
    /** Executes when the value of this Setting changes */
    onChange?: (choice: TChoices extends object ? keyof TChoices : unknown) => void | Promise<void>;
}

export interface SettingSubmenuConfig {
    /** The human readable name */
    name: string;
    /** The human readable label */
    label: string;
    /** An additional human readable hint */
    hint: string;
    /** The classname of an Icon to render */
    icon: string;
    /** The FormApplication to render */
    type: ConstructorOf<foundry.appv1.api.Application> | ConstructorOf<foundry.applications.api.ApplicationV2>;
    /** If true, only a GM can edit this Setting */
    restricted: boolean;
}

/** A Client Keybinding Action Configuration */
export interface KeybindingActionConfig {
    /** The namespace within which the action was registered */
    namespace?: string;
    /** The human readable name */
    name: string;
    /** An additional human readable hint */
    hint?: string;
    /** The default bindings that can never be changed nor removed. */
    uneditable?: KeybindingActionBinding[];
    /** The default bindings that can be changed by the user. */
    editable?: KeybindingActionBinding[];
    /** A function to execute when a key down event occurs. If True is returned, the event is consumed and no further keybinds execute. */
    onDown?: (context: KeyboardEventContext) => unknown;
    /** A function to execute when a key up event occurs. If True is returned, the event is consumed and no further keybinds execute. */
    onUp?: (context: KeyboardEventContext) => unknown;
    /** If True, allows Repeat events to execute the Action's onDown. Defaults to false. */
    repeat?: boolean;
    /** If true, only a GM can edit and execute this Action */
    restricted?: boolean;
    /** Modifiers such as [ "CONTROL" ] that can be also pressed when executing this Action. Prevents using one of these modifiers as a Binding. */
    reservedModifiers?: ModifierKey[];
    /** The preferred precedence of running this Keybinding Action */
    precedence?: number;
    /** The recorded registration order of the action */
    order?: number;
}

export interface KeybindingActionBinding {
    /** A numeric index which tracks this bindings position during form rendering */
    index?: number;
    /** The KeyboardEvent#code value from https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values */
    key: string | null;
    /** An array of modifiers keys from KeyboardManager.MODIFIER_KEYS which are required for this binding to be activated */
    modifiers: ModifierKey[];
}

/** An action that can occur when a key is pressed */
export interface KeybindingAction {
    /** The namespaced machine identifier of the Action */
    action: string;
    /** The Keyboard key */
    key: string;
    /** The human readable name */
    name: string;
    /** Required modifiers */
    requiredModifiers?: ModifierKey[];
    /** Optional (reserved) modifiers */
    optionalModifiers?: ModifierKey[];
    /** The handler that executes onDown */
    onDown?: (...args: unknown[]) => boolean;
    /** The handler that executes onUp */
    onUp?: (...args: unknown[]) => boolean;
    /** If True, allows Repeat events to execute this Action's onDown */
    repeat?: boolean;
    /** If true, only a GM can execute this Action */
    restricted?: boolean;
    /** The registration precedence */
    precedence?: number;
    /** The registration order */
    order?: number;
}

export type ModifierKey = "Control" | "Shift" | "Alt";

/**
 * Keyboard event context
 */
export interface KeyboardEventContext {
    /** The normalized string key, such as "A" */
    key: string;
    /** The originating keypress event */
    event: KeyboardEvent;
    /** Is the Shift modifier being pressed */
    isShift: boolean;
    /** Is the Control or Meta modifier being processed */
    isControl: boolean;
    /** Is the Alt modifier being pressed */
    isAlt: boolean;
    /** Are any of the modifiers being pressed */
    hasModifiers: boolean;
    /** A list of string modifiers applied to this context, such as [ "CONTROL" ] */
    modifiers: ModifierKey[];
    /** True if the Key is Up, else False if down */
    up: boolean;
    /** True if the given key is being held down such that it is automatically repeating. */
    repeat: boolean;
    /** The executing Keybinding Action. May be undefined until the action is known. */
    action?: string;
}

/**
 * Connected Gamepad info
 */
export interface ConnectedGamepad {
    /** A map of axes values */
    axes: Map<string, number>;
    /** The Set of pressed Buttons */
    activeButtons: Set<string>;
}
