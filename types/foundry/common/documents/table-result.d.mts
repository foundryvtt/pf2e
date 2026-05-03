import { ImageFilePath, TableResultType } from "@common/constants.mjs";
import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import * as documents from "./_module.mjs";

/**
 * The TableResult Document.
 * Defines the DataSchema and common behaviors for a TableResult which are shared between both client and server.
 */
export default class BaseTableResult<
    TParent extends documents.BaseRollTable | null = documents.BaseRollTable | null,
> extends Document<TParent, TableResultSchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<TableResultMetadata>;

    static override LOCALIZATION_PREFIXES: string[];

    static override defineSchema(): TableResultSchema;
}

export default interface BaseTableResult<
    TParent extends documents.BaseRollTable | null = documents.BaseRollTable | null,
> extends Document<TParent, TableResultSchema> {
    get documentName(): TableResultMetadata["name"];
}

interface TableResultMetadata extends DocumentClassMetadata {
    name: "TableResult";
    collection: "results";
    label: "DOCUMENT.TableResult";
    labelPlural: "DOCUMENT.TableResults";
    coreTypes: TableResultType[];
    compendiumIndexFields: ["type"];
}

type TableResultSchema = {
    /** The _id which uniquely identifies this TableResult document */
    _id: fields.DocumentIdField;
    /** A result subtype from CONST.TABLE_RESULT_TYPES */
    type: fields.DocumentTypeField<TableResultType>;
    /** The name of this TableResult */
    name: fields.StringField<string, string, true, false, true>;
    /** An image file path that represent this TableResult */
    img: fields.FilePathField<ImageFilePath>;
    /** The descrioption of this TableResult */
    description: fields.HTMLField;
    /** The UUID that this TableResult is linked to, used for "document" types */
    documentUuid: fields.DocumentUUIDField<foundry.utils.DocumentUUID, false, true, false>;
    /** The probabilistic weight of this result relative to other results */
    weight: fields.NumberField<number, number, true, false, true>;
    /** A length 2 array of ascending integers which defines the range of dice roll totals which produce this drawn result */
    range: fields.ArrayField<fields.NumberField, [number, number], [number, number]>;
    /** Has this result already been drawn (without replacement) */
    drawn: fields.BooleanField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object containing document metadata */
    _stats: fields.DocumentStatsField;
};

export type TableResultSource = fields.SourceFromSchema<TableResultSchema>;
