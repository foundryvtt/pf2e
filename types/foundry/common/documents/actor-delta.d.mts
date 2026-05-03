import { ImageFilePath } from "@common/constants.mjs";
import { DocumentConstructionContext } from "../_types.mjs";
import * as abstract from "../abstract/_module.mjs";
import { TombstoneDataSchema } from "../data/data.mjs";
import * as fields from "../data/fields.mjs";
import Collection from "../utils/collection.mjs";
import { BaseActiveEffect, BaseActor, BaseItem, BaseToken } from "./_module.mjs";
import { ItemSchema } from "./item.mjs";

/**
 * The ActorDelta Document.
 * Defines the DataSchema and common behaviors for an ActorDelta which are shared between both client and server.
 * ActorDeltas store a delta that can be applied to a particular Actor in order to produce a new Actor.
 */
export default class BaseActorDelta<TParent extends BaseToken | null = BaseToken | null> extends abstract.Document<
    TParent,
    ActorDeltaSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override readonly metadata: Readonly<ActorDeltaMetadata>;

    static override defineSchema(): ActorDeltaSchema;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    override getUserLevel(user: foundry.documents.BaseUser): CONST.DocumentOwnershipNumber;

    /**
     * Retrieve the base actor's collection, if it exists.
     * @param collectionName The collection name.
     */
    getBaseCollection(collectionName: string): Collection<string, BaseActor> | undefined;

    /**
     * Apply an ActorDelta to an Actor and return the resultant synthetic Actor.
     * @param delta The ActorDelta.
     * @param baseActor The base Actor.
     * @param context Context to supply to synthetic Actor instantiation.
     */
    static applyDelta(
        delta: BaseActorDelta<BaseToken | null>,
        baseActor: BaseActor,
        context?: DocumentConstructionContext<BaseToken | null>,
    ): BaseActor;
}

export default interface BaseActorDelta<TParent extends BaseToken | null = BaseToken | null>
    extends abstract.Document<TParent, ActorDeltaSchema>, fields.ModelPropsFromSchema<ActorDeltaSchema> {
    readonly items: abstract.EmbeddedCollection<BaseItem<BaseActor>>;
}

interface ActorDeltaMetadata extends abstract.DocumentClassMetadata {
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
    /** The _id which uniquely identifies this ActorDelta document */
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
