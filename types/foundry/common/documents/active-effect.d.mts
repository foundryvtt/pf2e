import { DatabaseCreateCallbackOptions } from "@common/abstract/_types.mjs";
import {
    DocumentOwnershipLevel,
    ActiveEffectDurationUnit,
    ActiveEffectShowIcon,
    ImageFilePath,
    UserAction,
} from "@common/constants.mjs";
import { Document, DocumentMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import { ActorUUID, BaseActor, BaseCombat, BaseItem, BaseUser, ItemUUID } from "./_module.mjs";

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
        permission: DocumentOwnershipLevel,
        { exact }?: { exact?: boolean },
    ): boolean;

    /* -------------------------------------------- */
    /*  Database Event Handlers                     */
    /* -------------------------------------------- */

    protected override _preCreate(
        data: DeepPartial<this["_source"]>,
        options: DatabaseCreateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;
}

export default interface BaseActiveEffect<TParent extends BaseActor | BaseItem<BaseActor | null> | null>
    extends Document<TParent, ActiveEffectSchema>, fields.ModelPropsFromSchema<ActiveEffectSchema> {
    get documentName(): ActiveEffectMetadata["name"];
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
    system: fields.TypeDataField;
    type: fields.StringField<string, string, false, true, true>;
    disabled: fields.BooleanField;
    start: fields.SchemaField<EffectStartSchema, EffectStartSource, EffectStartData, true, true, true>;
    duration: fields.SchemaField<EffectDurationSchema>;
    description: fields.HTMLField;
    img: fields.FilePathField<ImageFilePath>;
    origin: fields.DocumentUUIDField<ActorUUID | ItemUUID>;
    tint: fields.ColorField;
    transfer: fields.BooleanField;
    statuses: fields.SetField<fields.StringField<string, string, true, false, false>>;
    showIcon: fields.NumberField<ActiveEffectShowIcon, ActiveEffectShowIcon, true, false, true>;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

type EffectChangeSchema = {
    type: fields.StringField<string, string, true, false, true>;
    value: fields.AnyField;
    phase: fields.StringField<string, string, true, false, true>;
    priority: fields.NumberField;
};

type EffectStartSchema = {
    combat: fields.ForeignDocumentField<BaseCombat>;
    combatant: fields.ForeignDocumentField<string>;
    initiative: fields.NumberField<number, number, true>;
    round: fields.NumberField<number, number, true>;
    turn: fields.NumberField<number, number, true>;
    time: fields.NumberField<number, number, true, false>;
};

export type EffectStartSource = fields.SourceFromSchema<EffectStartSchema>;
interface EffectStartData extends fields.ModelPropsFromSchema<EffectStartSchema> {
    value: number;
}

type EffectDurationSchema = {
    value: fields.NumberField<number, number, true, true, true>;
    units: fields.StringField<ActiveEffectDurationUnit, ActiveEffectDurationUnit, true, true, true>;
    expiry: fields.StringField<string, string, true, true, true>;
    expired: fields.BooleanField;
};

export type EffectDurationSource = fields.SourceFromSchema<EffectDurationSchema>;
export type EffectDurationData = fields.ModelPropsFromSchema<EffectDurationSchema>;

export type ActiveEffectSource = fields.SourceFromSchema<ActiveEffectSchema>;

export type EffectChangeData = fields.SourceFromSchema<EffectChangeSchema>;

export {};
