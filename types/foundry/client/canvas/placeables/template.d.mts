import { MeasuredTemplateDocument, User } from "@client/documents/_module.mjs";
import { Point } from "@common/_types.mjs";
import { DatabaseUpdateCallbackOptions } from "@common/abstract/_types.mjs";
import { ControlIcon, PreciseText } from "../containers/_module.mjs";
import { Ray } from "../geometry/_module.mjs";
import { TemplateLayer } from "../layers/_module.mjs";
import PlaceableObject, { PlaceableShape } from "./placeable-object.mjs";

/**
 * A type of Placeable Object which highlights an area of the grid as covered by some area of effect.
 * @category - Canvas
 * @see {@link MeasuredTemplateDocument}
 * @see {@link TemplateLayer}
 */
export default class MeasuredTemplate<
    TDocument extends MeasuredTemplateDocument = MeasuredTemplateDocument,
> extends PlaceableObject<TDocument> {
    /** The template shape used for testing point intersection */
    shape: PlaceableShape;

    /** The tiling texture used for this template, if any */
    texture: PIXI.Texture | undefined;

    /** The template graphics */
    template: PIXI.Graphics;

    /** The template control icon */
    controlIcon: ControlIcon;

    /** The measurement ruler label */
    ruler: PreciseText;

    /** Internal property used to configure the control border thickness */
    protected _borderThickness: number;

    static override embeddedName: "MeasuredTemplate";

    static override RENDER_FLAGS: {
        redraw: { propagate: ["refresh"] };
        refresh: { propagate: ["refreshState", "refreshShape"]; alias: true };
        refreshState: object;
        refreshShape: { propagate: ["refreshPosition", "refreshGrid", "refreshText", "refreshTemplate"] };
        refreshTemplate: object;
        refreshPosition: { propagate: ["refreshGrid"] };
        refreshGrid: object;
        refreshText: object;
    };

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /** A convenient reference for whether the current User is the author of the MeasuredTemplate document. */
    get isAuthor(): boolean;

    override get bounds(): PIXI.Rectangle;

    /** Is this MeasuredTemplate currently visible on the Canvas? */
    get isVisible(): boolean;

    /** A unique identifier which is used to uniquely identify related objects like a template effect or grid highlight. */
    get highlightId(): string;

    // Undocumented
    ray?: Ray;

    /* -------------------------------------------- */
    /*  Initial Drawing                             */
    /* -------------------------------------------- */

    protected _draw(): Promise<void>;

    override _destroy(options?: boolean | PIXI.IDestroyOptions): void;

    /* -------------------------------------------- */
    /*  Incremental Refresh                         */
    /* -------------------------------------------- */

    protected override _applyRenderFlags(flags: TemplateRenderFlags): void;

    /**
     * Refresh the displayed state of the MeasuredTemplate.
     * This refresh occurs when the user interaction state changes.
     */
    protected _refreshState(): void;

    /** Refresh the elevation of the control icon. */
    protected _refreshElevation(): void;

    protected override _getTargetAlpha(): number;

    /** Refresh the position of the MeasuredTemplate */
    protected _refreshPosition(): void;

    /** Refresh the underlying geometric shape of the MeasuredTemplate. */
    protected _refreshShape(): void;

    /**
     * Compute the geometry for the template using its document data.
     * Subclasses can override this method to take control over how different shapes are rendered.
     */
    protected _computeShape(): TemplateShape;

    /**
     * Refresh the display of the template outline and shape.
     * Subclasses may override this method to take control over how the template is visually rendered.
     */
    protected _refreshTemplate(): void;

    /** Get a Circular area of effect given a radius of effect */
    static getCircleShape(distance: number): PIXI.Circle;

    /** Get a Conical area of effect given a direction, angle, and distance */
    static getConeShape(distance: number, direction: number, angle: number): PIXI.Polygon;

    /** Get a Rectangular area of effect given a width and height */
    static getRectShape(distance: number, direction: number): PIXI.Rectangle;

    /** Get a rotated Rectangular area of effect given a width, height, and direction */
    static getRayShape(distance: number, direction: number, width: number): PIXI.Polygon;

    /** Update the displayed ruler tooltip text */
    protected _refreshRulerText(): void;

    /** Highlight the grid squares which should be shown under the area of effect */
    highlightGrid(): void;

    /** Get the shape to highlight on a Scene which uses grid-less mode. */
    protected _getGridHighlightShape(): TemplateShape;

    /** Get an array of points which define top-left grid spaces to highlight for square or hexagonal grids. */
    protected _getGridHighlightPositions(): Point[];

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    override rotate(angle: number, snap: number): Promise<this>;

    /* -------------------------------------------- */
    /*  Document Event Handlers                     */
    /* -------------------------------------------- */

    protected override _onUpdate(
        changed: DeepPartial<TDocument["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        userId: string,
    ): void;

    /* -------------------------------------------- */
    /*  Interactivity                               */
    /* -------------------------------------------- */

    protected override _canControl(user: User, event?: PIXI.FederatedEvent): boolean;

    protected override _canHUD(user: User, event?: PIXI.FederatedEvent): boolean;

    protected override _canConfigure(user: User, event?: PIXI.FederatedEvent): boolean;

    protected override _canView(user: User, event?: PIXI.FederatedEvent): boolean;

    protected override _onClickRight(event: PIXI.FederatedPointerEvent): void;
}

export default interface MeasuredTemplate<TDocument extends MeasuredTemplateDocument = MeasuredTemplateDocument>
    extends PlaceableObject<TDocument> {
    get layer(): TemplateLayer<this>;
}

export type TemplateShape = Extract<PlaceableShape, PIXI.Circle | PIXI.Polygon | PIXI.Rectangle>;
export type TemplateRenderFlags = { [K in keyof typeof MeasuredTemplate.RENDER_FLAGS]?: boolean };
