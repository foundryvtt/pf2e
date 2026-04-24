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
 * @category Documents
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
    _id: fields.DocumentIdField;
    type: fields.DocumentTypeField<string, string, true, false, true, BaseCombat>;
    system: fields.TypeDataField;
    scene: fields.ForeignDocumentField<BaseScene>;
    groups: fields.EmbeddedCollectionField<BaseCombatantGroup<BaseCombat>>;
    combatants: fields.EmbeddedCollectionField<BaseCombatant<BaseCombat>>;
    active: fields.BooleanField;
    round: fields.NumberField<number, number, true, false, true>;
    turn: fields.NumberField<number, number, true, true, true>;
    sort: fields.IntegerSortField;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

export type CombatSource = fields.SourceFromSchema<CombatSchema>;
