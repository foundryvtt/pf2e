import { ItemSourcePF2e } from "@item/data";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base";

/** Update inline damage-roll links to be formatted to new standard */
export class Migration805InlineDamageRolls extends MigrationBase {
    static override version = 0.805;

    #pattern = /\[\[\/r .+?\]\]\{[^}]+ damage\}/g;

    #updateDamageFormula(text: string): string {
        return text.replace(this.#pattern, (match): string => {
            if (["splash", "persistent", "d20", "#"].some((s) => match.includes(s))) {
                return match;
            }

            const withoutLabel = match.replace(/\{[^}]+\}$/, "");
            const expressions: string[] = withoutLabel.match(/\{[^}]+\}\[\w+\]/g) ?? [];
            if (expressions.length === 0) return match;

            const instances = expressions.map((i) =>
                i.replace(
                    /^\{([^}]+)\}\[([a-z]+)\]$/,
                    ["+", "-", "*", "/"].some((o) => i.includes(o)) ? "($1)[$2]" : "$1[$2]"
                )
            );

            return `[[/r {${instances.join(",")}}]] damage`;
        });
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system = recursiveReplaceString(source.system, (s) => this.#updateDamageFormula(s));
    }

    override async updateJournalEntry(source: foundry.data.JournalEntrySource): Promise<void> {
        source.pages = recursiveReplaceString(source.pages, (s) => this.#updateDamageFormula(s));
    }
}
