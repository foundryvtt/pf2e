import { DocumentOwnershipLevel, DocumentOwnershipString, ImageFilePath, UserAction } from "@common/constants.mjs";
import { DocumentConstructionContext } from "../_types.mjs";
import * as abstract from "../abstract/_module.mjs";
import { TombstoneDataSchema } from "../data/data.mjs";
import * as fields from "../data/fields.mjs";
import Collection from "../utils/collection.mjs";
import { BaseActiveEffect, BaseActor, BaseItem, BaseToken, BaseUser } from "./_module.mjs";
import { ItemSchema } from "./item.mjs";

/**
 * The Document definition for an ActorDelta.
 * Defines the DataSchema and common behaviors for an ActorDelta which are shared between both client and server.
 * ActorDeltas store a delta that can be applied to a particular Actor in order to produce a new Actor.
 *
 * @param data    Initial data used to construct the ActorDelta.
 * @param context Construction context options.
 */
export default class BaseActorDelta<TParent extends BaseToken | null> extends abstract.Document<
    TParent,
    ActorDeltaSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override readonly metadata: ActorDeltaMetadata;

    static override defineSchema(): ActorDeltaSchema;

    override canUserModify(user: BaseUser, action: UserAction, data?: Record<string, unknown>): boolean;

    override testUserPermission(
        user: BaseUser,
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
    getBaseCollection(collectionName: string): Collection<string, BaseActor> | undefined;

    /**
     * Apply an ActorDelta to an Actor and return the resultant synthetic Actor.
     * @param {ActorDelta} delta  The ActorDelta.
     * @param {Actor} baseActor   The base Actor.
     * @param {object} [context]  Context to supply to synthetic Actor instantiation.
     * @returns {Actor|null}
     */
    static applyDelta(
        delta: BaseActorDelta<BaseToken | null>,
        baseActor: BaseActor,
        context?: DocumentConstructionContext<BaseToken | null>,
    ): BaseActor;
}

export default interface BaseActorDelta<TParent extends BaseToken | null>
    extends abstract.Document<TParent, ActorDeltaSchema>,
        fields.ModelPropsFromSchema<ActorDeltaSchema> {}

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
        BaseItem<BaseActor>,
        (fields.DocumentSourceFromSchema<ItemSchema, true> | fields.SourceFromSchema<TombstoneDataSchema>)[]
    >;
    effects: fields.EmbeddedCollectionDeltaField<BaseActiveEffect<BaseActor>>;
    ownership: fields.DocumentOwnershipField;
    flags: fields.DocumentFlagsField;
};

export type ActorDeltaSource = fields.SourceFromSchema<ActorDeltaSchema>;
