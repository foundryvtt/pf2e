import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { DegreeOfSuccessString } from "@system/degree-of-success.ts";
import { MigrationBase } from "../base.ts";

/** Update roll notes on tanglefoot bags to have titled roll notes and no damage dice  */
export class Migration788UpdateTanglefootBags extends MigrationBase {
    static override version = 0.788;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!(source.type === "weapon" && source.system.slug?.startsWith("tanglefoot-bag-"))) {
            return;
        }

        source.system.damage.dice = 0;

        switch (source.system.slug) {
            case "tanglefoot-bag-lesser": {
                source.system.rules = this.#getRules("Lesser");
                return;
            }
            case "tanglefoot-bag-moderate": {
                source.system.rules = this.#getRules("Moderate");
                return;
            }
            case "tanglefoot-bag-greater": {
                source.system.rules = this.#getRules("Greater");
                return;
            }
            case "tanglefoot-bag-major": {
                source.system.rules = this.#getRules("Major");
                return;
            }
        }
    }

    #getRules(type: "Lesser" | "Moderate" | "Greater" | "Major"): NoteRESource[] {
        return [
            {
                key: "Note",
                outcome: ["success"],
                selector: "{item|_id}-attack",
                text: `PF2E.BombNotes.TanglefootBag.${type}.success`,
                title: "TYPES.Item.effect",
            },
            {
                key: "Note",
                outcome: ["criticalSuccess"],
                selector: "{item|_id}-attack",
                text: `PF2E.BombNotes.TanglefootBag.${type}.criticalSuccess`,
                title: "TYPES.Item.effect",
            },
        ];
    }
}

interface NoteRESource extends RuleElementSource {
    key: "Note";
    selector: string;
    outcome: DegreeOfSuccessString[];
    text: string;
    title?: string;
}
