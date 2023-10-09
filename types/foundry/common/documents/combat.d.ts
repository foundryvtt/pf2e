import type { Document, DocumentMetadata, EmbeddedCollection } from "../abstract/module.d.ts";
import type * as fields from "../data/fields.d.ts";
import type * as documents from "./module.d.ts";

/** The Combat document model. */
export default class BaseCombat extends Document<null, CombatSchema> {
    static override get metadata(): CombatMetadata;

    static override defineSchema(): CombatSchema;
}

export default interface BaseCombat extends Document<null, CombatSchema>, ModelPropsFromSchema<CombatSchema> {
    readonly combatants: EmbeddedCollection<documents.BaseCombatant<this>>;

    get documentName(): CombatMetadata["name"];
}

interface CombatMetadata extends DocumentMetadata {
    name: "Combat";
    collection: "combats";
    label: "DOCUMENT.Combat";
    embedded: {
        Combatant: "combatants";
    };
    isPrimary: true;
}

type CombatSchema = {
    /** The _id which uniquely identifies this Combat document */
    _id: fields.DocumentIdField;
    /** The _id of a Scene within which this Combat occurs */
    scene: fields.ForeignDocumentField<documents.BaseScene>;
    /** A Collection of Combatant embedded Documents */
    combatants: fields.EmbeddedCollectionField<documents.BaseCombatant<BaseCombat>>;
    /** Is the Combat encounter currently active? */
    active: fields.BooleanField;
    /** The current round of the Combat encounter */
    round: fields.NumberField<number, number, true, false, true>;
    /** The current turn in the Combat round */
    turn: fields.NumberField<number, number, true, true, true>;
    /** The current sort order of this Combat relative to others in the same Scene */
    sort: fields.IntegerSortField;
    /** An object of optional key/value flags */
    flags: fields.ObjectField<DocumentFlags>;
    _stats: fields.DocumentStatsField;
};

type CombatSource = SourceFromSchema<CombatSchema>;
