import { CraftingEntryData, CraftingFormulaData } from "@actor/character/crafting";
import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { PhysicalItemTrait } from "@item/physical/data";
import { RuleElementSource } from "@module/rules";
import { RawPredicate } from "@system/predication";
import { MigrationBase } from "../base";

/** Convert crafting entry `requiredTrait` properties to be predicates */
export class Migration773UnpersistCraftingEntriesAndAddPredicate extends MigrationBase {
    static override version = 0.773;

    munitionsCrafterPredicate: RawPredicate = {
        all: ["item:trait:alchemical"],
        any: ["item:trait:bomb", "item:subtype:ammo"],
    };

    override async updateActor(actorData: ActorSourcePF2e) {
        if (actorData.type === "character") {
            const craftingEntries: Record<string, Partial<MaybeWithActorPreparedFormulas>> = actorData.system.crafting
                .entries;
            for (const entrySelector in craftingEntries) {
                const entry = craftingEntries[entrySelector];
                const actorPreparedFormulas = entry.actorPreparedFormulas;
                if (actorPreparedFormulas) {
                    for (const formula of actorData.system.crafting.formulas) {
                        for (const [index, actorPreparedFormula] of actorPreparedFormulas.entries()) {
                            if (formula.uuid !== actorPreparedFormula.itemUUID) continue;
                            formula.preparedData ??= {};
                            formula.preparedData[entrySelector] ??= {};
                            if (!Array.isArray(formula.preparedData[entrySelector].slots))
                                formula.preparedData[entrySelector].slots = [];
                            formula.preparedData[entrySelector].slots!.push({
                                quantity: actorPreparedFormula.quantity,
                                expended: actorPreparedFormula.expended,
                                slot: index,
                            });
                            if (actorPreparedFormula.isSignatureItem)
                                formula.preparedData[entrySelector].isSignatureItem = true;
                        }
                    }
                }
            }
            const craftingData: MaybeWithOldEntries = actorData.system.crafting;
            delete craftingData.entries;
            craftingData["-=entries"] = null;
        }
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        const rules = itemSource.system.rules;
        // Change requiredTraits property to craftableItems predicate
        const craftingEntryRules = rules.filter(
            (rule: Record<string, unknown>): rule is MaybeWithRequiredTraits =>
                rule.key === "CraftingEntry" && Array.isArray(rule.requiredTraits)
        );

        const newCraftingEntryRules = craftingEntryRules.map((craftingEntryRule) => {
            craftingEntryRule.craftableItems =
                craftingEntryRule.selector === "munitionsCrafter"
                    ? this.munitionsCrafterPredicate
                    : this.generatePredicateFromRequiredTraits(craftingEntryRule.requiredTraits || []);
            delete craftingEntryRule.requiredTraits;
            return craftingEntryRule;
        });

        for (const craftingEntryRule of craftingEntryRules) {
            const index = rules.indexOf(craftingEntryRule);
            rules.splice(index, 1, newCraftingEntryRules.shift()!);
            delete craftingEntryRule.requiredTraits;
        }

        // Add "phase":"afterDerived" property to any AE-Likes targeting "system.crafting.entries"
        const craftingEntryAELikes: (RuleElementSource & { phase?: unknown })[] = rules.filter(
            (r: RuleElementSource & { path?: unknown }) =>
                r.key === "ActiveEffectLike" &&
                typeof r.path === "string" &&
                r.path.startsWith("system.crafting.entries.")
        );
        const newCraftingEntryAELikes = craftingEntryAELikes.map((craftingEntryAELike) => {
            craftingEntryAELike.phase = "afterDerived";
            return craftingEntryAELike;
        });
        for (const craftingEntryAELike of craftingEntryAELikes) {
            const index = rules.indexOf(craftingEntryAELike);
            rules.splice(index, 1, newCraftingEntryAELikes.shift()!);
        }
    }

    generatePredicateFromRequiredTraits(requiredTraits: PhysicalItemTrait[][]): RawPredicate {
        if (requiredTraits.length === 1)
            return {
                all: requiredTraits[0].map((trait) => {
                    return "item:trait:" + trait;
                }),
            };
        return {
            any: requiredTraits.map((traits) => {
                return {
                    and: traits.map((trait) => {
                        return "item:trait:" + trait;
                    }),
                };
            }),
        };
    }
}

interface MaybeWithOldEntries {
    formulas?: CraftingFormulaData[];
    entries?: Record<string, Partial<CraftingEntryData>>;
    "-=entries"?: null;
}

interface MaybeWithActorPreparedFormulas extends CraftingEntryData {
    actorPreparedFormulas?: ActorPreparedFormula[];
}

interface ActorPreparedFormula {
    itemUUID: string;
    quantity?: number;
    expended?: boolean;
    isSignatureItem?: boolean;
}

type MaybeWithRequiredTraits = RuleElementSource & {
    key: "CraftingEntry";
    requiredTraits?: PhysicalItemTrait[][];
    craftableItems?: RawPredicate;
    isAlchemical?: boolean;
    isDailyPrep?: boolean;
    isPrepared?: boolean;
    maxItemLevel?: number;
    maxSlots?: number;
};
