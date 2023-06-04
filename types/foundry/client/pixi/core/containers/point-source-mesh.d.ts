/** Extension of a PIXI.Mesh, with the capabilities to provide a snapshot of the framebuffer. */
declare class PointSourceMesh extends PIXI.Mesh {
    /** To store the previous blend mode of the last renderer PointSourceMesh. */
    protected static _priorBlendMode: PIXI.BLEND_MODES;

    /** The current texture used by the mesh. */
    protected static _currentTexture: PIXI.Texture;

    /** The transform world ID of the bounds. */
    protected _worldID: number;

    /** The geometry update ID of the bounds. */
    protected _updateID: number;

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
