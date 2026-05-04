import {
    DatabaseUpdateCallbackOptions,
    Document,
    DocumentClassMetadata,
    EmbeddedCollection,
} from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import { BaseCombatant, BaseCombatantGroup, BaseScene, BaseUser } from "./_module.mjs";

/**
 * The Combat Document.
 * Defines the DataSchema and common behaviors for a Combat which are shared between both client and server.
 */
export default class BaseCombat extends Document<null, CombatSchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<CombatMetadata>;

    static override LOCALIZATION_PREFIXES: string[];

    static override defineSchema(): CombatSchema;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;
}

export default interface BaseCombat extends Document<null, CombatSchema>, fields.ModelPropsFromSchema<CombatSchema> {
    get documentName(): CombatMetadata["name"];

    readonly combatants: EmbeddedCollection<BaseCombatant<this>>;
    readonly groups: EmbeddedCollection<BaseCombatantGroup<this>>;
}

interface CombatMetadata extends DocumentClassMetadata {
    name: "Combat";
    collection: "combats";
    label: "DOCUMENT.Combat";
    labelPlural: "DOCUMENT.Combats";
    embedded: {
        Combatant: "combatants";
        CombatantGroup: "groups";
    };
    hasTypeData: true;
    baseTypeAllowed: true;
}

type CombatSchema = {
    /** The _id which uniquely identifies this Combat document */
    _id: fields.DocumentIdField;
    /** The type of this Combat. */
    type: fields.DocumentTypeField<string, string, false, false, false, BaseCombat>;
    /** Game system data which is defined by system data models. */
    system: fields.TypeDataField;
    /** The _id of a Scene within which this Combat occurs */
    scene: fields.ForeignDocumentField<BaseScene>;
    /** A Collection of Documents that represent a grouping of individual Combatants. */
    groups: fields.EmbeddedCollectionField<BaseCombatantGroup<BaseCombat>>;
    /** A Collection of Combatant embedded Documents */
    combatants: fields.EmbeddedCollectionField<BaseCombatant<BaseCombat>>;
    /** Is the Combat encounter currently active? */
    active: fields.BooleanField;
    /** The current round of the Combat encounter */
    round: fields.NumberField<number, number, true, false, true>;
    /** The current turn in the Combat round */
    turn: fields.NumberField<number, number, true, true, true>;
    /** The current sort order of this Combat relative to others in the same Scene */
    sort: fields.IntegerSortField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object of creation and access information */
    _stats: fields.DocumentStatsField;
};

export type CombatSource = fields.SourceFromSchema<CombatSchema>;
