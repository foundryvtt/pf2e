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
    /** The _id which uniquely identifies this Combate document */
    _id: fields.DocumentIdField;
    /** An Combate subtype which configures the system data model applied */
    type: fields.DocumentTypeField<string, string, false, false, false, BaseCombat>;
    /** They system data object which is defined by the system data model */
    system: fields.TypeDataField;
    /** The Scene within which this Combat occurs */
    scene: fields.ForeignDocumentField<BaseScene>;
    /** An EmbeddedCollection of CombatantGroup documents */
    groups: fields.EmbeddedCollectionField<BaseCombatantGroup<BaseCombat>>;
    /** An EmbeddedCollection of Combatant documents */
    combatants: fields.EmbeddedCollectionField<BaseCombatant<BaseCombat>>;
    /** Is the Combat encounter currently active? */
    active: fields.BooleanField;
    /** The current round of the Combat encounter */
    round: fields.NumberField<number, number, true, false, true>;
    /** The current turn of the Combat encounter */
    turn: fields.NumberField<number, number, true, true, true>;
    /** The numeric sort value which orders this Combat relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object containing document metadata */
    _stats: fields.DocumentStatsField;
};

export type CombatSource = fields.SourceFromSchema<CombatSchema>;
