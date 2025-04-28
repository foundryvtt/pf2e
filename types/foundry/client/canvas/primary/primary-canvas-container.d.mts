import { CanvasTransformMixin } from "./primary-canvas-object.mjs";

/**
 * Primary canvas container are reserved for advanced usage.
 * They allow to group PrimarySpriteMesh in a single Container.
 * The container elevation is replacing individual sprite elevation.
 */
export default class PrimaryCanvasContainer extends CanvasTransformMixin(PIXI.Container) {
    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * A key which resolves ties amongst objects at the same elevation within the same layer.
     */
    get sort(): number;

    set sort(value);

    /**
     * The elevation of this container.
     */
    get elevation(): number;

    set elevation(value);
    /**
     * To know if this container has at least one children that should render its depth.
     */
    get shouldRenderDepth(): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    sortChildren(): void;

    override updateCanvasTransform(): void;

    renderDepthData(renderer: PIXI.Renderer): void;
}
