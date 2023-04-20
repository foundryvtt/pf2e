import type { Document, DocumentMetadata } from "../abstract/module.d.ts";
import type { BaseScene, BaseUser } from "./module.d.ts";

/** The Drawing embedded document model. */
export default class BaseDrawing<TParent extends BaseScene | null> extends Document<TParent> {
    static override get metadata(): DrawingMetadata;

    /** Is a user able to update or delete an existing Drawing document? */
    protected static _canModify(user: BaseUser, doc: BaseDrawing<BaseScene | null>, data: DrawingSource): boolean;
}

export default interface BaseDrawing<TParent extends BaseScene | null> extends Document<TParent> {
    readonly _source: DrawingSource;
}

/**
 * The data schema for a Drawing embedded document.
 * @see BaseDrawing
 *
 * @param data       Initial data used to construct the data object
 * @param [document] The embedded document to which this data object belongs
 *
 * @property t                    The value in CONST.DRAWING_TYPES which defines the geometry type of this drawing
 * @property x                    The x-coordinate position of the top-left corner of the drawn shape
 * @property y                    The y-coordinate position of the top-left corner of the drawn shape
 * @property width                The pixel width of the drawing figure
 * @property height               The pixel height of the drawing figure
 * @property [rotation=0]         The angle of rotation for the drawing figure
 * @property [z=0]                The z-index of this drawing relative to other siblings
 * @property [points]             An array of points [x,y] which define polygon vertices
 * @property [bezierFactor=0]     An amount of bezier smoothing applied, between 0 and 1
 * @property [fillType=0]         The fill type of the drawing shape, a value from CONST.DRAWING_FILL_TYPES
 * @property [fillColor]          An optional color string with which to fill the drawing geometry
 * @property [fillAlpha=0.5]      The opacity of the fill applied to the drawing geometry
 * @property [strokeWidth=8]      The width in pixels of the boundary lines of the drawing geometry
 * @property [strokeColor]        The color of the boundary lines of the drawing geometry
 * @property [strokeAlpha=1]      The opacity of the boundary lines of the drawing geometry
 * @property [texture]            The path to a tiling image texture used to fill the drawing geometry
 * @property [text]               Optional text which is displayed overtop of the drawing
 * @property [fontFamily=Signika] The font family used to display text within this drawing
 * @property [fontSize=48]        The font size used to display text within this drawing
 * @property [textColor=#FFFFFF]  The color of text displayed within this drawing
 * @property [textAlpha=1]        The opacity of text displayed within this drawing
 * @property [hidden=false]       Is the drawing currently hidden?
 * @property [locked=false]       Is the drawing currently locked?
 */
export interface DrawingSource {
    t: DrawingShapeType;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    z?: number;
    points?: [number, number][];
    bezierFactor?: number;
    fillType?: number;
    fillColor?: string;
    fillAlpha?: number;
    strokeWidth?: number;
    strokeColor?: number;
    strokeAlpha?: number;
    texture?: string;
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    textColor?: string;
    textAlpha?: number;
    hidden?: boolean;
    locked?: boolean;
}

interface DrawingMetadata extends DocumentMetadata {
    name: "Drawing";
    collection: "drawings";
    label: "DOCUMENT.Drawing";
    isEmbedded: true;
    permissions: {
        create: "TEMPLATE_CREATE";
        update: (typeof BaseDrawing)["_canModify"];
        delete: (typeof BaseDrawing)["_canModify"];
    };
}
