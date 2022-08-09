import { CraftingEntryData } from "@actor/character/crafting";
import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { PhysicalItemTrait } from "@item/physical/data";
import { RuleElementSource } from "@module/rules";
import { RawPredicate } from "@system/predication";
import { MigrationBase } from "../base";

/** Convert crafting entry `requiredTrait` properties to be predicates */
export class Migration772PredicateOnCraftingEntries extends MigrationBase {
    static override version = 0.772;

    munitionsCrafterPredicate: RawPredicate = {
        all: ["item:trait:alchemical"],
        any: ["item:trait:bomb", "item:subtype:ammo"],
    };

    override async updateActor(actorData: ActorSourcePF2e) {
        if (actorData.type === "character") {
            const craftingEntries: Record<string, Partial<MaybeWithRequiredTraits>> = actorData.system.crafting.entries;
            for (const key in craftingEntries) {
                const entry = craftingEntries[key];
                const requiredTraits = entry["requiredTraits"];
                if (requiredTraits) {
                    entry.craftableItems =
                        entry.selector === "munitionsCrafter"
                            ? this.munitionsCrafterPredicate
                            : this.generatePredicateFromRequiredTraits(requiredTraits);
                    entry["-=requiredTraits"] = null;
                }
            }
        }
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        itemSource.system.rules ??= [];
        const rules = itemSource.system.rules;
        const craftingEntryRules = itemSource.system.rules.filter(
            (rule: Record<string, unknown>): rule is CraftingEntryRuleSourceOld =>
                typeof rule.key === "string" &&
                ["CraftingEntry", "PF2E.RuleElement.CraftingEntry"].includes(rule.key) &&
                Array.isArray(rule["requiredTraits"])
        );
        const newEntries = craftingEntryRules.map(
            (craftingEntryRule): CraftingEntryRuleSourceNew => ({
                key: "CraftingEntry",
                craftableItems:
                    craftingEntryRule.selector === "munitionsCrafter"
                        ? this.munitionsCrafterPredicate
                        : this.generatePredicateFromRequiredTraits(craftingEntryRule.requiredTraits || []),
            })
        );
        for (const craftingEntryRule of craftingEntryRules) {
            const index = rules.indexOf(craftingEntryRule);
            rules.splice(index, 1, newEntries.shift()!);
            delete craftingEntryRule.requiredTraits;
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

interface MaybeWithRequiredTraits extends CraftingEntryData {
    requiredTraits?: PhysicalItemTrait[][];
    "-=requiredTraits": null;
}

type CraftingEntryRuleSourceOld = RuleElementSource & {
    key: "CraftingEntry";
    requiredTraits?: PhysicalItemTrait[][];
};

type CraftingEntryRuleSourceNew = RuleElementSource & {
    craftableItems: RawPredicate;
};
