import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Update inline damage-roll links to be formatted to new standard */
export class Migration805InlineDamageRolls extends MigrationBase {
    static override version = 0.805;

    #pattern = /\[\[\/r .+?\]\]\]?(?:\{[^}]+\})?/g;

    #damageTypeLabelPattern = ((): RegExp => {
        const dicePattern = "[0-9]{1,2}d[0-9]{1,2}(?:\\s*[-+]\\s*[0-9]{1,3})?";

        const typesUnion = [
            "acid",
            "bleed",
            "bludgeoning",
            "chaotic",
            "cold",
            "electricity",
            "evil",
            "fire",
            "force",
            "good",
            "lawful",
            "mental",
            "negative",
            "piercing",
            "poison",
            "positive",
            "slashing",
            "sonic",
            "untyped",
        ].join("|");

        return new RegExp(`^${dicePattern} (?:${typesUnion})(?: damage)?$`, "i");
    })();

    #updateDamageFormula(text: string): string {
        const skipStrings = ["splash", "precision", "persistent", "d20", "#"];
        return text.replace(this.#pattern, (match): string => {
            const labelEndsWithDamage = match.toLowerCase().endsWith("damage}");
            if (skipStrings.some((s) => match.includes(s))) {
                return match;
            }

            const customLabel = /\{([^}]+)\}$/.exec(match)?.at(1);
            const withoutLabel = match.replace(/\{[^}]+\}$/, "");
            const expressions: string[] = withoutLabel.match(/\{[^}]+\}\[\w+\]/g) ?? [];
            if (expressions.length === 0) return match;

            const instances = expressions.map((i) =>
                i
                    .trim()
                    .replace(
                        /^\{([^}]+)\}\[([a-z]+)\]$/i,
                        ["+", "-", "*", "/"].some((o) => i.includes(o)) ? "($1)[$2]" : "$1[$2]"
                    )
                    .toLowerCase()
            );

            const reassembled = instances.length === 1 ? `[[/r ${instances[0]}]]` : `[[/r {${instances.join(",")}}]]`;

            return customLabel && !this.#damageTypeLabelPattern.test(customLabel)
                ? `${reassembled}{${customLabel}}`
                : labelEndsWithDamage
                ? `${reassembled} damage`
                : reassembled;
        });
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        source.system = recursiveReplaceString(source.system, (s) => this.#updateDamageFormula(s));
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system = recursiveReplaceString(source.system, (s) => this.#updateDamageFormula(s));
    }

    override async updateJournalEntry(source: foundry.documents.JournalEntrySource): Promise<void> {
        source.pages = recursiveReplaceString(source.pages, (s) => this.#updateDamageFormula(s));
    }
}
