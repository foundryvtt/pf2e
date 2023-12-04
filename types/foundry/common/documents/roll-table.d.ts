import type { Document, DocumentMetadata, EmbeddedCollection } from "../abstract/module.d.ts";
import type * as fields from "../data/fields.d.ts";
import type * as documents from "./module.d.ts";

/**
 * The Document definition for a RollTable.
 * Defines the DataSchema and common behaviors for a RollTable which are shared between both client and server.
 */
export default class BaseRollTable extends Document<null, RollTableSchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): RollTableMetadata;

    static override defineSchema(): RollTableSchema;

    /** The default icon used for newly created Macro documents */
    static DEFAULT_ICON: ImageFilePath;
}

export default interface BaseRollTable extends Document<null, RollTableSchema>, ModelPropsFromSchema<RollTableSchema> {
    /** A reference to the Collection of TableResult instances in this document, indexed by _id. */
    readonly results: EmbeddedCollection<documents.BaseTableResult<this>>;

    get documentName(): (typeof BaseRollTable)["metadata"]["name"];
}

interface RollTableMetadata extends DocumentMetadata {
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
    /** A Collection of TableResult embedded documents which belong to this RollTable */
    // biome-ignore lint/suspicious/noExplicitAny:
    results: fields.EmbeddedCollectionField<documents.BaseTableResult<BaseRollTable>>;
    /** The Roll formula which determines the results chosen from the table */
    formula: fields.StringField<string>;
    /** Are results from this table drawn with replacement? */
    replacement: fields.BooleanField;
    /** Is the Roll result used to draw from this RollTable displayed in chat? */
    displayRoll: fields.BooleanField;
    /** The _id of a Folder which contains this RollTable */
    folder: fields.ForeignDocumentField<documents.BaseFolder>;
    /** The numeric sort value which orders this RollTable relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object which configures ownership of this RollTable */
    ownership: fields.DocumentOwnershipField;
    /** An object of optional key/value flags */
    flags: fields.ObjectField<DocumentFlags>;
    /** An object of creation and access information */
    _stats: fields.DocumentStatsField;
};

type RollTableSource = SourceFromSchema<RollTableSchema>;
