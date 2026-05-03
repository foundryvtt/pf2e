import { ImageFilePath } from "@common/constants.mjs";
import { Document, DocumentClassMetadata, EmbeddedCollection } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import { BaseFolder, BaseTableResult } from "./_module.mjs";

/**
 * The RollTable Document.
 * Defines the DataSchema and common behaviors for a RollTable which are shared between both client and server.
 */
export default class BaseRollTable extends Document<null, RollTableSchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<RollTableMetadata>;

    static override LOCALIZATION_PREFIXES: string[];

    /** The default icon used for newly created Macro documents */
    static DEFAULT_ICON: ImageFilePath;

    static override defineSchema(): RollTableSchema;
}

export default interface BaseRollTable
    extends Document<null, RollTableSchema>, fields.ModelPropsFromSchema<RollTableSchema> {
    readonly results: EmbeddedCollection<BaseTableResult<this>>;

    get documentName(): (typeof BaseRollTable)["metadata"]["name"];
}

interface RollTableMetadata extends DocumentClassMetadata {
    name: "RollTable";
    collection: "tables";
    indexed: true;
    compendiumIndexFields: ["_id", "name", "description", "img", "sort", "folder"];
    embedded: { TableResult: "results" };
    label: "DOCUMENT.RollTable";
    labelPlural: "DOCUMENT.RollTables";
}

type RollTableSchema = {
    /** The _id which uniquely identifies this RollTable document */
    _id: fields.DocumentIdField;
    /** The name of this RollTable */
    name: fields.StringField<string, string, true, false, false>;
    /** An image file path which provides the thumbnail artwork for this RollTable */
    img: fields.FilePathField<ImageFilePath>;
    /** The HTML text description for this RollTable document */
    description: fields.HTMLField;
    /** An EmbeddedCollection of TableResult documents */
    results: fields.EmbeddedCollectionField<BaseTableResult<BaseRollTable>>;
    /** The Roll formulate which determines the results chosen from this RollTable */
    formula: fields.StringField<string>;
    /** Are results from this table drawn with replacement? */
    replacement: fields.BooleanField;
    /** Is the Roll result used to draw from this RollTable displayed in chat? */
    displayRoll: fields.BooleanField;
    /** The Folder which contains this RollTable */
    folder: fields.ForeignDocumentField<BaseFolder>;
    /** The numeric sort value which orders this RollTable relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object which configures ownership of this RollTable */
    ownership: fields.DocumentOwnershipField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object containing document metadata */
    _stats: fields.DocumentStatsField;
};

export type RollTableSource = fields.SourceFromSchema<RollTableSchema>;
