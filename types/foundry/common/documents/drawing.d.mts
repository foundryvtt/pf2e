import { DrawingFillType, ImageFilePath } from "@common/constants.mjs";
import * as abstract from "../abstract/_module.mjs";
import * as data from "../data/data.mjs";
import * as fields from "../data/fields.mjs";
import { BaseScene, BaseUser } from "./_module.mjs";

/**
 * The Drawing Document.
 * Defines the DataSchema and common behaviors for a Drawing which are shared between both client and server.
 */
export default class BaseDrawing<TParent extends BaseScene | null = BaseScene | null> extends abstract.Document<
    TParent,
    DrawingSchema
> {
    /* ---------------------------------------- */
    /*  Model Configuration                     */
    /* ---------------------------------------- */

    static override get metadata(): Readonly<DrawingMetadata>;

    static override LOCALIZATION_PREFIXES: string[];

    static override defineSchema(): DrawingSchema;

    static override validateJoint(data: DrawingSource): void;

    static override canUserCreate(user: BaseUser): boolean;

    /* ---------------------------------------- */
    /*  Model Methods                           */
    /* ---------------------------------------- */

    override getUserLevel(user: BaseUser): CONST.DocumentOwnershipNumber;
}

export default interface BaseDrawing<TParent extends BaseScene | null = BaseScene | null>
    extends abstract.Document<TParent, DrawingSchema>, fields.ModelPropsFromSchema<DrawingSchema> {
    get documentName(): DrawingMetadata["name"];
}

interface DrawingMetadata extends abstract.DocumentClassMetadata {
    name: "Drawing";
    collection: "drawings";
    label: "DOCUMENT.Drawing";
    labelPlural: "DOCUMENT.Drawings";
    isEmbedded: true;
}

type DrawingSchema = {
    /** The _id which uniquely identifies this Drawing document */
    _id: fields.DocumentIdField;
    /** The name of this Drawing */
    name: fields.StringField;
    /** The user who created this drawing */
    author: fields.ForeignDocumentField<BaseUser, true, false, true>;
    /** The geometric shape of the drawing */
    shape: fields.EmbeddedDataField<data.ShapeData<BaseDrawing<BaseScene | null>>>;
    /** The x-coordinate position of the top-left corner of the drawn shape */
    x: fields.NumberField<number, number, true, false, true>;
    /** The y-coordinate position of the top-left corner of the drawn shape */
    y: fields.NumberField<number, number, true, false, true>;
    /** The elevation of the drawn shape */
    elevation: fields.NumberField<number, number, true, false, true>;
    /** Any array of Levels that this Drawing is on */
    levels: fields.SceneLevelsSetField;
    /** The numeric sort value which orders this Actor relative to its siblings */
    sort: fields.NumberField<number, number, true, false, true>;
    /** The angle of rotation for the drawing figure */
    rotation: fields.AngleField;
    /** An amoutn of  bezier smoothing applied, between 0 and 1 */
    bezierFactor: fields.AlphaField;
    /** The fill type of the drawing shapw, a value from CONST.DRAWING_FILL_TYPES */
    fillType: fields.NumberField<DrawingFillType, DrawingFillType, true, true, true>;
    /** An optional color string which to fill the drawing geometry */
    fillColor: fields.ColorField;
    /** The opacity of hte fill applied to the drawing geometery */
    fillAlpha: fields.AlphaField;
    /** The width in pixels of the boundary lines of the drawing geometery */
    strokeWidth: fields.NumberField;
    /** The color of the boundary lines of the drawing geometery */
    strokeColor: fields.ColorField;
    /** The opacity of the boundary lines of the drawing geometery */
    strokeAlpha: fields.AlphaField;
    /** The path to a tiling image texture used to file the drawing geometery */
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
    /** IS the drawing rendered in the interface group? */
    interface: fields.BooleanField;
    /** An object containing document metadata */
    flags: fields.DocumentFlagsField;
};

export type DrawingSource = fields.SourceFromSchema<DrawingSchema>;
