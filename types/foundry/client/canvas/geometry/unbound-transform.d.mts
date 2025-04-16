/**
 * A custom Transform class which is not bound to the parent worldTransform.
 * localTransform are working as usual.
 */
export default class UnboundTransform extends PIXI.Transform {
    static override IDENTITY: UnboundTransform;

    override updateTransform(parentTransform: PIXI.Transform): void;
}
