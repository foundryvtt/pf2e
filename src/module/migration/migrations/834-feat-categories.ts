import { ItemSourcePF2e } from "@item/data/index.ts";
import { FeatSystemSource } from "@item/feat/data.ts";
import { FEAT_CATEGORIES } from "@item/feat/values.ts";
import { isObject, recursiveReplaceString, setHasElement } from "@util";
import { MigrationBase } from "../base.ts";
import { RuleElementSource } from "@module/rules/index.ts";

/** Rename `featType.value` to `category`, remove "archetype" category */
export class Migration834FeatCategories extends MigrationBase {
    static override version = 0.834;

    #updateCategoryData(system: FeatSystemSource & { "-=featType"?: null }): void {
        const { traits } = system;

        if ("featType" in system && isObject<{ value: string }>(system.featType)) {
            const category = system.featType.value;
            delete system.featType;
            if ("game" in globalThis) system["-=featType"] = null;

            if (category === "archetype") {
                system.category = system.traits.value.includes("skill") ? "skill" : "class";
                if (!traits.value.includes("archetype")) {
                    traits.value.push("archetype");
                    traits.value.sort();
                }
            } else if (setHasElement(FEAT_CATEGORIES, category)) {
                system.category = category;
            }
        }

        // Ensure valid category even if no change was made
        if (!setHasElement(FEAT_CATEGORIES, system.category)) {
            system.category = "bonus";
        }

        // Ensure presence of either "archetype" or "general" trait on all skill feats
        if (system.category === "skill" && !traits.value.includes("archetype") && !traits.value.includes("general")) {
            system.traits.value.push("general");
            system.traits.value.sort();
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "feat") {
            this.#updateCategoryData(source.system);
        }

        const choiceSets = source.system.rules.filter((r): r is ChoiceSetRE => r.key === "ChoiceSet");
        for (const rule of choiceSets) {
            if (
                isObject(rule.allowedDrops) &&
                "predicate" in rule.allowedDrops &&
                Array.isArray(rule.allowedDrops.predicate)
            ) {
                rule.allowedDrops.predicate = recursiveReplaceString(rule.allowedDrops.predicate, (s) =>
                    s.replace(/\bfeat(?:ure)?-type\b/, "category")
                );
            }

            if (isObject(rule.choices) && "query" in rule.choices && typeof rule.choices.query === "string") {
                rule.choices.query = rule.choices.query
                    .replace('"featType.value":"archetype"', '"category":"class"')
                    .replace("featType.value", "category");
            }
        }
    }
}

interface ChoiceSetRE extends RuleElementSource {
    key: "ChoiceSet";
    choices?: unknown;
    allowedDrops?: unknown;
}
