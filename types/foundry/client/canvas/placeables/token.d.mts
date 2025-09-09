import {
    ReticuleOptions,
    TokenAnimationContext,
    TokenAnimationData,
    TokenAnimationOptions,
    TokenPlannedMovement,
} from "@client/_types.mjs";
import { TokenDocument, User } from "@client/documents/_module.mjs";
import { TokenUpdateCallbackOptions } from "@client/documents/token.mjs";
import { ColorSource, Point } from "@common/_types.mjs";
import { DatabaseCreateCallbackOptions } from "@common/abstract/_types.mjs";
import { TokenDisplayMode, WallRestrictionType } from "@common/constants.mjs";
import Color from "@common/utils/color.mjs";
import { CanvasAnimationAttribute } from "../animation/_types.mjs";
import { PreciseText } from "../containers/_module.mjs";
import PolygonVertex from "../geometry/edges/vertex.mjs";
import { TokenLayer } from "../layers/_module.mjs";
import { PlaceablesLayerPointerEvent } from "../layers/base/placeables-layer.mjs";
import PrimarySpriteMesh from "../primary/primary-sprite-mesh.mjs";
import { PointLightSource, PointVisionSource, VisionSourceData } from "../sources/_module.mjs";
import { LightSourceData } from "../sources/base-light-source.mjs";
import PlaceableObject, { PlaceableShape } from "./placeable-object.mjs";
import Region, { RegionMovementSegment, RegionMovementWaypoint } from "./region.mjs";
import { BaseTokenRuler } from "./tokens/_module.mjs";

/** A Token is an implementation of PlaceableObject that represents an Actor within a viewed Scene on the game canvas. */
export default class Token<TDocument extends TokenDocument = TokenDocument> extends PlaceableObject<TDocument> {
    constructor(document: TDocument);

    static override embeddedName: "Token";

    static override RENDER_FLAGS: {
        redraw: { propagate: string[] };
        redrawEffects: object;
        refresh: { propagate: string[]; alias: true };
        refreshState: { propagate: string[] };
        refreshVisibility: object;
        refreshTransform: { propagate: string[]; alias: true };
        refreshPosition: object;
        refreshRotation: object;
        refreshSize: { propagate: string[] };
        refreshElevation: object;
        refreshMesh: { propagate: string[] };
        refreshShader: object;
        refreshShape: { propagate: string[] };
        refreshBorder: object;
        refreshBars: object;
        refreshEffects: object;
        refreshNameplate: object;
        refreshTarget: object;
        refreshTooltip: object;
        refreshRingVisuals: object;
        recoverFromPreview: object;
    };

    /** The shape of this token. */
    shape: TokenShape;

    /** Defines the filter to use for detection. */
    detectionFilter: PIXI.Filter | null;

    /** A Graphics instance which renders the border frame for this Token inside the GridLayer. */
    border: PIXI.Graphics;

    /** The effects icons of temporary ActiveEffects that are applied to the Actor of this Token. */
    effects: PIXI.Container;

    /** The attribute bars of this Token. */
    bars: PIXI.Container;

    /** The tooltip text of this Token, which contains its elevation. */
    tooltip: PreciseText;

    /** The target marker, which indicates that this Token is targeted by this User or others. */
    target: PIXI.Graphics;

    /** The nameplate of this Token, which displays its name. */
    nameplate: PreciseText;

    /**
     * The ruler of this Token.
     */
    ruler: BaseTokenRuler<this> | null;

    /**
     * The ruler data.
     */
    protected _plannedMovement: Record<string, TokenPlannedMovement>;

    /** Track the set of User documents which are currently targeting this Token */
    targeted: Set<User>;

    /** A reference to the SpriteMesh which displays this Token in the PrimaryCanvasGroup. */
    mesh: PrimarySpriteMesh | undefined;

    /** Renders the mesh of this Token with ERASE blending in the Token. */
    voidMesh: PIXI.DisplayObject;

    /** Renders the mesh of with the detection filter. */
    detectionFilterMesh: PIXI.DisplayObject;

    /** The texture of this Token, which is used by its mesh. */
    texture: PIXI.Texture;

    /**
     * A reference to the VisionSource object which defines this vision source area of effect.
     * This is undefined if the Token does not provide an active source of vision.
     */
    vision: PointVisionSource<this> | undefined;

    /**
     * A reference to the LightSource object which defines this light source area of effect.
     * This is undefined if the Token does not provide an active source of light.
     */
    light: PointLightSource<this>;

    /** The current animations of this Token. */
    get animationContexts(): Map<string, TokenAnimationContext>;

    /**
     * A TokenRing instance which is used if this Token applies a dynamic ring.
     * This property is null if the Token does not use a dynamic ring.
     * todo: Replace with correct type
     * @type {foundry.canvas.tokens.TokenRing|null}
     */
    get ring(): object;

    /** A convenience boolean to test whether the Token is using a dynamic ring. */
    get hasDynamicRing(): boolean;

    /* -------------------------------------------- */
    /*  Permission Attributes
        /* -------------------------------------------- */

    /** A convenient reference to the Actor object associated with the Token embedded document. */
    get actor(): TDocument["actor"];

    /** A boolean flag for whether the current game User has observer permission for the Token */
    get observer(): boolean;

    /** Convenience access to the token's nameplate string */
    get name(): string;

    /* -------------------------------------------- */
    /*  Rendering Attributes
        /* -------------------------------------------- */

    get bounds(): PIXI.Rectangle;

    /** Translate the token's grid width into a pixel width based on the canvas size */
    get w(): number;

    /** Translate the token's grid height into a pixel height based on the canvas size */
    get h(): number;

    /** The Token's current central position */
    get center(): PIXI.Point;

    /** The Token's central position, adjusted in each direction by one or zero pixels to offset it relative to walls. */
    getMovementAdjustedPoint(point: Point, options?: { offsetX: number; offsetY: number }): Point;

    /** The HTML source element for the primary Tile texture */
    get sourceElement(): HTMLImageElement | HTMLVideoElement;

    override get sourceId(): `Token.${string}`;

    /** Does this Tile depict an animated video texture? */
    get isVideo(): boolean;

    /* -------------------------------------------- */
    /*  State Attributes
        /* -------------------------------------------- */

    /** An indicator for whether or not this token is currently involved in the active combat encounter. */
    get inCombat(): boolean;

    /** Return a reference to a Combatant that represents this Token, if one is present in the current encounter. */
    get combatant(): TDocument["combatant"];

    /** An indicator for whether the Token is currently targeted by the active game User */
    get isTargeted(): boolean;

    /** Return a reference to the detection modes array. */
    get detectionModes(): TDocument["detectionModes"];

    /**
     * Determine whether the Token is visible to the calling user's perspective.
     * Hidden Tokens are only displayed to GM Users.
     * Non-hidden Tokens are always visible if Token Vision is not required.
     * Controlled tokens are always visible.
     * All Tokens are visible to a GM user if no Token is controlled.
     *
     * @see {CanvasVisibility#testVisibility}
     */
    get isVisible(): boolean;

    /** The animation name used for Token movement */
    get animationName(): string;

    /**
     * The animation name used to animate this Token's movement.
     */
    get movementAnimationName(): string;

    /* -------------------------------------------- */
    /*  Lighting and Vision Attributes              */
    /* -------------------------------------------- */

    /** Test whether the Token has sight (or blindness) at any radius */
    get hasSight(): boolean;

    /** Does this Token actively emit light given its properties and the current darkness level of the Scene? */
    protected _isLightSource(): boolean;

    /**
     * Does this Ambient Light actively emit darkness given
     * its properties and the current darkness level of the Scene?
     */
    get emitsDarkness(): boolean;

    /**
     * Does this Ambient Light actively emit light given
     * its properties and the current darkness level of the Scene?
     */
    get emitsLight(): boolean;

    /** Test whether the Token uses a limited angle of vision or light emission. */
    get hasLimitedSourceAngle(): boolean;

    /** Translate the token's dim light distance in units into a radius in pixels. */
    get dimRadius(): number;

    /** Translate the token's bright light distance in units into a radius in pixels. */
    get brightRadius(): number;

    /** The maximum radius in pixels of the light field */
    get radius(): number;

    /** The range of this token's light perception in pixels. */
    get lightPerceptionRange(): number;

    /** Translate the token's vision range in units into a radius in pixels. */
    get sightRange(): number;

    /** Translate the token's maximum vision range that takes into account lights. */
    get optimalSightRange(): number;

    /**
     * Update the light and vision source objects associated with this Token.
     * @param [options={}]              Options which configure how perception sources are updated
     * @param [options.deleted=false]   Indicate that this light and vision source has been deleted
     */
    initializeSources(options?: { deleted?: boolean }): void;

    /**
     * Update an emitted light source associated with this Token.
     * @param [options={}]
     * @param [options.deleted]    Indicate that this light source has been deleted.
     */
    initializeLightSource(options?: { deleted?: boolean }): void;

    /** Get the light source data. */
    protected _getLightSourceData(): LightSourceData;

    /**
     * Update the VisionSource instance associated with this Token.
     * @param [options]           Options which affect how the vision source is updated
     * @param [options.deleted]   Indicate that this vision source has been deleted.
     */
    initializeVisionSource(options?: { deleted?: boolean }): void;

    /** Returns a record of blinding state. */
    protected _getVisionBlindedStates(): Record<string, boolean>;

    /** Get the vision source data. */
    protected _getVisionSourceData(): VisionSourceData;

    /** Test whether this Token is a viable vision source for the current User. */
    protected _isVisionSource(): boolean;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /**
     * Render the bound mesh detection filter.
     * Note: this method does not verify that the detection filter exists.
     */
    protected _renderDetectionFilter(renderer: PIXI.Renderer): void;

    override clear(): this;

    protected override _destroy(options?: boolean | PIXI.IDestroyOptions): void;

    protected override _draw(options?: object): Promise<void>;

    /* -------------------------------------------- */
    /*  Incremental Refresh                         */
    /* -------------------------------------------- */

    protected override _applyRenderFlags(flags: Record<string, boolean>): void;

    /** Recovering state after a preview. */
    protected _recoverFromPreview(): void;

    /** Refresh the token ring visuals if necessary. */
    protected _refreshRingVisuals(): void;

    /** Refresh the visibility. */
    protected _refreshVisibility(): void;

    /**
     * Refresh aspects of the user interaction state.
     * For example the border, nameplate, or bars may be shown on Hover or on Control.
     */
    protected _refreshState(): void;

    /** Refresh the size. */
    protected _refreshSize(): void;

    /** Refresh the shape. */
    protected _refreshShape(): void;

    /** Refresh the rotation. */
    protected _refreshRotation(): void;

    /** Refresh the position. */
    protected _refreshPosition(): void;

    /** Refresh the elevation */
    protected _refreshElevation(): void;

    /** Refresh the tooltip. */
    protected _refreshTooltip(): void;

    /** Refresh the text content, position, and visibility of the Token nameplate. */
    protected _refreshNameplate(): void;

    /** Refresh the token mesh. */
    protected _refreshMesh(): void;

    /** Refresh the token mesh shader. */
    protected _refreshShader(): void;

    /** Refresh the border. */
    protected _refreshBorder(): void;

    /**
     * Get the hex color that should be used to render the Token border
     * @returns    The hex color used to depict the border color
     */
    protected _getBorderColor(): number;

    /**
     * Refresh the target indicators for the Token.
     * Draw both target arrows for the primary User and indicator pips for other Users targeting the same Token.
     * @param [reticule]  Additional parameters to configure how the targeting reticule is drawn.
     */
    protected _refreshTarget(reticule?: ReticuleOptions): void;

    /**
     * Draw the targeting arrows around this token.
     * @param [reticule]  Additional parameters to configure how the targeting reticule is drawn.
     */
    protected _drawTarget(reticule?: ReticuleOptions): void;

    /**
     * Refresh the display of Token attribute bars, rendering its latest resource data.
     * If the bar attribute is valid (has a value and max), draw the bar. Otherwise hide it.
     */
    drawBars(): void;

    /**
     * Draw a single resource bar, given provided data
     * @param number The Bar number
     * @param bar The Bar container
     * @param data Resource data for this bar
     */
    protected _drawBar(number: number, bar: PIXI.Graphics, data: TokenResourceData): void;

    /** Return the text which should be displayed in a token's tooltip field */
    protected _getTooltipText(): string;

    /** Get the text style that should be used for this Token's tooltip. */
    protected _getTextStyle(): PIXI.TextStyle;

    /** Draw the effect icons for ActiveEffect documents which apply to the Token's Actor. */
    drawEffects(): Promise<void>;

    /**
     * Draw the effect icons for ActiveEffect documents which apply to the Token's Actor.
     * Called by {@link Token#drawEffects}.
     */
    protected _drawEffects(): Promise<void>;

    /** Draw a status effect icon */
    protected _drawEffect(src: string, tint: ColorSource | null): Promise<PIXI.Sprite | void>;

    /** Draw the overlay effect icon */
    protected _drawOverlay(src: string, tint: number | null): Promise<PIXI.Sprite>;

    /** Refresh the display of status effects, adjusting their position for the token width and height. */
    protected _refreshEffects(): void;

    /**
     * Helper method to determine whether a token attribute is viewable under a certain mode
     * @param mode The mode from CONST.TOKEN_DISPLAY_MODES
     * @return Is the attribute viewable?
     */
    protected _canViewMode(mode: TokenDisplayMode): boolean;

    /* -------------------------------------------- */
    /*  Token Ring                                  */
    /* -------------------------------------------- */

    /** Override ring colors for this particular Token instance. */
    getRingColors(): { ring: Color; background: Color };

    /**
     * Apply additional ring effects for this particular Token instance.
     * Effects are returned as an array of integers in {@link foundry.canvas.tokens.TokenRing.effects}.
     */
    getRingEffects(): number[];

    /* -------------------------------------------- */
    /*  Token Animation                             */
    /* -------------------------------------------- */

    /**
     * Get the animation data for the current state of the document.
     * @returns    The target animation data object
     */
    protected _getAnimationData(): TokenAnimationData;

    /**
     * Animate from the old to the new state of this Token.
     * @param to                           The animation data to animate to
     * @param [options]                    The options that configure the animation behavior.
     *                                     Passed to {@link Token#_getAnimationDuration}.
     * @param [options.duration]           The duration of the animation in milliseconds
     * @param [options.movementSpeed=6]    A desired token movement speed in grid spaces per second
     * @param [options.transition]         The desired texture transition type
     * @param [options.easing]             The easing function of the animation
     * @param [options.name]               The name of the animation, or null if nameless.
     *                                     The default is {@link Token#animationName}.
     * @param [options.ontick]             A on-tick callback
     * @returns    A promise which resolves once the animation has finished or stopped
     */
    animate(to: Partial<TokenAnimationData>, options?: TokenAnimationOptions): Promise<void>;

    /**
     * Get the duration of the animation.
     * @param from                         The animation data to animate from
     * @param to                           The animation data to animate to
     * @param [options]                    The options that configure the animation behavior
     * @param [options.movementSpeed=6]    A desired token movement speed in grid spaces per second
     * @returns    The duration of the animation in milliseconds
     */
    protected _getAnimationDuration(
        from: TokenAnimationData,
        to: Partial<TokenAnimationData>,
        options?: { movementSpeed?: number },
    ): number;

    /**
     * Prepare the animation data changes: performs special handling required for animating rotation.
     * @param from                         The animation data to animate from
     * @param changes                      The animation data changes
     * @param context                      The animation context
     * @param [options]                    The options that configure the animation behavior
     * @param [options.transition="fade"]  The desired texture transition type
     * @returns    The animation attributes
     */
    protected _prepareAnimation(
        from: TokenAnimationData,
        changes: Partial<TokenAnimationData>,
        context: Omit<TokenAnimationContext, "promise">,
        options?: { transition: string },
    ): CanvasAnimationAttribute[];

    /**
     * Called each animation frame.
     * @param changed    The animation data that changed
     * @param context    The animation context
     */
    protected _onAnimationUpdate(changed: Partial<TokenAnimationData>, context: TokenAnimationContext): void;

    /**
     * Terminate the animations of this particular Token, if exists.
     * @param [options]               Additional options.
     * @param [options.reset=true]    Reset the TokenDocument?
     */
    stopAnimation(options?: { reset?: boolean }): void;

    /* -------------------------------------------- */
    /*  Methods
        /* -------------------------------------------- */

    /**
     * Check for collision when attempting a move to a new position
     * @param destination              The central destination point of the attempted movement
     * @param [options={}]             Additional options forwarded to PointSourcePolygon.testCollision
     * @param [options.origin]         The origin to be used instead of the current origin
     * @param [options.type="move"]    The collision type
     * @param [options.mode="any"]     The collision mode to test: "any", "all", or "closest"
     * @returns                        The collision result depends on the mode of the test:
     *                                     * any: returns a boolean for whether any collision occurred
     *                                     * all: returns a sorted array of PolygonVertex instances
     *                                     * closest: returns a PolygonVertex instance or null
     */
    checkCollision(destination: Point, { type, mode }: { type?: WallRestrictionType; mode: "closest" }): PolygonVertex;
    checkCollision(destination: Point, { type, mode }: { type?: WallRestrictionType; mode: "any" }): boolean;
    checkCollision(destination: Point, { type, mode }: { type?: WallRestrictionType; mode: "all" }): PolygonVertex[];
    checkCollision(
        destination: Point,
        { type, mode }?: { type?: WallRestrictionType; mode?: undefined },
    ): PolygonVertex[];
    checkCollision(
        destination: Point,
        { type, mode }?: { type?: WallRestrictionType; mode?: "any" | "all" | "closest" },
    ): boolean | PolygonVertex | PolygonVertex[];

    /**
     * Get the width and height of the Token in pixels.
     * @returns The size in pixels
     */
    getSize(): { width: number; height: number };

    /** Get the shape of this Token. */
    getShape(): TokenShape;

    /**
     * Get the center point for a given position or the current position.
     * @param [position]    The position to be used instead of the current position
     * @returns    The center point
     */
    getCenterPoint(position?: Point): Point;

    override getSnappedPosition(position?: Point): Point;

    /**
     * Test whether the Token is inside the Region.
     * This function determines the state of {@link TokenDocument#regions} and {@link RegionDocument#tokens}.
     *
     * Implementations of this function are restricted in the following ways:
     *   - If the bounds (given by {@link Token#getSize}) of the Token do not intersect the Region, then the Token is not
     *     contained within the Region.
     *   - If the Token is inside the Region a particular elevation, then the Token is inside the Region at any elevation
     *     within the elevation range of the Region.
     *
     * If this function is overridden, then {@link Token#segmentizeRegionMovement} must be overridden too.
     * @param region   The region.
     * @param position The (x, y) and/or elevation to use instead of the current values.
     * @returns Is the Token inside the Region?
     */
    testInsideRegion(
        region: Region,
        position: Point | (Point & { elevation: number }) | { elevation: number },
    ): boolean;

    /**
     * Split the Token movement through the waypoints into its segments.
     *
     * Implementations of this function are restricted in the following ways:
     *   - The segments must go through the waypoints.
     *   - The *from* position matches the *to* position of the succeeding segment.
     *   - The Token must be contained (w.r.t. {@link Token#testInsideRegion}) within the Region
     *     at the *from* and *to* of MOVE segments.
     *   - The Token must be contained (w.r.t. {@link Token#testInsideRegion}) within the Region
     *     at the *to* position of ENTER segments.
     *   - The Token must be contained (w.r.t. {@link Token#testInsideRegion}) within the Region
     *     at the *from* position of EXIT segments.
     *   - The Token must not be contained (w.r.t. {@link Token#testInsideRegion}) within the Region
     *     at the *from* position of ENTER segments.
     *   - The Token must not be contained (w.r.t. {@link Token#testInsideRegion}) within the Region
     *     at the *to* position of EXIT segments.
     * @param region    The region.
     * @param waypoints The waypoints of movement.
     * @param [options] Additional options
     * @param [options.teleport=false] Is it teleportation?
     * @returns The movement split into its segments.
     */
    segmentizeRegionMovement(
        region: Region,
        waypoints: RegionMovementWaypoint[],
        options?: { teleport?: boolean },
    ): RegionMovementSegment[];

    /**
     * Set this Token as an active target for the current game User.
     * Note: If the context is set with groupSelection:true, you need to manually broadcast the activity for other users.
     * @param targeted                        Is the Token now targeted?
     * @param [context={}]                    Additional context options
     * @param [context.user=null]             Assign the token as a target for a specific User
     * @param [context.releaseOthers=true]    Release other active targets for the same player?
     * @param [context.groupSelection=false]  Is this target being set as part of a group selection workflow?
     */
    setTarget(
        targeted?: boolean,
        context?: { user?: User | null; releaseOthers?: boolean; groupSelection?: boolean },
    ): void;

    /** The external radius of the token in pixels. */
    get externalRadius(): number;

    /**
     * A generic transformation to turn a certain number of grid units into a radius in canvas pixels.
     * This function adds additional padding to the light radius equal to the external radius of the token.
     * This causes light to be measured from the outer token edge, rather than from the center-point.
     * @param units  The radius in grid units
     * @returns    The radius in pixels
     */
    getLightRadius(units: number): number;

    protected override _getShiftedPosition(dx: number, dy: number): Point;

    protected override _updateRotation({
        angle,
        delta,
        snap,
    }?: {
        angle?: number;
        delta?: number;
        snap?: number;
    }): number;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: TDocument["_source"],
        options: DatabaseCreateCallbackOptions,
        userId: string,
    ): void;

    override _onUpdate(
        changed: DeepPartial<TDocument["_source"]>,
        options: TokenUpdateCallbackOptions,
        userId: string,
    ): void;

    /**
     * Handle changes to Token behavior when a significant status effect is applied
     * @param statusId      The status effect ID being applied, from CONFIG.specialStatusEffects
     * @param active        Is the special status effect now active?
     * @internal
     */
    protected _onApplyStatusEffect(statusId: string, active: boolean): void;

    /**
     * Add/Modify a filter effect on this token.
     * @param statusId      The status effect ID being applied, from CONFIG.specialStatusEffects
     * @param active        Is the special status effect now active?
     * @internal
     */
    _configureFilterEffect(statusId: string, active: boolean): void;

    /**
     * Update the filter effects depending on special status effects
     * @internal
     */
    _updateSpecialStatusFilterEffects(): void;

    /**
     * Remove all filter effects on this placeable.
     * @internal
     */
    _removeAllFilterEffects(): void;

    protected override _onControl(options?: { releaseOthers?: boolean; pan?: boolean }): void;

    protected override _onRelease(options?: object): void;

    override _overlapsSelection(rectangle: PIXI.Rectangle): boolean;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Is the Ruler active and measuring or is moving this Token?
     * If this is the case, the interaction with this Token is prevented.
     * @internal
     */
    get _isRulerActive(): boolean;

    protected override _canControl(user: User, event?: PIXI.FederatedEvent): boolean;

    protected override _canHUD(user: User, event?: PIXI.FederatedEvent): boolean;

    protected override _canConfigure(user: User, event?: PIXI.FederatedEvent): boolean;

    protected override _canHover(user: User, event?: PIXI.FederatedEvent): boolean;

    protected override _canView(user: User, event?: PIXI.FederatedEvent): boolean;

    protected override _canDrag(user: User, event?: PIXI.FederatedEvent): boolean;

    protected override _onHoverIn(
        event: PIXI.FederatedPointerEvent,
        { hoverOutOthers }?: { hoverOutOthers?: boolean },
    ): boolean | void;

    protected override _onHoverOut(event: PIXI.FederatedPointerEvent): boolean | void;

    protected override _onClickLeft(event: TokenPointerEvent<this>): void;

    protected override _propagateLeftClick(event: PIXI.FederatedPointerEvent): boolean;

    protected override _onClickLeft2(event: PIXI.FederatedPointerEvent): void;

    protected override _onClickRight2(event: PIXI.FederatedPointerEvent): void;

    protected override _onDragLeftStart(event: TokenPointerEvent<this>): void;

    protected override _prepareDragLeftDropUpdates(event: PIXI.FederatedEvent): Record<string, unknown>[] | null;

    protected override _onDragLeftMove(event: TokenPointerEvent<this>): void;

    protected override _onDragEnd(): void;
}

export default interface Token<TDocument extends TokenDocument = TokenDocument> extends PlaceableObject<TDocument> {
    get layer(): TokenLayer<this>;
}

type TokenShape = Extract<PlaceableShape, PIXI.Circle | PIXI.Polygon | PIXI.Rectangle>;

interface TokenResourceData {
    attribute: string;
    type: "bar";
    value: number;
    max?: number;
    editable: boolean;
}

interface TokenPointerEvent<T extends Token> extends PlaceablesLayerPointerEvent<T> {
    interactionData: PlaceablesLayerPointerEvent<T>["interactionData"] & {
        clones?: T[];
    };
}
