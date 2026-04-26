import { ImageFilePath, MacroScope, MacroType } from "@common/constants.mjs";
import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import { DatabaseCreateCallbackOptions } from "../abstract/_types.mjs";
import * as fields from "../data/fields.mjs";
import BaseUser from "./user.mjs";

/**
 * The Macro Document.
 * Defines the DataSchema and common behaviors for a Macro which are shared between both client and server.
 */
export default class BaseMacro extends Document<null, MacroSchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<MacroMetadata>;

    static override defineSchema(): MacroSchema;

    static override LOCALIZATION_PREFIXES: string[];

    /** The default icon used for newly created Macro documents. */
    static DEFAULT_ICON: ImageFilePath;

    /* -------------------------------------------- */
    /*  Model Methods                               */
    /* -------------------------------------------- */

    static override validateJoint(data: fields.SourceFromSchema<foundry.abstract.DataSchema>): void;

    static override canUserCreate(user: BaseUser): boolean;

    override getUserLevel(user: BaseUser): CONST.DocumentOwnershipNumber;

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

interface MacroMetadata extends DocumentClassMetadata {
    name: "Macro";
    collection: "macros";
    indexed: true;
    compendiumIndexFields: ["_id", "name", "img", "sort", "folder"];
    label: "DOCUMENT.Macro";
    labelPlural: "DOCUMENT.Macros";
    coreTypes: MacroType[];
}

type MacroSchema = {
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, false>;
    type: fields.DocumentTypeField<MacroType, MacroType, true, false, true, BaseMacro>;
    author: fields.ForeignDocumentField<BaseUser>;
    img: fields.FilePathField<ImageFilePath>;
    scope: fields.StringField<MacroScope, MacroScope, true, false, true>;
    command: fields.StringField<string, string, true, false, true>;
    folder: fields.ForeignDocumentField;
    sort: fields.IntegerSortField;
    ownership: fields.DocumentOwnershipField;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

export type MacroSource = fields.SourceFromSchema<MacroSchema>;
