/**
 * A custom Transform class allowing to observe changes with a callback.
 */
export default class ObservableTransform extends PIXI.Transform {
    /**
     * @param callback The callback called to observe changes.
     * @param scope    The scope of the callback.
     */
    constructor(callback: Function, scope: object);

    /**
     * The callback which is observing the changes.
     */
    cb: Function;

    /**
     * The scope of the callback.
     */
    scope: object;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    override onChange(): void;

    override updateSkew(): void;
}
