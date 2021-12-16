import { DamageDicePF2e, ModifierPF2e } from "../modifiers";
import { RollNotePF2e } from "../notes";
import { ItemPF2e, WeaponPF2e } from "@item";
import { PredicatePF2e, RawPredicate } from "@system/predication";
import { CreatureSensePF2e } from "@actor/creature/sense";
import { ItemSourcePF2e } from "@item/data";

export type RuleElementSource = {
    key: string;
    data?: unknown;
    selector?: string;
    value?: RuleValue | BracketedValue;
    scope?: string;
    label?: string;
    slug?: string;
    predicate?: RawPredicate;
    /** The place in order of application (ascending), among an actor's list of rule elements */
    priority?: number;
    ignored?: boolean;
    requiresInvestment?: boolean;
};

export interface RuleElementData extends RuleElementSource {
    key: string;
    data?: any;
    selector?: string;
    value?: RuleValue | BracketedValue;
    scope?: string;
    label: string;
    slug?: string;
    predicate?: PredicatePF2e;
    priority: number;
    ignored: boolean;
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

export interface WeaponPotencyPF2e {
    label: string;
    bonus: number;
    predicate?: PredicatePF2e;
}

export interface StrikingPF2e {
    label: string;
    bonus: number;
    predicate?: PredicatePF2e;
}

export interface MultipleAttackPenaltyPF2e {
    label: string;
    penalty: number;
    predicate?: PredicatePF2e;
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
}

export interface REPreDeleteParameters {
    /** All items pending deletion in a `ItemPF2e.deleteDocuments` call */
    pendingItems: ItemPF2e[];
    /** The context object from the `ItemPF2e.deleteDocuments` call */
    context: DocumentModificationContext<ItemPF2e>;
}

export interface RuleElementSynthetics {
    damageDice: Record<string, DamageDicePF2e[]>;
    multipleAttackPenalties: Record<string, MultipleAttackPenaltyPF2e[]>;
    rollNotes: Record<string, RollNotePF2e[]>;
    senses: SenseSynthetic[];
    statisticsModifiers: Record<string, ModifierPF2e[]>;
    strikes: Embedded<WeaponPF2e>[];
    striking: Record<string, StrikingPF2e[]>;
    weaponPotency: Record<string, WeaponPotencyPF2e[]>;
}

interface SenseSynthetic {
    sense: CreatureSensePF2e;
    predicate: PredicatePF2e | null;
    force: boolean;
}
