import type { DataModel, Document, DocumentMetadata } from "../abstract/module.d.ts";
import type { BaseUser } from "./module.d.ts";
import type * as fields from "../data/fields.d.ts";

/** The Macro document model. */
export default class BaseMacro extends Document<null> {
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
        data: PreDocumentId<MacroSource>,
        options: DocumentModificationContext<null>,
        user: BaseUser
    ): Promise<void>;

    /* -------------------------------------------- */
    /*  Deprecations and Compatibility              */
    /* -------------------------------------------- */

    /** @inheritdoc */
    static shimData(data: object, options: object): object;
}

export default interface BaseMacro extends Document<null>, ModelPropsFromSchema<MacroSchema> {
    readonly _source: MacroSource;

    get documentName(): (typeof BaseMacro)["metadata"]["name"];
}

interface MacroMetadata extends DocumentMetadata {
    name: "Macro";
    collection: "macros";
    label: "DOCUMENT.Macro";
    isPrimary: true;
    types: ["script", "chat"];
}

type MacroSchema = {
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, false>;
    type: fields.StringField<MacroType, MacroType, true, false, true>;
    author: fields.ForeignDocumentField<BaseUser>;
    img: fields.FilePathField<ImageFilePath>;
    scope: fields.StringField<MacroScope, MacroScope, true, false, true>;
    command: fields.StringField<string, string, true, false, true>;
    folder: fields.ForeignDocumentField;
    sort: fields.IntegerSortField;
    ownership: fields.DocumentOwnershipField;
    flags: fields.ObjectField<DocumentFlags>;
    _stats: fields.DocumentStatsField;
};

type MacroSource = SourceFromSchema<MacroSchema>;
