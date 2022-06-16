import { DamageDicePF2e, DeferredValue, ModifierAdjustment, ModifierPF2e } from "@actor/modifiers";
import { ItemPF2e, WeaponPF2e } from "@item";
import { PredicatePF2e, RawPredicate } from "@system/predication";
import { CreatureSensePF2e } from "@actor/creature/sense";
import { ItemSourcePF2e } from "@item/data";
import { RollNotePF2e } from "@module/notes";
import { MultipleAttackPenaltyPF2e } from "./multiple-attack-penalty";
import { StrikingPF2e } from "./striking";
import { WeaponPotencyPF2e } from "./weapon-potency";
import { StrikeAdjustment } from "./adjust-strike";

export type RuleElementSource = {
    key: string;
    data?: unknown;
    selector?: string;
    value?: RuleValue | BracketedValue;
    label?: string;
    slug?: unknown;
    predicate?: RawPredicate;
    /** The place in order of application (ascending), among an actor's list of rule elements */
    priority?: number;
    ignored?: unknown;
    requiresInvestment?: unknown;
    requiresEquipped?: unknown;
    removeUponCreate?: unknown;
};

export interface RuleElementData extends RuleElementSource {
    key: string;
    data?: object;
    selector?: string;
    value?: RuleValue | BracketedValue;
    label: string;
    slug?: string | null;
    predicate?: PredicatePF2e;
    priority: number;
    ignored: boolean;
    removeUponCreate?: boolean;
}

export type RuleValue = string | number | boolean | object | null;

export interface Bracket<T extends object | number | string> {
    start?: number;
    end?: number;
    value: T;
}

export interface BracketedValue<T extends object | number | string = object | number | string> {
    field?: string;
    brackets: Bracket<T>[];
}

export interface REPreCreateParameters<T extends RuleElementSource = RuleElementSource> {
    /** The source partial of the rule element's parent item to be created */
    itemSource: PreCreate<ItemSourcePF2e>;
    /** The source of the rule in `itemSource`'s `data.rules` array */
    ruleSource: T;
    /** All items pending creation in a `ItemPF2e.createDocuments` call */
    pendingItems: PreCreate<ItemSourcePF2e>[];
    /** The context object from the `ItemPF2e.createDocuments` call */
    context: DocumentModificationContext<ItemPF2e>;
    /** Whether this preCreate run is from a pre-update reevaluation */
    reevaluation?: boolean;
}

export interface REPreDeleteParameters {
    /** All items pending deletion in a `ItemPF2e.deleteDocuments` call */
    pendingItems: Embedded<ItemPF2e>[];
    /** The context object from the `ItemPF2e.deleteDocuments` call */
    context: DocumentModificationContext<ItemPF2e>;
}

type DeferredModifier = DeferredValue<ModifierPF2e | null>;

interface RuleElementSynthetics {
    damageDice: Record<string, DamageDicePF2e[]>;
    modifierAdjustments: Record<string, ModifierAdjustment[]>;
    multipleAttackPenalties: Record<string, MultipleAttackPenaltyPF2e[]>;
    rollNotes: Record<string, RollNotePF2e[]>;
    rollSubstitutions: Record<string, RollSubstitution[]>;
    rollTwice: Record<string, RollTwiceSynthetic[]>;
    senses: SenseSynthetic[];
    statisticsModifiers: Record<string, DeferredModifier[]>;
    strikeAdjustments: StrikeAdjustment[];
    strikes: Map<string, Embedded<WeaponPF2e>>;
    striking: Record<string, StrikingPF2e[]>;
    weaponPotency: Record<string, WeaponPotencyPF2e[]>;
    preparationWarnings: {
        /** Adds a new preparation warning to be printed when flushed */
        add: (warning: string) => void;
        /** Prints all preparation warnings, but this printout is debounced to handle prep and off-prep cycles */
        flush: () => void;
    };
}

interface RollSubstitution {
    slug: string;
    label: string;
    predicate: PredicatePF2e | null;
    value: number;
    ignored: boolean;
    effectType: "fortune" | "misfortune";
}

interface RollTwiceSynthetic {
    keep: "higher" | "lower";
    predicate?: PredicatePF2e;
}

interface SenseSynthetic {
    sense: CreatureSensePF2e;
    predicate: PredicatePF2e | null;
    force: boolean;
}

export { DeferredModifier, RollSubstitution, RollTwiceSynthetic, RuleElementSynthetics, StrikeAdjustment };
