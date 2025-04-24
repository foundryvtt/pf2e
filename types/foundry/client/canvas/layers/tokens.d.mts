import { TokenPlannedMovement } from "@client/_module.mjs";
import TokenHUD from "@client/applications/hud/token-hud.mjs";
import { SceneControl } from "@client/applications/ui/scene-controls.mjs";
import User from "@client/documents/user.mjs";
import { ElevatedPoint, Point, Rectangle } from "@common/_types.mjs";
import { CanvasQuadtree } from "../geometry/_module.mjs";
import { Token } from "../placeables/_module.mjs";
import { CanvasHistoryEvent, PlaceablesLayerOptions } from "./_types.mjs";
import PlaceablesLayer, { MinusOneToOne, PlaceablesLayerPointerEvent } from "./base/placeables-layer.mjs";

export type TokenOcclusionMode = (typeof CONST.TOKEN_OCCLUSION_MODES)[keyof typeof CONST.TOKEN_OCCLUSION_MODES];

/**
 * The Tokens Container.
 * @category Canvas
 */
export default class TokenLayer<TObject extends Token = Token> extends PlaceablesLayer<TObject> {
    override quadtree: CanvasQuadtree<TObject>;

    /**
     * The ruler paths.
     * @internal
     */
    _rulerPaths: PIXI.Container;

    /**
     * The current index position in the tab cycle
     * @internal
     */
    _tabIndex: number | null;

    /**
     * The Token that the drag workflow was initiated on, if there's a drag workflow in progress.
     * Set in {@link foundry.canvas.placeables.Token#_onDragLeftStart} and
     * {@link foundry.canvas.placeables.Token#_onDragLeftCancel}.
     * @internal
     */
    _draggedToken: TObject | null;

    /**
     * The currently selected movement action override.
     * @internal
     */
    _dragMovementAction: string | null;

    static override get layerOptions(): PlaceablesLayerOptions;

    static override documentName: "Token";

    /** The set of tokens that trigger occlusion (a union of {@link CONST.TOKEN_OCCLUSION_MODES}). */
    get occlusionMode(): TokenOcclusionMode;

    set occlusionMode(value: TokenOcclusionMode);

    override get hookName(): string;

    /* -------------------------------------------- */
    /*  Properties
    /* -------------------------------------------- */

    override get hud(): TokenHUD;

    /** An Array of tokens which belong to actors which are owned  */
    get ownedTokens(): TObject[];

    /** A Set of Token objects which currently display a combat turn marker. */
    turnMarkers: Set<TObject>;

    /* -------------------------------------------- */
    /*  Methods
    /* -------------------------------------------- */

    override getSnappedPoint(point: Point): Point;

    override _prepareKeyboardMovementUpdates(
        objects: TObject[],
        dx: MinusOneToOne,
        dy: MinusOneToOne,
        dz: MinusOneToOne,
    ): ({ _id: string } & ElevatedPoint)[];

    protected override _draw(options: object): Promise<void>;

    override tearDown(options?: object): Promise<this>;

    protected override _activate(): void;

    protected override _deactivate(): void;

    /**
     * Target all Token instances which fall within a coordinate rectangle.
     * @param rectangle              The selection rectangle.
     * @param [options]              Additional options to configure targeting behaviour.
     * @param options.releaseOthers  Whether or not to release other targeted tokens
     */
    targetObjects(rectangle: Rectangle, options?: { releaseOthers: boolean }): boolean;

    /**
     * Assign multiple token targets
     * @param targetIds     The array or set of Token IDs.
     * @param [options]     Additional options to configure targeting behaviour.
     * @param options.mode  The mode that determines the targeting behavior.
     *   - `"replace"` (default): Replace the current set of targeted Tokens with provided set of Tokens.
     *   - `"acquire"`: Acquire the given Tokens as targets without releasing already targeted Tokens.
     *   - `"release"`: Release the given Tokens as targets.
     */
    setTargets(targetIds: string[] | Set<string>, options?: { mode: "replace" | "acquire" | "release" }): void;

    /**
     * Cycle the controlled token by rotating through the list of Owned Tokens that are available within the Scene
     * Tokens are currently sorted in order of their TokenID
     *
     * @param forwards  Which direction to cycle. A truthy value cycles forward, while a false value cycles backwards.
     * @param reset  Restart the cycle order back at the beginning?
     * @returns  The Token object which was cycled to, or null
     */
    cycleTokens(forwards: boolean, reset: boolean): TObject | null;

    /** Immediately conclude the animation of any/all tokens  */
    concludeAnimation(): void;

    /** Recalculate the planned movement paths of all Tokens for the current User. */
    recalculatePlannedMovementPaths(): void;

    /**
     * Handle broadcast planned movement update.
     * @param user              The User the planned movement data belongs to
     * @param plannedMovements  The planned movement data
     * @internal
     */
    _updatePlannedMovements(
        user: User,
        plannedMovements: { [tokenId: string]: TokenPlannedMovement | null } | null,
    ): void;

    /**
     * Provide an array of Tokens which are eligible subjects for tile occlusion.
     * By default, only tokens which are currently controlled or owned by a player are included as subjects.
     */
    protected _getOccludableTokens(): TObject[];

    override _getMovableObjects(ids?: string[], includeLocked?: boolean): TObject[];

    override _getCopyableObjects(options: { cut?: boolean }): TObject[];

    override storeHistory(
        type: CanvasHistoryEvent["type"],
        data: DeepPartial<TObject["document"]["_source"]>,
        options?: object,
    ): void;

    protected override _onCycleViewKey(event: KeyboardEvent): boolean;

    protected override _confirmDeleteKey(documents: TObject["document"][]): Promise<boolean>;

    static override prepareSceneControls(): SceneControl;

    protected override _highlightObjects(active: boolean): void;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Handle dropping of Actor data onto the Scene canvas
     * @param {DragEvent} event
     * @param {{type: "Actor"; uuid: string; x: number; y: number; elevation?: number}} data
     * @internal
     */
    _onDropActorData(
        event: DragEvent,
        data: { type: "Actor"; uuid: string; x: number; y: number; elevation?: number },
    ): Promise<TObject>;

    protected override _onClickLeft(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onClickLeft2(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onClickRight(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onClickRight2(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftCancel(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onMouseWheel(event: WheelEvent): Promise<TObject[]>;
}
