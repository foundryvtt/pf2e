/** An abstract pattern for primary layers of the game canvas to implement */
declare abstract class CanvasLayer extends PIXI.Container {
    /** Options for this layer instance. */
    options: CanvasLayerOptions;

    /** Default interactivity */
    interactiveChildren: boolean;

    /* -------------------------------------------- */
    /*  Layer Attributes                            */
    /* -------------------------------------------- */

    /** Customize behaviors of this CanvasLayer by modifying some behaviors at a class level. */
    static get layerOptions(): CanvasLayerOptions;

    /** Return a reference to the active instance of this canvas layer */
    static get instance(): CanvasLayer;

    /**
     * The canonical name of the CanvasLayer is the name of the constructor that is the immediate child of the
     * defined baseClass for the layer type.
     *
     * @example
     * canvas.lighting.name -> "LightingLayer"
     * canvas.grid.name -> "GridLayer"
     */
    get name(): string;

    /**
     * The name used by hooks to construct their hook string.
     * Note: You should override this getter if hookName should not return the class constructor name.
     */
    get hookName(): string;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /**
     * Draw the canvas layer, rendering its internal components and returning a Promise.
     * The Promise resolves to the drawn layer once its contents are successfully rendered.
     * @param options Options which configure how the layer is drawn
     */
    draw(options?: object): Promise<this>;

    /**
     * The inner _draw method which must be defined by each CanvasLayer subclass.
     * @param options Options which configure how the layer is drawn
     */
    protected abstract _draw(options?: object): Promise<void>;

    /**
     * Deconstruct data used in the current layer in preparation to re-draw the canvas
     * @param options Options which configure how the layer is deconstructed
     */
    tearDown(options?: object): Promise<this>;

    /**
     * The inner _tearDown method which may be customized by each CanvasLayer subclass.
     * @param options Options which configure how the layer is deconstructed
     */
    protected _tearDown(options?: object): Promise<void>;
}

declare interface CanvasLayerOptions {
    name: string;
    baseClass: string;
}
