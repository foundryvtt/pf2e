import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Update persistent damage roll links to also be formatted to new standard */
export class Migration811InlineDamageRollsPersistent extends MigrationBase {
    static override version = 0.811;

    #conditionPattern =
        /(?<=\]\]|})(\s*@(?:UUID|Compendium)\[(?:Compendium\.)?pf2e\.conditionitems\.(?:Persistent Damage|lDVqvLKA6eF3Df60)\]\{[^}]+})/g;

    #pattern = /\[\[\/r ([^[\]]+(\[.*?\])?)\]\](\{\dd\d[^{}]*\})?/g;

    #updateDamageFormula(text: string): string {
        const withoutCondition = text.replace(this.#conditionPattern, " damage");

        return withoutCondition.replace(this.#pattern, (match, formula: string) => {
            if (!match.includes("persistent")) return match;

            // Persistent damage in the system were made with the module in mind, which supports only one instance.
            // This expression was either in {value}[persistent,fire] form or value # persistent fire form

            const hashStyle = formula.match(/([^#]+)#\s*persistent ([^#]+)/);
            if (hashStyle) {
                const expression = hashStyle[1].trim();
                const damageType = hashStyle[2].trim();
                const expressionCleaned = ["+", "-", "*", "/"].some((o) => expression.includes(o))
                    ? `(${expression})`
                    : expression;
                return match.replace(formula, `${expressionCleaned}[persistent,${damageType}]`);
            }

            const expressions = formula.match(/\{[^}]+\}\[[\w,]+\]/g) ?? [];
            if (expressions.length) {
                const withoutLabel = match.replace(/\{\dd\d[^{}]*\}$/, "");
                const instances = expressions.map((i) =>
                    i.replace(
                        /^\{([^}]+)\}\[([a-z,]+)\]$/,
                        ["+", "-", "*", "/"].some((o) => i.includes(o)) ? "($1)[$2]" : "$1[$2]"
                    )
                );

                const reassembled = instances.length === 1 ? instances[0] : `{${instances.join(",")}}`;
                return withoutLabel.replace(formula, reassembled);
            }

            return match;
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
