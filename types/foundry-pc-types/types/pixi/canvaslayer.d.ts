/**
 * An abstract pattern for primary layers of the game canvas to implement
 */
declare abstract class CanvasLayer extends PIXI.Container {
    constructor();

    /* -------------------------------------------- */
    /*  Properties and Attributes
    /* -------------------------------------------- */

    /* -------------------------------------------- */
    /*  Rendering
    /* -------------------------------------------- */

    /**
     * Draw the canvas layer, rendering its internal components and returning a Promise
     * The Promise resolves to the drawn layer once its contents are successfully rendered.
     */
    draw(): Promise<this>;

    /* -------------------------------------------- */
    /*  Methods
    /* -------------------------------------------- */

    activate(): void;

    deactivate(): void;
}
