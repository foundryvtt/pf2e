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
    /** The _id which uniquely identifies the ActiveEffect within a parent Actor or Item */
    _id: fields.DocumentIdField;
    /** The name which describes the ActiveEffect */
    name: fields.StringField<string, string, true, false, false>;
    /** An icon image path used to depict the ActiveEffect */
    img: fields.FilePathField<ImageFilePath>;
    /** The document type */
    type: fields.StringField<string, string, false, true, true>;
    /** The system type data field */
    system: fields.TypeDataField;
    /** Is this ActiveEffect currently disabled? Defaults to false. */
    disabled: fields.BooleanField;
    /** Data pertaining to when the ActiveEffect was created. */
    start: fields.SchemaField<EffectStartSchema, EffectStartSource, EffectStartData, true, true, true>;
    /** An EffectDurationData object which describes the duration of the ActiveEffect */
    duration: fields.SchemaField<EffectDurationSchema>;
    /** The HTML text description for this ActiveEffect document. */
    description: fields.HTMLField;
    /** A UUID reference to the document from which this ActiveEffect originated */
    origin: fields.DocumentUUIDField<ActorUUID | ItemUUID>;
    /** A color string which applies a tint to the ActiveEffect icon. Defaults to "#FFFFFF". */
    tint: fields.ColorField;
    /** Does this ActiveEffect automatically transfer from an Item to an Actor? */
    transfer: fields.BooleanField;
    /** Special status IDs that pertain to this effect */
    statuses: fields.SetField<fields.StringField<string, string, true, false, false>>;
    /** Should this ActiveEffect's image be prominently displayed as an icon alongside Tokens, Combatants, etc.? Defaults to a CONDITIONAL (1). */
    showIcon: fields.NumberField<ActiveEffectShowIcon, ActiveEffectShowIcon, true, false, true>;
    folder: fields.ForeignDocumentField<BaseFolder>;
    /** The sort value. Defaults to 0. */
    sort: fields.IntegerSortField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

type EffectChangeSchema = {
    /** The modification type of this change */
    type: fields.StringField<string, string, true, false, true>;
    /** The value of the change effect */
    value: fields.AnyField;
    /**
     * The application phase under which this change is applied. Each phase is its own priority
     * group; that is, application of a change in an earlier phase will occur before a change in
     * a later phase, regardless of priority. A pair of phases are preconfigured, but a package
     * can add more phases to be called at different points during data preparation or on
     * certain events.
     */
    phase: fields.StringField<string, string, true, false, true>;
    /** The order in which this change is applied among other changes in a common phase: a null value is initialized to its default priority. */
    priority: fields.NumberField;
};

type EffectStartSchema = {
    /** The _id of the Combat that was active when this Effect first started */
    combat: fields.ForeignDocumentField<BaseCombat>;
    /** The _id of the Combatant whose turn was active when the Effect first started */
    combatant: fields.ForeignDocumentField<string>;
    /** The Combatant's initiative roll at the time the Effect first started */
    initiative: fields.NumberField<number, number, true>;
    /** The round of the Combat when the Effect first started */
    round: fields.NumberField<number, number, true>;
    /** The turn of the Combat when the Effect first started */
    turn: fields.NumberField<number, number, true>;
    /** The world time when the Effect first started */
    time: fields.NumberField<number, number, true, false>;
};

export type EffectStartSource = fields.SourceFromSchema<EffectStartSchema>;
interface EffectStartData extends fields.ModelPropsFromSchema<EffectStartSchema> {
    value: number;
}

type EffectDurationSchema = {
    /** The maximum duration of the Effect in the quantity of the unit, with null being initialized to Infinity */
    value: fields.NumberField<number, number, true, true, true>;
    /** The time- or combat-based unit of the duration value */
    units: fields.StringField<ActiveEffectDurationUnit, ActiveEffectDurationUnit, true, true, true>;
    /**
     * An identifier of an event at which the Effect will expire: expiration occurs when both
     * the end of the duration and the expiry event are reached. A truly indefinite duration
     * is one in which both duration value and expiry are null.
     */
    expiry: fields.StringField<string, string, true, true, true>;
    /** Is this ActiveEffect expired? */
    expired: fields.BooleanField;
};

export type EffectDurationSource = fields.SourceFromSchema<EffectDurationSchema>;
export type EffectDurationData = fields.ModelPropsFromSchema<EffectDurationSchema>;

export type ActiveEffectSource = fields.SourceFromSchema<ActiveEffectSchema>;

export type EffectChangeData = fields.SourceFromSchema<EffectChangeSchema>;

export {};
