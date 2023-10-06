import type { Document, DocumentMetadata } from "../abstract/module.d.ts";
import type * as documents from "./module.d.ts";
import type * as fields from "../data/fields.d.ts";

/** The FogExploration Document model. */
export default class BaseFogExploration extends Document<null, FogExplorationSchema> {
    static override get metadata(): FogExplorationMetadata;

    static override defineSchema(): FogExplorationSchema;

    protected override _preUpdate(
        changed: DocumentUpdateData<this>,
        options: DocumentModificationContext<null>,
        user: documents.BaseUser
    ): Promise<boolean | void>;
}

export default interface BaseFogExploration
    extends Document<null, FogExplorationSchema>,
        ModelPropsFromSchema<FogExplorationSchema> {
    readonly _source: FogExplorationSource;

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

type FogExplorationSource = SourceFromSchema<FogExplorationSchema>;
