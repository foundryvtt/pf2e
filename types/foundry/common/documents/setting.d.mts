import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import BaseUser from "./user.mjs";

/**
 * The Setting Document.
 * Defines the DataSchema and common behaviors for a Setting which are shared between both client and server.
 */
export default class BaseSetting extends Document<null, SettingSchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<SettingMetadata>;

    static override defineSchema(): SettingSchema;

    static override canUserCreate(user: BaseUser): boolean;
}

export default interface BaseSetting extends Document<null, SettingSchema>, fields.ModelPropsFromSchema<SettingSchema> {
    get documentName(): SettingMetadata["name"];
}

interface SettingMetadata extends DocumentClassMetadata {
    name: "Setting";
    collection: "settings";
    label: "DOCUMENT.Setting";
    labelPlural: "DOCUMENT.Settings";
}

type SettingSchema = {
    /** The _id which uniquely identifies this Setting document */
    _id: fields.DocumentIdField;
    /** The setting key, a composite of {scope}.{name} */
    key: fields.StringField<string, string, true>;
    /** The setting value, which is serialized to JSON */
    value: fields.JSONField<NonNullable<JSONValue>, true, true, false>;
    /** The ID of the user this Setting belongs to, if user-scoped. */
    user: fields.ForeignDocumentField<string>;
    /** An object of creation and access information */
    _stats: fields.DocumentStatsField;
};

export type SettingSource = fields.SourceFromSchema<SettingSchema>;
