import type * as fields from "../../../../common/data/fields.d.ts";

export interface PrimaryCanvasObjectData {
    /** The x-coordinate of the PCO location */
    x: number;
    /** The y-coordinate of the PCO location */
    y: number;
    /** The z-index of the PCO */
    z: number;
    /** The width of the PCO */
    width: number;
    /** The height of the PCO */
    height: number;
    /** The alpha of this PCO */
    alpha: number;
    /** The rotation of this PCO */
    rotation: number;
    /** The PCO is hidden? */
    hidden: boolean;
    /** The elevation of the PCO */
    elevation: number | undefined;
    /** The sort key that resolves ties among the same elevation */
    sort: number;
    /** The data texture values */
    texture: fields.SourcePropFromDataField<foundry.data.TextureData>;
}

/**
 * A mixin which decorates a DisplayObject with additional properties expected for rendering in the PrimaryCanvasGroup.
 * @category - Mixins
 * @param DisplayObject The parent DisplayObject class being mixed
 * @returns A DisplayObject subclass mixed with PrimaryCanvasObject features
 * @mixin
 */
/* eslint-disable @typescript-eslint/no-unused-expressions, no-unused-expressions */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function PrimaryCanvasObjectMixin<TBase extends ConstructorOf<PIXI.DisplayObject>>(DisplayObject: TBase) {
    /**
     * A display object rendered in the PrimaryCanvasGroup.
     * @param args The arguments passed to the base class constructor
     */
    abstract class PrimaryCanvasObject extends CanvasTransformMixin(DisplayObject) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args: any[]) {
            super();
            args;
        }

        /**
         * An optional reference to the object that owns this PCO.
         * This property does not affect the behavior of the PCO itself.
         * @default null
         */
        declare object: object | null;

        /* -------------------------------------------- */
        /*  Properties                                  */
        /* -------------------------------------------- */

        /** The elevation of this object. */
        get elevation(): number {
            return 1;
        }

        set elevation(value: number) {
            value;
        }

        /** A key which resolves ties amongst objects at the same elevation within the same layer. */
        get sort(): number {
            return 1;
        }

        set sort(value: number) {
            value;
        }

        /** A key which resolves ties amongst objects at the same elevation of different layers. */
        get sortLayer(): number {
            return 1;
        }

        set sortLayer(value: number) {
            value;
        }

        /** A key which resolves ties amongst objects at the same elevation within the same layer and same sort. */
        override get zIndex(): number {
            return 1;
        }

        override set zIndex(value: number) {
            value;
        }

        /* -------------------------------------------- */
        /*  PIXI Events                                 */
        /* -------------------------------------------- */

        /**
         * Event fired when this display object is added to a parent.
         * @param parent The new parent container.
         */
        _onAdded(parent: PIXI.Container): void {
            parent;
        }

        /**
         * Event fired when this display object is removed from its parent.
         * @param parent Parent from which the PCO is removed.
         */
        _onRemoved(parent: PIXI.Container): void {
            parent;
        }

        /* -------------------------------------------- */
        /*  Canvas Transform & Quadtree                 */
        /* -------------------------------------------- */

        override updateCanvasTransform(): void {}

        override _onCanvasBoundsUpdate(): void {}

        /* -------------------------------------------- */
        /*  PCO Properties                              */
        /* -------------------------------------------- */

        /** Does this object render to the depth buffer? */
        get shouldRenderDepth(): boolean {
            return true;
        }

        /* -------------------------------------------- */
        /*  Depth Rendering                             */
        /* -------------------------------------------- */

        /** Render the depth of this object. */
        renderDepthData(renderer: PIXI.Renderer): void {
            renderer;
        }
    }

    return PrimaryCanvasObject;
}

/**
 * A mixin which decorates a DisplayObject with additional properties for canvas transforms and bounds.
 * @category - Mixins
 * @param DisplayObject The parent DisplayObject class being mixed
 * @mixin
 */
function CanvasTransformMixin<TBase extends ConstructorOf<PIXI.DisplayObject>>(DisplayObject: TBase) {
    abstract class CanvasTransformObject extends DisplayObject {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args: any[]) {
            super();
            args;
        }

        /* -------------------------------------------- */
        /*  Properties                                  */
        /* -------------------------------------------- */

        /** The transform matrix from local space to canvas space. */
        declare canvasTransform: PIXI.Matrix;

        /**
         * The update ID of canvas transform matrix.
         * @internal
         */
        declare _canvasTransformID: number;

        /** The canvas bounds of this object. */
        declare canvasBounds: PIXI.Rectangle;

        /** The canvas bounds of this object. */
        protected declare _canvasBounds: PIXI.Bounds;

        /**
         * The update ID of the canvas bounds.
         * Increment to force recalculation.
         */
        protected declare _canvasBoundsID: number;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        /** Calculate the canvas bounds of this object. */
        protected _calculateCanvasBounds(): void {}

        /** Recalculate the canvas transform and bounds of this object and its children, if necessary. */
        updateCanvasTransform(): void {}

        /** Called when the canvas transform changed. */
        protected _onCanvasTransformUpdate(): void {}

        /** Called when the canvas bounds changed. */
        protected _onCanvasBoundsUpdate(): void {}

        /**
         * Is the given point in canvas space contained in this object?
         * @param point The point in canvas space.
         */
        containsCanvasPoint(point: PIXI.IPointData): boolean {
            point;
            return false;
        }
    }

    return CanvasTransformObject;
}
