import type { Document, DocumentMetadata } from "../abstract/module.d.ts";
import type { BaseRollTable, BaseUser } from "./module.d.ts";
import type * as fields from "../data/fields.d.ts";

/** The TableResult document model. */
export default class BaseTableResult<TParent extends BaseRollTable | null> extends Document<
    TParent,
    TableResultSchema
> {
    static override get metadata(): TableResultMetadata;

    static override defineSchema(): TableResultSchema;

    override testUserPermission(
        user: BaseUser,
        permission: DocumentOwnershipString | DocumentOwnershipLevel,
        { exact }?: { exact?: boolean }
    ): boolean;
}

export default interface BaseTableResult<TParent extends BaseRollTable | null>
    extends Document<TParent, TableResultSchema> {
    readonly _source: TableResultSource;
}

interface TableResultMetadata extends DocumentMetadata {
    name: "TableResult";
    collection: "results";
    label: "DOCUMENT.TableResult";
    types: typeof CONST.TABLE_RESULT_TYPES;
}

type TableResultSchema = {
    /** The _id which uniquely identifies this TableResult embedded document */
    _id: fields.DocumentIdField;
    /** A result subtype from CONST.TABLE_RESULT_TYPES */
    type: fields.NumberField<TableResultType, TableResultType, true, true, true>;
    /** The text which describes the table result */
    text: fields.HTMLField;
    /** An image file url that represents the table result */
    img: fields.FilePathField<ImageFilePath>;
    /** A named collection from which this result is drawn */
    documentCollection: fields.StringField<string>;
    /** The _id of a Document within the collection this result references */
    documentId: fields.ForeignDocumentField<string>;
    /** The probabilistic weight of this result relative to other results */
    weight: fields.NumberField<number, number, true, false, true>;
    /**
     * A length 2 array of ascending integers which defines the range of dice roll totals which produce this drawn
     * result
     */
    range: fields.ArrayField<fields.NumberField, [number, number], [number, number]>;
    /** Has this result already been drawn (without replacement) */
    drawn: fields.BooleanField;
    /** An object of optional key/value flags */
    flags: fields.ObjectField<DocumentFlags>;
};

type TableResultSource = SourceFromSchema<TableResultSchema>;
