import { Document, DocumentMetadata } from "../abstract/_module.mjs";
import { FOLDER_DOCUMENT_TYPES, FolderDocumentType } from "../constants.mjs";
import * as fields from "../data/fields.mjs";

/**
 * The Folder Document model.
 *
 * @param data Initial data from which to construct the document.
 * @property data The constructed data object for the document.
 */
export default class BaseFolder extends Document<null, FolderSchema> {
    /* ---------------------------------------- */
    /*  Model Configuration                     */
    /* ---------------------------------------- */
    static override get metadata(): FolderMetadata;

    static override defineSchema(): FolderSchema;

    static override LOCALIZATION_PREFIXES: string[];

    static override validateJoint(data: FolderSource): void;

    /** Allow folder sorting modes */
    static SORTING_MODES: ["a", "m"];

    static override get(documentId: string, options?: object): BaseFolder | null | undefined;
}

export default interface BaseFolder extends Document<null, FolderSchema>, fields.ModelPropsFromSchema<FolderSchema> {
    get documentName(): FolderMetadata["name"];
}

interface FolderMetadata extends DocumentMetadata {
    name: "Folder";
    collection: "folders";
    label: "DOCUMENT.Folder";
    labelPlural: "DOCUMENT.Folders";
    coreTypes: typeof FOLDER_DOCUMENT_TYPES;
}

type FolderSortingMode = (typeof BaseFolder.SORTING_MODES)[number];

type FolderSchema = {
    /** The _id which uniquely identifies this Folder document */
    _id: fields.DocumentIdField;
    /** The name of this Folder */
    name: fields.StringField<string, string, true, false, false>;
    /** The document type which this Folder contains, from CONST.FOLDER_DOCUMENT_TYPES */
    type: fields.StringField<FolderDocumentType, FolderDocumentType, true, false, false>;
    /** An HTML description of the contents of this folder */
    description: fields.StringField<string, string, false, false, true>;
    folder: fields.ForeignDocumentField<BaseFolder>;
    /** The sorting mode used to organize documents within this Folder, in ["a", "m"] */
    sorting: fields.StringField<FolderSortingMode, FolderSortingMode, true, false, true>;
    /** The numeric sort value which orders this Folder relative to its siblings */
    sort: fields.IntegerSortField;
    /** A color string used for the background color of this Folder */
    color: fields.ColorField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object of creation and access information. */
    _stats: fields.DocumentStatsField;
};

export type FolderSource = fields.SourceFromSchema<FolderSchema>;
