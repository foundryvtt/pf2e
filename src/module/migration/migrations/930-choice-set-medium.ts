import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { ChoiceSetSource } from "@module/rules/rule-element/choice-set/data.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";
import { isSizeChoice, resolveLongForm } from "./929-remove-skill-abbreviations.ts";

/** Migration 929 originally failed to filter out size choicesets when updating the selection */
export class Migration930ChoiceSetMedium extends MigrationBase {
    static override version = 0.93;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        for (const rule of source.system.rules) {
            if (!isChoiceSource(rule)) continue;

            const isSize = isSizeChoice(rule);

            // Fix any choice set selections that got converted to "medicine"
            if (isSize && rule.selection === "medicine") {
                rule.selection = "med";
            }

            // The original choice set selection migration was not recursive. Recursively run the migration
            if (!isSize && rule.selection && typeof rule.selection === "object") {
                rule.selection = recursiveReplaceString(rule.selection, (s) => resolveLongForm(s));
            }
        }
    }
}

function isChoiceSource(source: RuleElementSource): source is ChoiceSetSource {
    return source.key === "ChoiceSet";
}
