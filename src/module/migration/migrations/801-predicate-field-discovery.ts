import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { RawPredicate } from "@system/predication";
import { MigrationBase } from "../base";

export class Migration801PredicateFieldDiscoveries extends MigrationBase {
    static override version = 0.801;

    alchemistBatchSizes: BatchSizeData[] = [
        {
            predicate: ["item:signature"],
            batchSize: 3,
        },
        {
            predicate: ["item:trait:bomb", "feature:field-discovery-bomber"],
            batchSize: 3,
        },
        {
            predicate: [
                "feature:field-discovery-chirurgeon",
                {
                    or: [
                        "item:elixir-of-life-minor",
                        "item:elixir-of-life-lesser",
                        "item:elixir-of-life-moderate",
                        "item:elixir-of-life-greater",
                        "item:elixir-of-life-major",
                        "item:elixir-of-life-true",
                    ],
                },
            ],
            batchSize: 3,
        },
        {
            predicate: ["item:trait:mutagen", "feature:field-discovery-mutagenist"],
            batchSize: 3,
        },
        {
            predicate: ["item:trait:poison", "feature:field-discovery-toxicologist"],
            batchSize: 3,
        },
    ];

    munitionsCrafterBatchSizes: BatchSizeData[] = [
        {
            predicate: ["item:trait:alchemical", "item:subtype:ammo", "item:level:0", { not: "item:trait:magical" }],
            batchSize: 10,
        },
        {
            predicate: [
                "feat:precious-munitions",
                "item:subtype:ammo",
                {
                    or: ["item:material:grade:standard", "item:material:grade:high"],
                },
                {
                    and: [
                        "feat:precious-munitions",
                        "item:subtype:ammo",
                        {
                            or: ["item:material:grade:standard", "item:material:grade:high"],
                        },
                    ],
                    or: ["item:material:adamantine", "item:material:silver", "item:material:coldiron"],
                },
            ],
            batchSize: 1,
        },
    ];

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        const rules = itemSource.system.rules;
        const alchemicalCraftingEntryRules = rules.filter(
            (r: RuleElementSource & { isAlchemical?: unknown }): r is CraftingEntryRuleSource =>
                r.key === "CraftingEntry" && r.isAlchemical === true
        );

        const newCraftingEntryRules = alchemicalCraftingEntryRules.map((alchemicalCraftingEntryRule) => {
            alchemicalCraftingEntryRule.defaultBatchSize = 2;
            if (alchemicalCraftingEntryRule.selector === "alchemist")
                alchemicalCraftingEntryRule.batchSizes = this.alchemistBatchSizes;
            if (alchemicalCraftingEntryRule.selector === "munitionsCrafter")
                alchemicalCraftingEntryRule.batchSizes = this.munitionsCrafterBatchSizes;
            return alchemicalCraftingEntryRule;
        });

        for (const craftingEntryRule of alchemicalCraftingEntryRules) {
            const index = rules.indexOf(craftingEntryRule);
            rules.splice(index, 1, newCraftingEntryRules.shift()!);
        }

        // Remove field discovery REs
        const craftingEntryAELikes: (RuleElementSource & { phase?: unknown })[] = rules.filter(
            (r: RuleElementSource & { path?: unknown }) =>
                r.key === "ActiveEffectLike" &&
                typeof r.path === "string" &&
                (r.path.endsWith(".fieldDiscovery") ||
                    r.path.endsWith(".fieldDiscoveryBatchSize") ||
                    r.path.endsWith(".batchSize"))
        );
        for (const craftingEntryAELike of craftingEntryAELikes) {
            const index = rules.indexOf(craftingEntryAELike);
            rules.splice(index, 1);
        }

        if (itemSource.system.slug === "efficient-alchemy-paragon") {
            itemSource.system.rules = [
                {
                    key: "ActiveEffectLike",
                    mode: "upgrade",
                    path: "system.crafting.entries.alchemist.batchSizeModifier",
                    phase: "afterDerived",
                    value: 1,
                } as RuleElementSource,
            ];
        }
    }
}

interface CraftingEntryRuleSource extends RuleElementSource {
    selector?: unknown;
    isAlchemical?: boolean;
    defaultBatchSize?: number;
    batchSizes?: BatchSizeData[];
}

interface BatchSizeData {
    batchSize: number;
    predicate: RawPredicate;
}
