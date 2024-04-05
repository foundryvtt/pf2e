import type * as abstract from "../abstract/module.d.ts";
import type { TombstoneDataSchema } from "../data/data.d.ts";
import type * as fields from "../data/fields.d.ts";
import type { ItemSchema } from "./item.d.ts";
import type * as documents from "./module.d.ts";

/**
 * The Document definition for an ActorDelta.
 * Defines the DataSchema and common behaviors for an ActorDelta which are shared between both client and server.
 * ActorDeltas store a delta that can be applied to a particular Actor in order to produce a new Actor.
 *
 * @param data    Initial data used to construct the ActorDelta.
 * @param context Construction context options.
 */
export default class BaseActorDelta<TParent extends documents.BaseToken | null> extends abstract.Document<
    TParent,
    ActorDeltaSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override readonly metadata: ActorDeltaMetadata;

    static override defineSchema(): ActorDeltaSchema;

    override canUserModify(user: documents.BaseUser, action: UserAction, data?: Record<string, unknown>): boolean;

    override testUserPermission(
        user: documents.BaseUser,
        permission: DocumentOwnershipString | DocumentOwnershipLevel,
        { exact }?: { exact?: boolean },
    ): boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Retrieve the base actor's collection, if it exists.
     * @param collectionName  The collection name.
     */
    getBaseCollection(collectionName: string): Collection<documents.BaseActor> | undefined;

    /**
     * Apply an ActorDelta to an Actor and return the resultant synthetic Actor.
     * @param {ActorDelta} delta  The ActorDelta.
     * @param {Actor} baseActor   The base Actor.
     * @param {object} [context]  Context to supply to synthetic Actor instantiation.
     * @returns {Actor|null}
     */
    static applyDelta(
        delta: BaseActorDelta<documents.BaseToken | null>,
        baseActor: documents.BaseActor,
        context?: DocumentConstructionContext<documents.BaseToken | null>,
    ): documents.BaseActor;
}

export default interface BaseActorDelta<TParent extends documents.BaseToken | null>
    extends abstract.Document<TParent, ActorDeltaSchema>,
        ModelPropsFromSchema<ActorDeltaSchema> {}

interface ActorDeltaMetadata extends abstract.DocumentMetadata {
    name: "ActorDelta";
    collection: "delta";
    label: "DOCUMENT.ActorDelta";
    labelPlural: "DOCUMENT.ActorDeltas";
    isEmbedded: true;
    embedded: {
        Item: "items";
        ActiveEffect: "effects";
    };
}

type ActorDeltaSchema = {
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, false, true, true>;
    type: fields.StringField<string, string, false, true, true>;
    img: fields.FilePathField<ImageFilePath, ImageFilePath, false, true, true>;
    system: fields.ObjectField<object, object, true, true, true>;
    items: fields.EmbeddedCollectionDeltaField<
        documents.BaseItem<documents.BaseActor>,
        (DocumentSourceFromSchema<ItemSchema, true> | SourceFromSchema<TombstoneDataSchema>)[]
    >;
    effects: fields.EmbeddedCollectionDeltaField<documents.BaseActiveEffect<documents.BaseActor>>;
    ownership: fields.DocumentOwnershipField;
    flags: fields.ObjectField<DocumentFlags>;
};

export type ActorDeltaSource = SourceFromSchema<ActorDeltaSchema>;
