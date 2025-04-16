import CanvasLayer from "../layers/base/canvas-layer.mjs";

/**
 * A mixin which decorates any container with base canvas common properties.
 * @param {typeof PIXI.Container} ContainerClass  The parent Container class being mixed.
 * @returns A ContainerClass subclass mixed with CanvasGroupMixin features.
 */
export default function CanvasGroupMixin(ContainerClass: typeof PIXI.Container) {
    class CanvasGroup extends ContainerClass {
        constructor(...args: any[]);

        /**
         * The name of this canvas group.
         */
        static groupName: string | undefined;

        /**
         * If this canvas group should teardown non-layers children.
         */
        static tearDownChildren: boolean;

        /**
         * The canonical name of the canvas group is the name of the constructor that is the immediate child of the
         * defined base class.
         */
        get name(): string;

        /**
         * The name used by hooks to construct their hook string.
         * Note: You should override this getter if hookName should not return the class constructor name.
         */
        get hookName(): string;

        /**
         * A mapping of CanvasLayer classes which belong to this group.
         */
        layers: Record<string, CanvasLayer>;

        /* -------------------------------------------- */

        /**
         * Create CanvasLayer instances which belong to the canvas group.
         */
        protected _createLayers(): Record<string, CanvasLayer>;

        /* -------------------------------------------- */
        /*  Rendering                                   */
        /* -------------------------------------------- */

        /**
         * Draw the canvas group and all its components.
         * @returns A Promise which resolves once the group is fully drawn
         */
        draw(options?: object): Promise<this>;

        /**
         * Draw the canvas group and all its component layers.
         */
        protected _draw(options?: object): Promise<void>;

        /* -------------------------------------------- */
        /*  Tear-Down                                   */
        /* -------------------------------------------- */

        /**
         * Remove and destroy all layers from the base canvas.
         */
        tearDown(options?: object): Promise<this>;

        /**
         * Remove and destroy all layers from the base canvas.
         */
        protected _tearDown(options: object): Promise<void>;
    }
    return CanvasGroup;
}
