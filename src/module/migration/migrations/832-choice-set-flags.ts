import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { recursiveReplaceString, sluggify } from "@util";
import { MigrationBase } from "../base.ts";

/** Ensure flags in Choice Set rule elements are in dromedary case */
export class Migration832ChoiceSetFlags extends MigrationBase {
    static override version = 0.832;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const choiceSets = source.system.rules.filter(
            (r): r is RuleElementSource & { flag: string } =>
                r.key === "ChoiceSet" && "flag" in r && typeof r.flag === "string"
        );

        for (const choiceSet of choiceSets) {
            const originalFlag = choiceSet.flag;
            choiceSet.flag = sluggify(choiceSet.flag, { camel: "dromedary" });
            if (choiceSet.flag !== originalFlag) {
                console.log(`${originalFlag} ->> ${choiceSet.flag}`);
                const pattern = new RegExp(String.raw`\brulesSelections\.${originalFlag}\b`, "g");
                source.system.rules = source.system.rules.map((r) =>
                    r.key === "ChoiceSet"
                        ? r
                        : recursiveReplaceString(r, (s) => s.replace(pattern, `rulesSelections.${choiceSet.flag}`))
                );
            }
        }
    }
}
