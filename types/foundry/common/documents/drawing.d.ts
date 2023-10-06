import type { Document, DocumentMetadata } from "../abstract/module.d.ts";
import type * as data from "../data/data.d.ts";
import type * as fields from "../data/fields.d.ts";
import type * as documents from "./module.d.ts";

/** The Drawing embedded document model. */
export default class BaseDrawing<TParent extends documents.BaseScene | null> extends Document<TParent, DrawingSchema> {
    /* ---------------------------------------- */
    /*  Model Configuration                     */
    /* ---------------------------------------- */

    static override get metadata(): DrawingMetadata;

    static override defineSchema(): DrawingSchema;

    static override validateJoint(data: DrawingSource): void;

    /* ---------------------------------------- */
    /*  Model Methods                           */
    /* ---------------------------------------- */

    override testUserPermission(
        user: documents.BaseUser,
        permission: DocumentOwnershipString | DocumentOwnershipLevel,
        { exact }?: { exact?: boolean }
    ): boolean;
}

export default interface BaseDrawing<TParent extends documents.BaseScene | null>
    extends Document<TParent, DrawingSchema>,
        ModelPropsFromSchema<DrawingSchema> {
    readonly _source: DrawingSource;

    get documentName(): DrawingMetadata["name"];
}

interface DrawingMetadata extends DocumentMetadata {
    name: "Drawing";
    collection: "drawings";
    label: "DOCUMENT.Drawing";
    labelPlural: "DOCUMENT.Drawings";
    isEmbedded: true;
}

type DrawingSchema = {
    /** The _id which uniquely identifies this BaseDrawing embedded document */
    _id: fields.DocumentIdField;
    /** The _id of the user who created the drawing */
    author: fields.ForeignDocumentField<documents.BaseUser, true, false, true>;
    /** The geometric shape of the drawing */
    shape: fields.EmbeddedDataField<data.ShapeData<BaseDrawing<documents.BaseScene | null>>>;
    /** The x-coordinate position of the top-left corner of the drawn shape */
    x: fields.NumberField<number, number, true, false, true>;
    /** The y-coordinate position of the top-left corner of the drawn shape */
    y: fields.NumberField<number, number, true, false, true>;
    /** The z-index of this drawing relative to other siblings */
    z: fields.NumberField<number, number, true, false, true>;
    /** The angle of rotation for the drawing figure */
    rotation: fields.AngleField;
    /** An amount of bezier smoothing applied, between 0 and 1 */
    bezierFactor: fields.AlphaField;
    /** The fill type of the drawing shape, a value from CONST.DRAWING_FILL_TYPES */
    fillType: fields.NumberField<DrawingFillType, DrawingFillType, true, true, true>;
    /** An optional color string with which to fill the drawing geometry */
    fillColor: fields.ColorField;
    /** The opacity of the fill applied to the drawing geometry */
    fillAlpha: fields.AlphaField;
    /** The width in pixels of the boundary lines of the drawing geometry */
    strokeWidth: fields.NumberField;
    /** The color of the boundary lines of the drawing geometry */
    strokeColor: fields.ColorField;
    /** The opacity of the boundary lines of the drawing geometry */
    strokeAlpha: fields.AlphaField;
    /** The path to a tiling image texture used to fill the drawing geometry */
    texture: fields.FilePathField<ImageFilePath>;
    /** Optional text which is displayed overtop of the drawing */
    text: fields.StringField;
    /** The font family used to display text within this drawing, defaults to CONFIG.defaultFontFamily */
    fontFamily: fields.StringField;
    /** The font size used to display text within this drawing */
    fontSize: fields.NumberField;
    /** The color of text displayed within this drawing */
    textColor: fields.ColorField;
    /** The opacity of text displayed within this drawing */
    textAlpha: fields.AlphaField;
    /** Is the drawing currently hidden? */
    hidden: fields.BooleanField;
    /** Is the drawing currently locked? */
    locked: fields.BooleanField;
    /** An object of optional key/value flags */
    flags: fields.ObjectField<DocumentFlags>;
};

type DrawingSource = SourceFromSchema<DrawingSchema>;
