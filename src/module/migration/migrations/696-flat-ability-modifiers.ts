import { AbilityString } from "@actor/data";
import { ABILITY_ABBREVIATIONS } from "@actor/data/values";
import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { setHasElement, sluggify } from "@util";
import { MigrationBase } from "../base";

/** Set the "ability" property on ability FlatModifier REs */
export class Migration696FlatAbilityModifiers extends MigrationBase {
    static override version = 0.696;

    private abilityModPattern = /@abilities\.([a-z]{3})\.mod\b/;

    private abbreviationMap = new Map(
        Array.from(ABILITY_ABBREVIATIONS).map((a) => [`PF2E.Ability${sluggify(a, { camel: "bactrian" })}`, a])
    );

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        const rules: MaybeFlatAbilityRule[] = itemSource.data.rules;
        for (const rule of rules) {
            if (
                rule.key.endsWith("FlatModifier") &&
                rule.type === "ability" &&
                !setHasElement(ABILITY_ABBREVIATIONS, rule.ability)
            ) {
                const abilityFromValue = (this.abilityModPattern.exec(String(rule.value))?.[1] ??
                    null) as AbilityString | null;
                rule.ability = abilityFromValue ?? this.abbreviationMap.get(rule.label ?? "") ?? "str";
                if (typeof rule.value === "string" && rule.value.startsWith("@") && rule.value.endsWith(".mod")) {
                    delete rule.value;
                }
            }
        }

        if (itemSource.data.slug === "thief-racket" && !rules.some((rule) => rule.ability === "dex")) {
            rules.unshift({
                ability: "dex",
                key: "FlatModifier",
                predicate: {
                    all: ["weapon:melee", "weapon:trait:finesse"],
                    not: ["weapon:category:unarmed"],
                },
                selector: "damage",
                type: "ability",
            });
        }
    }
}

interface MaybeFlatAbilityRule extends RuleElementSource {
    type?: string;
    ability?: AbilityString;
}
