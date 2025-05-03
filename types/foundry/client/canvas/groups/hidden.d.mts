import CanvasGroupMixin from "./canvas-group-mixin.mjs";

/**
 * A specialized canvas group for rendering hidden containers before all others (like masks).
 */
export default class HiddenCanvasGroup extends CanvasGroupMixin(PIXI.Container) {
    constructor();

    override eventMode: "none";

    /**
     * The container which hold masks.
     */
    masks: PIXI.Container;

    static override groupName: "hidden";

    /**
     * Add a mask to this group.
     * @param name Name of the mask.
     * @param displayObject Display object to add.
     * @param position Position of the mask.
     */
    addMask(name: string, displayObject: PIXI.DisplayObject, position?: number): void;

    /**
     * Invalidate the masks: flag them for rerendering.
     */
    invalidateMasks(): void;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _draw(options?: object): Promise<void>;

    /* -------------------------------------------- */
    /*  Tear-Down                                   */
    /* -------------------------------------------- */

    protected override _tearDown(options: object): Promise<void>;
}
