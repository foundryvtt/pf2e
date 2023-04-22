import { CraftingEntryData, CraftingFormulaData } from "@actor/character/crafting/index.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { PhysicalItemTrait } from "@item/physical/data.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { PredicateStatement } from "@system/predication.ts";
import { MigrationBase } from "../base.ts";

/** Convert crafting entry `requiredTrait` properties to be predicates */
export class Migration774UnpersistCraftingEntries extends MigrationBase {
    static override version = 0.774;

    munitionsCrafterPredicate: OldRawPredicate = {
        all: ["item:trait:alchemical"],
        any: ["item:trait:bomb", "item:subtype:ammo"],
    };

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type === "character") {
            const craftingData: MaybeWithOldEntries = source.system.crafting;
            const craftingEntries = craftingData.entries ?? {};
            const rules: MaybeWithRequiredTraits[] = source.items.flatMap((i) => i.system.rules);
            for (const rule of rules) {
                if (
                    rule.key !== "CraftingEntry" ||
                    typeof rule.selector !== "string" ||
                    rule.selector.length === 0 ||
                    !rule.requiredTraits
                ) {
                    continue;
                }
                rule.preparedFormulas = craftingEntries[rule.selector]?.actorPreparedFormulas ?? [];
            }
            delete craftingData.entries;
            craftingData["-=entries"] = null;
        }
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        const rules = itemSource.system.rules;
        // Change requiredTraits property to craftableItems predicate
        const craftingEntryRules = rules.filter(
            (r: RuleElementSource & { requiredTraits?: unknown }): r is MaybeWithRequiredTraits =>
                r.key === "CraftingEntry" && Array.isArray(r.requiredTraits)
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

        // Add "phase":"beforeDerived" property to any AE-Likes targeting "system.crafting.entries"
        const craftingEntryAELikes: (RuleElementSource & { phase?: unknown })[] = rules.filter(
            (r: RuleElementSource & { path?: unknown }) =>
                r.key === "ActiveEffectLike" &&
                typeof r.path === "string" &&
                r.path.startsWith("system.crafting.entries.")
        );
        const newCraftingEntryAELikes = craftingEntryAELikes.map((craftingEntryAELike) => {
            craftingEntryAELike.phase = "beforeDerived";
            return craftingEntryAELike;
        });
        for (const craftingEntryAELike of craftingEntryAELikes) {
            const index = rules.indexOf(craftingEntryAELike);
            rules.splice(index, 1, newCraftingEntryAELikes.shift()!);
        }
    }

    generatePredicateFromRequiredTraits(requiredTraits: PhysicalItemTrait[][]): OldRawPredicate {
        if (requiredTraits.length === 1)
            return {
                all: requiredTraits[0].map((trait) => {
                    return `item:trait:${trait}`;
                }),
            };
        return {
            any: requiredTraits.map((traits) => {
                return {
                    and: traits.map((trait) => {
                        return `item:trait:${trait}`;
                    }),
                };
            }),
        };
    }
}

interface MaybeWithOldEntries {
    formulas?: CraftingFormulaData[];
    entries?: MaybeOldCraftingEntries;
    "-=entries"?: null;
}

type MaybeOldCraftingEntries = Record<string, Partial<MaybeWithActorPreparedFormulas>>;

interface MaybeWithActorPreparedFormulas extends CraftingEntryData {
    actorPreparedFormulas?: ActorPreparedFormula[];
}

interface ActorPreparedFormula {
    itemUUID: string;
    quantity?: number;
    expended?: boolean;
    isSignatureItem?: boolean;
}

interface MaybeWithRequiredTraits extends RuleElementSource {
    selector?: unknown;
    requiredTraits?: PhysicalItemTrait[][];
    craftableItems?: OldRawPredicate;
    isAlchemical?: boolean;
    isDailyPrep?: boolean;
    isPrepared?: boolean;
    maxItemLevel?: number;
    maxSlots?: number;
    preparedFormulas?: PreparedFormulaData[];
}

interface PreparedFormulaData {
    itemUUID: string;
    quantity?: number;
    expended?: boolean;
    isSignatureItem?: boolean;
}

interface OldRawPredicate {
    all?: PredicateStatement[];
    any?: PredicateStatement[];
    not?: PredicateStatement[];
}
