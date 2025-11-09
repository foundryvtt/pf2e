import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { FlatModifierSource } from "@module/rules/rule-element/flat-modifier.ts";
import { sluggify } from "@util";
import { MigrationBase } from "../base.ts";

export class Migration948MoreBadPredicatesAndSolarianCrystals extends MigrationBase {
    static override version = 0.948;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        // First catch any more bad slugs
        const rules: Rule[] = source.system.rules;
        const propertiesToCheck = ["runes-potency", "runes-resilient", "runes-striking"];
        const invalid = ["item:slug:weapon", "item:slug:attack-roll", "item:slug:weapon-attack-roll"];
        for (const rule of rules) {
            if (
                rule.key === "ItemAlteration" &&
                typeof rule.property === "string" &&
                propertiesToCheck.includes(rule.property) &&
                Array.isArray(rule.predicate)
            ) {
                rule.predicate = rule.predicate.filter((p) => !invalid.includes(p));
            }
        }

        // Only continue if its a solarian potency or striking crystal
        if (source.type !== "equipment") return;
        const slug = source.system.slug || sluggify(source.name);
        const isPotencyCrystal = /^\d-weapon-potency-crystal$/.test(slug);
        const isStrikingCrystal = /^striking-crystal-(?:advanced|commercial|tactical)$/.test(slug);
        if (!isPotencyCrystal && !isStrikingCrystal) return;

        // Convert potency alterations with flat modifiers, and runes-striking alterations to damage dice numbers
        source.system.rules = rules.map((rule) => {
            if (rule.key !== "ItemAlteration") return rule;

            if (rule["property"] === "runes-potency") {
                return {
                    key: "FlatModifier",
                    slug: "weapon-potency",
                    label: "PF2E.Item.Weapon.Rune.Potency",
                    selector: "attack-roll",
                    type: "item",
                    value: rule["value"],
                    predicate: rule.predicate,
                } satisfies FlatModifierSource;
            } else if (rule["property"] === "runes-striking") {
                rule["property"] = "damage-dice-number";
                if (typeof rule["value"] === "number") {
                    rule.value = rule.value + 1;
                }
            }

            return rule;
        });
    }
}

type Rule = { key: string; predicate?: JSONValue; [K: string]: JSONValue };
