import { ImageFilePath } from "@common/constants.mjs";
import { Document, DocumentClassMetadata, EmbeddedCollection } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import { BaseFolder, BaseTableResult } from "./_module.mjs";

/**
 * The RollTable Document.
 * Defines the DataSchema and common behaviors for a RollTable which are shared between both client and server.
 * @category Documents
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
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, false>;
    img: fields.FilePathField<ImageFilePath>;
    description: fields.HTMLField;
    results: fields.EmbeddedCollectionField<BaseTableResult<BaseRollTable>>;
    formula: fields.StringField<string>;
    replacement: fields.BooleanField;
    displayRoll: fields.BooleanField;
    folder: fields.ForeignDocumentField<BaseFolder>;
    sort: fields.IntegerSortField;
    ownership: fields.DocumentOwnershipField;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

export type RollTableSource = fields.SourceFromSchema<RollTableSchema>;
