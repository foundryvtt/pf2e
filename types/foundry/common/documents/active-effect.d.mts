import { DatabaseCreateCallbackOptions } from "@common/abstract/_types.mjs";
import { ActiveEffectDurationUnit, ActiveEffectShowIcon, ImageFilePath } from "@common/constants.mjs";
import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import { ActorUUID, BaseActor, BaseCombat, BaseFolder, BaseItem, BaseUser, ItemUUID } from "./_module.mjs";

/**
 * The ActiveEffect Document.
 * Defines the DataSchema and common behaviors for an ActiveEffect which are shared between both client and server.
 */
export default class BaseActiveEffect<
    TParent extends BaseActor | BaseItem<BaseActor | null> | null = BaseActor | BaseItem<BaseActor | null> | null,
> extends Document<TParent, ActiveEffectSchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<ActiveEffectMetadata>;

    static override defineSchema(): ActiveEffectSchema;

    static override LOCALIZATION_PREFIXES: string[];

    /** The default icon used for newly created ActiveEffect documents */
    static DEFAULT_ICON: string;

    static override canUserCreate(user: BaseUser): boolean;

    /* -------------------------------------------- */
    /*  Database Event Handlers                     */
    /* -------------------------------------------- */

    protected override _preCreate(
        data: DeepPartial<this["_source"]>,
        options: DatabaseCreateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;
}

export default interface BaseActiveEffect<
    TParent extends BaseActor | BaseItem<BaseActor | null> | null = BaseActor | BaseItem<BaseActor | null> | null,
>
    extends Document<TParent, ActiveEffectSchema>, fields.ModelPropsFromSchema<ActiveEffectSchema> {
    get documentName(): ActiveEffectMetadata["name"];

    get folder(): BaseFolder | null;
}

export interface ActiveEffectMetadata extends DocumentClassMetadata {
    name: "ActiveEffect";
    collection: "effects";
    hasTypeData: true;
    baseTypeAllowed: true;
    indexed: true;
    compendiumIndexFields: ["_id", "name", "img", "type", "sort", "folder"];
    label: "DOCUMENT.ActiveEffect";
    labelPlural: "DOCUMENT.ActiveEffects";
}

type ActiveEffectSchema = {
    /** The _id which uniquely identifies this ActiveEffect document */
    _id: fields.DocumentIdField;
    /** The name of this ActiveEffect */
    name: fields.StringField<string, string, true, false, false>;
    /** An image file path which provides the artwork for this ActiveEffect */
    img: fields.FilePathField<ImageFilePath>;
    /** An ActorEffect subtype which configures the system data model applied */
    type: fields.StringField<string, string, false, true, true>;
    /** They system data object which is defined by the system data model */
    system: fields.TypeDataField;
    /** Is this ActiveEffect disabled? */
    disabled: fields.BooleanField;
    start: fields.SchemaField<EffectStartSchema, EffectStartSource, EffectStartData, true, true, true>;
    duration: fields.SchemaField<EffectDurationSchema>;
    description: fields.HTMLField;
    origin: fields.DocumentUUIDField<ActorUUID | ItemUUID>;
    tint: fields.ColorField;
    transfer: fields.BooleanField;
    statuses: fields.SetField<fields.StringField<string, string, true, false, false>>;
    /** Is the icon for this ActiveEffect displayed? */
    showIcon: fields.NumberField<ActiveEffectShowIcon, ActiveEffectShowIcon, true, false, true>;
    /** The Folder which contains this ActiveEffect */
    folder: fields.ForeignDocumentField<BaseFolder>;
    /** The numeric sort value which orders this ActiveEffect relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object containing document metadata */
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
