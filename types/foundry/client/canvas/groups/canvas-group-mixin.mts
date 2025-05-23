import CanvasLayer from "../layers/base/canvas-layer.mjs";

/**
 * A mixin which decorates any container with base canvas common properties.
 * @param {typeof PIXI.Container} ContainerClass  The parent Container class being mixed.
 * @returns A ContainerClass subclass mixed with CanvasGroupMixin features.
 */
export default function CanvasGroupMixin<TBase extends ConstructorOf<PIXI.Container>>(ContainerClass: TBase) {
    class CanvasGroup extends ContainerClass {
        constructor(...args: any[]) {
            super(...args);
        }

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
        override get name(): string {
            return "";
        }

        /**
         * The name used by hooks to construct their hook string.
         * Note: You should override this getter if hookName should not return the class constructor name.
         */
        get hookName(): string {
            return "";
        }

        /**
         * A mapping of CanvasLayer classes which belong to this group.
         */
        declare layers: Record<string, CanvasLayer>;

        /* -------------------------------------------- */

        /**
         * Create CanvasLayer instances which belong to the canvas group.
         */
        protected _createLayers(): Record<string, CanvasLayer> {
            return {};
        }

        /* -------------------------------------------- */
        /*  Rendering                                   */
        /* -------------------------------------------- */

        /**
         * Draw the canvas group and all its components.
         * @returns A Promise which resolves once the group is fully drawn
         */
        async draw(options?: object): Promise<this> {
            options;
            return this;
        }

        /**
         * Draw the canvas group and all its component layers.
         */
        protected async _draw(options?: object): Promise<void> {
            options;
        }

        /* -------------------------------------------- */
        /*  Tear-Down                                   */
        /* -------------------------------------------- */

        /**
         * Remove and destroy all layers from the base canvas.
         */
        async tearDown(options?: object): Promise<this> {
            options;
            return this;
        }

        /**
         * Remove and destroy all layers from the base canvas.
         */
        protected async _tearDown(options: object): Promise<void> {
            options;
        }
    }
    return CanvasGroup;
}
