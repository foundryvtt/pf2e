import type { Document, DocumentMetadata } from "../abstract/module.d.ts";
import type { BaseActor, BaseCombat, BaseItem, BaseUser } from "./module.d.ts";
import type * as fields from "../data/fields.d.ts";

/**
 * The ActiveEffect document model.
 * @param data    Initial data from which to construct the document.
 * @param context Construction context options
 */
export default class BaseActiveEffect<TParent extends BaseActor | BaseItem<BaseActor | null> | null> extends Document<
    TParent,
    ActiveEffectSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): ActiveEffectMetadata;

    static override defineSchema(): ActiveEffectSchema;

    /* -------------------------------------------- */
    /*  Model Methods                               */
    /* -------------------------------------------- */

    override canUserModify(user: BaseUser, action: UserAction, data?: object): boolean;

    override testUserPermission(
        user: BaseUser,
        permission: DocumentOwnershipString | DocumentOwnershipLevel,
        { exact }?: { exact?: boolean }
    ): boolean;

    /* -------------------------------------------- */
    /*  Database Event Handlers                     */
    /* -------------------------------------------- */

    protected override _preCreate(
        data: PreDocumentId<this["_source"]>,
        options: DocumentModificationContext<TParent>,
        user: BaseUser
    ): Promise<void>;
}

export default interface BaseActiveEffect<TParent extends BaseActor | BaseItem<BaseActor | null> | null>
    extends Document<TParent, ActiveEffectSchema>,
        ModelPropsFromSchema<ActiveEffectSchema> {
    readonly _source: SourceFromSchema<ActiveEffectSchema>;
}

export interface ActiveEffectMetadata extends DocumentMetadata {
    name: "ActiveEffect";
    collection: "effects";
    label: "DOCUMENT.ActiveEffect";
    isEmbedded: true;
}

type ActiveEffectSchema = {
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, false>;
    changes: fields.ArrayField<
        fields.SchemaField<{
            key: fields.StringField<string, string, true, false, false>;
            value: fields.StringField<string, string, true, false, false>;
            mode: fields.NumberField<ActiveEffectChangeMode, ActiveEffectChangeMode, false, false, true>;
            priority: fields.NumberField;
        }>
    >;
    disabled: fields.BooleanField;
    duration: fields.SchemaField<{
        startTime: fields.NumberField<number, number, false, true, true>;
        seconds: fields.NumberField;
        combat: fields.ForeignDocumentField;
        rounds: fields.NumberField;
        turns: fields.NumberField;
        startRound: fields.NumberField;
        startTurn: fields.NumberField;
    }>;
    description: fields.HTMLField;
    icon: fields.FilePathField<ImageFilePath>;
    origin: fields.StringField<ActorUUID | ItemUUID, ActorUUID | ItemUUID, false, true, true>;
    tint: fields.ColorField;
    transfer: fields.BooleanField;
    statuses: fields.SetField<fields.StringField<string, string, true, false, false>>;
    flags: fields.ObjectField<DocumentFlags>;
};

export type ActiveEffectSource = SourceFromSchema<ActiveEffectSchema>;

export type EffectChangeData = BaseActiveEffect<null>["changes"][number];
export type EffectDurationData = BaseActiveEffect<null>["duration"];
