import type * as abstract from "../abstract/module.d.ts";
import type * as fields from "../data/fields.d.ts";
import { ActiveEffectSchema } from "./active-effect.js";
import type { BaseActiveEffect, BaseActor, BaseItem, BaseToken, ItemSource } from "./module.d.ts";

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
}

export default interface BaseActorDelta<TParent extends BaseToken | null>
    extends abstract.Document<TParent, ActorDeltaSchema>,
        ModelPropsFromSchema<ActorDeltaSchema> {
    readonly _source: SourceFromSchema<ActorDeltaSchema>;
}

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
    items: fields.EmbeddedCollectionDeltaField<BaseItem<BaseActor>, (ItemSource | fields.DeltaTombstone)[]>;
    effects: fields.EmbeddedCollectionDeltaField<BaseActiveEffect<BaseActor>>;
    ownership: fields.DocumentOwnershipField;
    flags: fields.ObjectField<DocumentFlags>;
};
