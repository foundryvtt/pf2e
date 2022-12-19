import { ItemSourcePF2e } from "@item/data";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base";

/** Update inline damage-roll links to be formatted to new standard */
export class Migration805InlineDamageRolls extends MigrationBase {
    static override version = 0.805;

    #pattern = /\[\[\/r .+?\]\]\{[^}]+\}/g;

    #updateDamageFormula(text: string): string {
        const skipStrings = ["splash", "precision", "persistent", "d20", "#"];
        return text.replace(this.#pattern, (match): string => {
            if (!match.endsWith("damage}") || skipStrings.some((s) => match.includes(s))) {
                return match;
            }

            const customLabel = /\{([^}]+)\}$/.exec(match)?.at(1);
            const withoutLabel = match.replace(/\{[^}]+\}$/, "");
            const expressions: string[] = withoutLabel.match(/\{[^}]+\}\[\w+\]/g) ?? [];
            if (expressions.length === 0) return match;

            const instances = expressions.map((i) =>
                i.replace(
                    /^\{([^}]+)\}\[([a-z]+)\]$/,
                    ["+", "-", "*", "/"].some((o) => i.includes(o)) ? "($1)[$2]" : "$1[$2]"
                )
            );

            const reassembled =
                instances.length === 1 ? `[[/r ${instances[0]}]] damage` : `[[/r {${instances.join(",")}}]] damage`;

            return customLabel && instances.length > 1
                ? reassembled.replace(/ damage$/, `{${customLabel}}`)
                : reassembled;
        });
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system = recursiveReplaceString(source.system, (s) => this.#updateDamageFormula(s));
    }

    override async updateJournalEntry(source: foundry.data.JournalEntrySource): Promise<void> {
        source.pages = recursiveReplaceString(source.pages, (s) => this.#updateDamageFormula(s));
    }
}
