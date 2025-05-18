import { DocumentOwnershipLevel, DocumentOwnershipString, DrawingFillType, ImageFilePath } from "@common/constants.mjs";
import * as abstract from "../abstract/_module.mjs";
import * as data from "../data/data.mjs";
import * as fields from "../data/fields.mjs";
import { BaseScene, BaseUser } from "./_module.mjs";

/**
 * The Document definition for a Drawing.
 * Defines the DataSchema and common behaviors for a Drawing which are shared between both client and server.
 * @memberof documents
 *
 * @param data    Initial data from which to construct the Drawing
 * @param context Construction context options
 */
export default class BaseDrawing<TParent extends BaseScene | null> extends abstract.Document<TParent, DrawingSchema> {
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
        user: BaseUser,
        permission: DocumentOwnershipString | DocumentOwnershipLevel,
        { exact }?: { exact?: boolean },
    ): boolean;
}

export default interface BaseDrawing<TParent extends BaseScene | null>
    extends abstract.Document<TParent, DrawingSchema>,
        fields.ModelPropsFromSchema<DrawingSchema> {
    get documentName(): DrawingMetadata["name"];
}

interface DrawingMetadata extends abstract.DocumentMetadata {
    name: "Drawing";
    collection: "drawings";
    label: "DOCUMENT.Drawing";
    labelPlural: "DOCUMENT.Drawings";
    isEmbedded: true;
    permissions: {
        view: abstract.MetadataPermission;
        create: "DRAWING_CREATE";
        update: abstract.MetadataPermission;
        delete: abstract.MetadataPermission;
    };
}

type DrawingSchema = {
    /** The _id which uniquely identifies this BaseDrawing embedded document */
    _id: fields.DocumentIdField;
    /** The _id of the user who created the drawing */
    author: fields.ForeignDocumentField<BaseUser, true, false, true>;
    /** The geometric shape of the drawing */
    shape: fields.EmbeddedDataField<data.ShapeData<BaseDrawing<BaseScene | null>>>;
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
    flags: fields.DocumentFlagsField;
};

export type DrawingSource = fields.SourceFromSchema<DrawingSchema>;
