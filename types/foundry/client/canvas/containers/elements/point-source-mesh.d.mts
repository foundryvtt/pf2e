/**
 * Extension of a PIXI.Mesh, with the capabilities to provide a snapshot of the framebuffer.
 */
export default class PointSourceMesh extends PIXI.Mesh {
    /* -------------------------------------------- */
    /*  PointSourceMesh Properties                  */
    /* -------------------------------------------- */

    override get geometry(): PIXI.Geometry;

    override set geometry(value: PIXI.Geometry);

    /* -------------------------------------------- */
    /*  PointSourceMesh Methods                     */
    /* -------------------------------------------- */

    override addChild(): never;

    override addChildAt(): never;

    protected override _render(renderer: PIXI.Renderer): void;

    override calculateBounds(): void;

    protected override _calculateBounds(): void;

    /** The local bounds need to be drawn from the underlying geometry. */
    override getLocalBounds(rect: PIXI.Rectangle): PIXI.Rectangle;
}
