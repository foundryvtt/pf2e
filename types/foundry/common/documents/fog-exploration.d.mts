import { ImageFilePath } from "@common/constants.mjs";
import { DatabaseUpdateCallbackOptions, Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import { BaseScene, BaseUser } from "./_module.mjs";

/**
 * The FogExploration Document.
 * Defines the DataSchema and common behaviors for a FogExploration which are shared between both client and server.
 */
export default class BaseFogExploration extends Document<null, FogExplorationSchema> {
    /* ---------------------------------------- */
    /*  Model Configuration                     */
    /* ---------------------------------------- */

    static override get metadata(): Readonly<FogExplorationMetadata>;

    static override defineSchema(): FogExplorationSchema;

    /* ---------------------------------------- */
    /*  Database Event Handlers                 */
    /* ---------------------------------------- */

    protected override _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;
}

export default interface BaseFogExploration
    extends Document<null, FogExplorationSchema>, fields.ModelPropsFromSchema<FogExplorationSchema> {
    get documentName(): FogExplorationMetadata["name"];
}

interface FogExplorationMetadata extends DocumentClassMetadata {
    name: "FogExploration";
    collection: "fog";
    label: "DOCUMENT.FogExploration";
    labelPlural: "DOCUMENT.FogExplorations";
    isPrimary: true;
}

type FogExplorationSchema = {
    _id: fields.DocumentIdField;
    user: fields.ForeignDocumentField<BaseUser>;
    scene: fields.ForeignDocumentField<BaseScene>;
    level: fields.DocumentIdField<string, true, true, true>;
    explored: fields.FilePathField<ImageFilePath, ImageFilePath, true>;
    positions: fields.ObjectField<object>;
    timestamp: fields.NumberField<number, number, false, true, true>;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

export type FogExplorationSource = fields.SourceFromSchema<FogExplorationSchema>;
