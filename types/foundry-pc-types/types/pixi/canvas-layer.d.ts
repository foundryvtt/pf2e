declare interface CanvasLayerOptions {
    zIndex: number;
    sortActiveTop: boolean;
}

/**
 * An abstract pattern for primary layers of the game canvas to implement
 */
declare abstract class CanvasLayer extends PIXI.Container {
    /**
     * Track whether the canvas layer is currently active for interaction
     */
    protected _active: boolean;

    interactive: boolean;

    interactiveChildren: boolean;

    constructor();


    /**
     * Customize behaviors of this CanvasLayer by modifying some behaviors at a class level.
     * @property zIndex        The zIndex sorting of this layer relative to other layers
     * @property sortActiveTop Should this layer be sorted to the top when it is active?
     */
    static get layerOptions(): CanvasLayerOptions;

    /**
     * Return a reference to the active instance of this canvas layer
     */
    static get instance(): CanvasLayer;

    /**
     * The canonical name of the CanvasLayer
     */
    readonly name: string;

    /**
     * Deconstruct data used in the current layer in preparation to re-draw the canvas
     */
    tearDown(): void;

    /**
     * Draw the canvas layer, rendering its internal components and returning a Promise
     * The Promise resolves to the drawn layer once its contents are successfully rendered.
     */
    draw(): Promise<this>;

    /**
     * Activate the CanvasLayer, deactivating other layers and marking this layer's children as interactive.
     * @return The layer instance, now activated
     */
    activate(): this | undefined;

    /**
     * Deactivate the CanvasLayer, removing interactivity from its children.
     */
    deactivate(): void;
}
