import { AbilitySource, ClassSource, FeatSource, ItemSourcePF2e } from "@item/base/data/index.ts";
import { AELikeSource } from "@module/rules/rule-element/ae-like.ts";
import { CraftingEntryRuleSource } from "@module/rules/rule-element/crafting/entry.ts";
import { NoteRESource } from "@module/rules/rule-element/roll-note.ts";
import { MigrationBase } from "../base.ts";

/** Add new rule elements to various classes and feats (covers Gunslinger, Inventor, and Swashbuckler). */
export class Migration916NewPCToys extends MigrationBase {
    static override version = 0.916;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const slug = source.system.slug;
        if (!slug) return;

        if (source.type === "action") {
            this.#updateAbility(source, slug);
        } else if (source.type === "class") {
            this.#updateClass(source, slug);
        } else if (source.type === "feat") {
            this.#updateFeat(source, slug);
        }
    }

    get #explodeAELike(): AELikeSource {
        const path = "flags.pf2e.inventor.explode";
        return { key: "ActiveEffectLike", mode: "override", path, priority: 49, value: "fire" };
    }

    get #unstableCheckNotes(): NoteRESource[] {
        return [
            {
                key: "Note",
                predicate: ["self:action:trait:unstable"],
                selector: ["inline-damage", "inline-healing", "strike-attack-roll"],
                text: "PF2E.SpecificRule.Inventor.Unstable.Note",
                title: "PF2E.TraitUnstable",
            },
            {
                key: "Note",
                outcome: ["failure"],
                predicate: ["unstable-check"],
                selector: ["flat-check"],
                text: "PF2E.SpecificRule.Inventor.Unstable.FlatCheck.Failure",
                title: "PF2E.Check.Result.Degree.Check.failure",
            },
            {
                key: "Note",
                outcome: ["criticalFailure"],
                predicate: ["unstable-check"],
                selector: ["flat-check"],
                text: "PF2E.SpecificRule.Inventor.Unstable.FlatCheck.CriticalFailure",
                title: "PF2E.Check.Result.Degree.Check.criticalFailure",
            },
        ];
    }

    #updateAbility(source: AbilitySource, slug: string): void {
        if (slug === "overdrive") {
            const rules = [
                {
                    key: "Note",
                    title: "PF2E.Check.Result.Degree.Check.criticalSuccess",
                    selector: "crafting",
                    predicate: ["self:action:slug:overdrive"],
                    text: "PF2E.SpecificRule.Inventor.Overdrive.CriticalSuccess",
                    outcome: ["criticalSuccess"],
                },
                {
                    key: "Note",
                    title: "PF2E.Check.Result.Degree.Check.success",
                    selector: "crafting",
                    predicate: ["self:action:slug:overdrive"],
                    text: "PF2E.SpecificRule.Inventor.Overdrive.Success",
                    outcome: ["success"],
                },
                {
                    key: "Note",
                    outcome: ["criticalFailure"],
                    predicate: ["self:action:slug:overdrive"],
                    selector: "crafting",
                    text: "PF2E.SpecificRule.Inventor.Overdrive.CriticalFailure",
                    title: "PF2E.Check.Result.Degree.Check.criticalFailure",
                },
            ];
            source.system.rules = rules;
        }
    }

    #updateClass(source: ClassSource, slug: string): void {
        if (slug === "inventor") {
            source.system.rules = [this.#explodeAELike, ...this.#unstableCheckNotes];
        }
    }

    #updateFeat(source: FeatSource, slug: string): void {
        if (slug === "finishing-precision" && !source.system.rules.some((r) => r.key === "ActiveEffectLike")) {
            const path = "flags.pf2e.swashbuckler.preciseStrike";
            const rule = { key: "ActiveEffectLike", mode: "override", path, value: 1 };
            source.system.rules.push(rule);
        } else if (slug === "inventor-dedication" && !source.system.rules.some((r) => r.key === "Note")) {
            source.system.rules.push(...[this.#explodeAELike, ...this.#unstableCheckNotes]);
        } else if (slug === "megaton-strike") {
            const rules = [
                {
                    key: "RollOption",
                    option: "megaton",
                    predicate: [
                        {
                            not: "feature:construct-innovation",
                        },
                    ],
                    suboptions: [
                        { label: "PF2E.SpecificRule.Inventor.Unstable.Stable", value: "stable" },
                        { label: "PF2E.TraitUnstable", value: "unstable" },
                    ],
                    toggleable: true,
                },
                {
                    key: "AdjustStrike",
                    mode: "add",
                    predicate: ["megaton:unstable"],
                    property: "traits",
                    value: "unstable",
                },
                {
                    key: "DamageDice",
                    predicate: [
                        "megaton:stable",
                        {
                            or: [
                                { and: ["feature:weapon-innovation", "item:id:{actor|flags.pf2e.innovationId}"] },
                                { and: ["feature:armor-innovation", "item:melee"] },
                            ],
                        },
                    ],
                    selector: "strike-damage",
                    diceNumber: "ternary(gte(@actor.level, 18), 3, ternary(gte(@actor.level, 10), 2, 1))",
                },
                {
                    key: "DamageDice",
                    predicate: [
                        "megaton:unstable",
                        {
                            or: [
                                { and: ["feature:weapon-innovation", "item:id:{actor|flags.pf2e.innovationId}"] },
                                { and: ["feature:armor-innovation", "item:melee"] },
                            ],
                        },
                    ],
                    selector: "strike-damage",
                    diceNumber: "ternary(gte(@actor.level, 18), 4, ternary(gte(@actor.level, 10), 3, 2))",
                },
            ];
            source.system.rules = rules;
        } else if (slug === "munitions-crafter") {
            const craftingRule = source.system.rules.find(
                (r): r is CraftingEntryRuleSource => r.key === "CraftingEntry",
            );
            if (craftingRule) {
                craftingRule.batchSizes = {
                    other: [
                        { definition: ["item:category:ammo", "item:trait:alchemical", "item:level:0"], quantity: 10 },
                    ],
                };
                craftingRule.craftableItems = [
                    "item:trait:alchemical",
                    { or: ["item:trait:bomb", "item:category:ammo"] },
                ];
            }
        } else if (slug === "precise-strike" && !source.system.rules.some((r) => r.key === "ActiveEffectLike")) {
            const rule = {
                key: "ActiveEffectLike",
                mode: "override",
                path: "flags.pf2e.swashbuckler.preciseStrike",
                predicate: ["class:swashbuckler"],
                value: "ceil(@actor.level/4) + 1",
            };
            source.system.rules.push(rule);
        }
    }
}
