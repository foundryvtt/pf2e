import { ImageFilePath, TableResultType } from "@common/constants.mjs";
import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import * as documents from "./_module.mjs";

/**
 * The TableResult Document.
 * Defines the DataSchema and common behaviors for a TableResult which are shared between both client and server.
 * @category Documents
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
    _id: fields.DocumentIdField;
    type: fields.DocumentTypeField<TableResultType>;
    name: fields.StringField<string, string, true, false, true>;
    img: fields.FilePathField<ImageFilePath>;
    description: fields.HTMLField;
    documentUuid: fields.DocumentUUIDField<foundry.utils.DocumentUUID, false, true, false>;
    weight: fields.NumberField<number, number, true, false, true>;
    range: fields.ArrayField<fields.NumberField, [number, number], [number, number]>;
    drawn: fields.BooleanField;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

export type TableResultSource = fields.SourceFromSchema<TableResultSchema>;
