import { AttributeString } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { setHasElement, sluggify } from "@util";
import { MigrationBase } from "../base.ts";

/** Set the "ability" property on ability FlatModifier REs */
export class Migration696FlatAbilityModifiers extends MigrationBase {
    static override version = 0.696;

    private abilityModPattern = /@abilities\.([a-z]{3})\.mod\b/;

    private abbreviationMap = new Map(
        Array.from(ATTRIBUTE_ABBREVIATIONS).map((a) => [`PF2E.Ability${sluggify(a, { camel: "bactrian" })}`, a]),
    );

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        const rules: MaybeFlatAbilityRule[] = itemSource.system.rules;
        for (const rule of rules) {
            if (
                typeof rule.key === "string" &&
                rule.key.endsWith("FlatModifier") &&
                rule.type === "ability" &&
                !setHasElement(ATTRIBUTE_ABBREVIATIONS, rule.ability)
            ) {
                const abilityFromValue = (this.abilityModPattern.exec(String(rule.value))?.[1] ??
                    null) as AttributeString | null;
                rule.ability = abilityFromValue ?? this.abbreviationMap.get(String(rule.label ?? "")) ?? "str";
                if (typeof rule.value === "string" && rule.value.startsWith("@") && rule.value.endsWith(".mod")) {
                    delete rule.value;
                }
            }
        }

        if (itemSource.system.slug === "thief-racket" && !rules.some((rule) => rule.ability === "dex")) {
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
    selector?: string;
    type?: string;
    ability?: AttributeString;
}
