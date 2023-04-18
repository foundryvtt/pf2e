import type { Document, DocumentMetadata } from "../abstract/module.d.ts";
import type { BaseUser } from "./module.d.ts";

/** The FogExploration Document model. */
export default class BaseFogExploration extends Document<null> {
    static override get metadata(): FogExplorationMetadata;

    protected override _preUpdate(
        changed: DocumentUpdateData<this>,
        options: DocumentModificationContext<null>,
        user: BaseUser
    ): Promise<void>;

    /** Test whether a User can modify a FogExploration document. */
    protected static _canUserModify<T extends BaseFogExploration>(user: BaseUser, doc: T): boolean;
}

export default interface BaseFogExploration extends Document<null> {
    readonly _source: FogExplorationSource;
}

interface FogExplorationMetadata extends DocumentMetadata {
    name: "DogExploration";
    collection: "fog";
    label: "DOCUMENT.FogExploration";
    isPrimary: true;
    permissions: {
        create: "PLAYER";
        update: (typeof BaseFogExploration)["_canUserModify"];
        delete: (typeof BaseFogExploration)["_canUserModify"];
    };
}

/**
 * The data schema for a FogExploration document.
 * @property _id       The _id which uniquely identifies this FogExploration document
 * @property scene     The _id of the Scene document to which this fog applies
 * @property user      The _id of the User document to which this fog applies
 * @property explored  The base64 png image of the explored fog polygon
 * @property positions The object of scene positions which have been explored at a certain vision radius
 * @property timestamp The timestamp at which this fog exploration was last updated
 */
interface FogExplorationSource {
    _id: string;
    scene: string;
    user: string;
    explored: string;
    position: unknown;
    timestamp: number;
}
