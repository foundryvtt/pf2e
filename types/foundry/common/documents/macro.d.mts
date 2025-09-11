import { ImageFilePath, MacroScope, MacroType } from "@common/constants.mjs";
import { Document, DocumentMetadata, MetadataPermission } from "../abstract/_module.mjs";
import { DatabaseCreateCallbackOptions } from "../abstract/_types.mjs";
import * as fields from "../data/fields.mjs";
import BaseUser from "./user.mjs";

/**
 * The Document definition for a Macro.
 * Defines the DataSchema and common behaviors for a Macro which are shared between both client and server.
 * @memberof documents
 *
 * @param data    Initial data from which to construct the Macro
 * @param context Construction context options
 */
export default class BaseMacro extends Document<null, MacroSchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): MacroMetadata;

    static override defineSchema(): MacroSchema;

    /** The default icon used for newly created Macro documents. */
    static DEFAULT_ICON: ImageFilePath;

    /* -------------------------------------------- */
    /*  Model Methods                               */
    /* -------------------------------------------- */

    override testUserPermission(user: BaseUser, permission: unknown, options?: { exact?: boolean }): boolean;

    /* -------------------------------------------- */
    /*  Database Event Handlers                     */
    /* -------------------------------------------- */

    protected override _preCreate(
        data: DeepPartial<this["_source"]>,
        options: DatabaseCreateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;
}

export default interface BaseMacro extends Document<null, MacroSchema>, fields.ModelPropsFromSchema<MacroSchema> {
    get documentName(): MacroMetadata["name"];
}

interface MacroMetadata extends DocumentMetadata {
    name: "Macro";
    collection: "macros";
    indexed: true;
    compendiumIndexFields: ["_id", "name", "img", "sort", "folder"];
    label: "DOCUMENT.Macro";
    labelPlural: "DOCUMENT.Macros";
    coreTypes: MacroType[];
    permissions: {
        view: MetadataPermission;
        create: "PLAYER";
        update: MetadataPermission;
        delete: MetadataPermission;
    };
}

type MacroSchema = {
    /** The _id which uniquely identifies this Macro document */
    _id: fields.DocumentIdField;
    /** The name of this Macro */
    name: fields.StringField<string, string, true, false, false>;
    /** A Macro subtype from CONST.MACRO_TYPES */
    type: fields.StringField<MacroType, MacroType, true, false, true>;
    /** The _id of a User document which created this Macro */
    author: fields.ForeignDocumentField<BaseUser>;
    /** An image file path which provides the thumbnail artwork for this Macro */
    img: fields.FilePathField<ImageFilePath>;
    /** The scope of this Macro application from CONST.MACRO_SCOPES */
    scope: fields.StringField<MacroScope, MacroScope, true, false, true>;
    /** The string content of the macro command */
    command: fields.StringField<string, string, true, false, true>;
    /** The _id of a Folder which contains this Macro */
    folder: fields.ForeignDocumentField;
    /** The numeric sort value which orders this Macro relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object which configures ownership of this Macro */
    ownership: fields.DocumentOwnershipField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object of creation and access information */
    _stats: fields.DocumentStatsField;
};

export type MacroSource = fields.SourceFromSchema<MacroSchema>;
