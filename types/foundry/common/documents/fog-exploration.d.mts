import { DatabaseUpdateOperation } from "@common/abstract/_types.mjs";
import { ImageFilePath } from "@common/constants.mjs";
import type { Document, DocumentMetadata } from "../abstract/_module.d.mts";
import type * as fields from "../data/fields.mjs";
import type * as documents from "./_module.mjs";

/**
 * The Document definition for FogExploration.
 * Defines the DataSchema and common behaviors for FogExploration which are shared between both client and server.
 * @memberof documents
 *
 * @param data    Initial data from which to construct the FogExploration
 * @param context Construction context options
 */
export default class BaseFogExploration extends Document<null, FogExplorationSchema> {
    static override get metadata(): FogExplorationMetadata;

    static override defineSchema(): FogExplorationSchema;

    protected override _preUpdate(
        changed: Record<string, unknown>,
        options: DatabaseUpdateOperation<null>,
        user: documents.BaseUser,
    ): Promise<boolean | void>;
}

export default interface BaseFogExploration
    extends Document<null, FogExplorationSchema>,
        fields.ModelPropsFromSchema<FogExplorationSchema> {
    get documentName(): FogExplorationMetadata["name"];
}

interface FogExplorationMetadata extends DocumentMetadata {
    name: "FogExploration";
    collection: "fog";
    label: "DOCUMENT.FogExploration";
    labelPlural: "DOCUMENT.FogExplorations";
    isPrimary: true;
}

type FogExplorationSchema = {
    /** The _id which uniquely identifies this FogExploration document */
    _id: fields.DocumentIdField;
    /** The _id of the Scene document to which this fog applies */
    scene: fields.ForeignDocumentField<documents.BaseScene>;
    /** The _id of the User document to which this fog applies */
    user: fields.ForeignDocumentField<documents.BaseUser>;
    /** The base64 png image of the explored fog polygon */
    explored: fields.FilePathField<ImageFilePath, ImageFilePath, true>;
    /** The object of scene positions which have been explored at a certain vision radius */
    positions: fields.ObjectField<object>;
    /** The timestamp at which this fog exploration was last updated */
    timestamp: fields.NumberField<number, number, false, true, true>;
    flags: fields.ObjectField<DocumentFlags>;
};

export type FogExplorationSource = fields.SourceFromSchema<FogExplorationSchema>;
