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
    /** The _id which uniquely identifies this FogExploration document */
    _id: fields.DocumentIdField;
    /** The _id of the User document to which this fog applies */
    user: fields.ForeignDocumentField<BaseUser>;
    /** The _id of the Scene document to which this fog applies */
    scene: fields.ForeignDocumentField<BaseScene>;
    /** The level ID */
    level: fields.DocumentIdField<string, true, true, true>;
    /** The base64 image/jpeg of the explored fog polygon */
    explored: fields.FilePathField<ImageFilePath, ImageFilePath, true>;
    /** Optional custom exploration data */
    positions: fields.ObjectField<object>;
    /** The timestamp at which this fog exploration was last updated */
    timestamp: fields.NumberField<number, number, false, true, true>;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object of creation and access information */
    _stats: fields.DocumentStatsField;
};

export type FogExplorationSource = fields.SourceFromSchema<FogExplorationSchema>;
