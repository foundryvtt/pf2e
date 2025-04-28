import { DocumentOwnershipLevel, DocumentOwnershipString, ImageFilePath, TableResultType } from "@common/constants.mjs";
import type { Document, DocumentMetadata } from "../abstract/_module.d.mts";
import type * as fields from "../data/fields.mjs";
import type * as documents from "./_module.mjs";

/** The TableResult document model. */
export default class BaseTableResult<TParent extends documents.BaseRollTable | null> extends Document<
    TParent,
    TableResultSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): TableResultMetadata;

    static override defineSchema(): TableResultSchema;

    override testUserPermission(
        user: documents.BaseUser,
        permission: DocumentOwnershipString | DocumentOwnershipLevel,
        { exact }?: { exact?: boolean },
    ): boolean;
}

export default interface BaseTableResult<TParent extends documents.BaseRollTable | null>
    extends Document<TParent, TableResultSchema> {
    get documentName(): TableResultMetadata["name"];
}

interface TableResultMetadata extends DocumentMetadata {
    name: "TableResult";
    collection: "results";
    label: "DOCUMENT.TableResult";
    labelPlural: "DOCUMENT.TableResults";
    coreTypes: TableResultType[];
}

type TableResultSchema = {
    /** The _id which uniquely identifies this TableResult embedded document */
    _id: fields.DocumentIdField;
    /** A result subtype from CONST.TABLE_RESULT_TYPES */
    type: fields.DocumentTypeField<TableResultType>;
    /** The text which describes the table result */
    text: fields.HTMLField;
    /** An image file url that represents the table result */
    img: fields.FilePathField<ImageFilePath>;
    /** A named collection from which this result is drawn */
    uuid: fields.DocumentUUIDField;
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

export type TableResultSource = fields.SourceFromSchema<TableResultSchema>;
