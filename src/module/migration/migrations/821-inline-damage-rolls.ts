import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Update damage roll links to be formatted to new standard */
export class Migration821InlineDamageRolls extends MigrationBase {
    static override version = 0.821;

    // [[/r {2}[splash,negative]]]
    // [[/br {2}[splash,negative]]]
    // [[/r {2}[splash, negative]]]
    // [[/r {2d4}[splash,negative]]]
    // [[/r {2}[splash,negative] #Tag]]
    // [[/r {2d4}[splash,negative] #Tag]]
    // [[/r {2}[splash,negative]]]{Label}
    // [[/r {2}[splash,negative] #Tag]]{Label}
    #splashPattern1 = /\[\[(\/b?r)\s*{([^}]*)}\[splash,\s*([^\]]*)\]\s*(#[^\]]*)?\]\]/g;

    // [[/r 2[splash,negative]]]
    // [[/br 2[splash,negative]]]
    // [[/r 2[splash, negative]]]
    // [[/r 2d4[splash,negative]]]
    // [[/r 2[splash,negative] #Tag]]
    // [[/r 2d4[splash,negative] #Tag]]
    // [[/r 2[splash,negative]]]{Label}
    // [[/r 2[splash,negative] #Tag]]{Label}
    #splashPattern2 = /\[\[(\/b?r)\s*([^[]*)\[splash,\s*([^\]]*)\]\s*(#[^\]]*)?\]\]/g;

    // [[/r {2}[slashing]]]
    // [[/r {2}[slashing] #Tag]]
    // [[/br {2d4}[slashing]]]
    #damagePatternSingle = /\[\[(\/b?r)\s*{([^}]*)}\[\s*([^\]]*)\]\s*(#[^\]]*)?\]\]/g;

    // [[/r {1d6}[piercing] + {2}[poison] #Beak]]
    #damagePatternPair = /\[\[(\/b?r)\s*{([^}]*)}\[\s*([^\]]*)\]\s*[+,]\s*{([^}]*)}\[\s*([^\]]*)\]\s*(#[^\]]*)?\]\]/g;

    #cleanFormula(formula: string): string {
        formula = formula.replace(/\s+/g, "");
        return ["+", "-", "*", "/"].some((o) => formula.includes(o)) ? `(${formula})` : formula;
    }

    #buildSplashFormula(roll: string, formula: string, damage: string, tag?: string): string {
        formula = this.#cleanFormula(formula);
        damage = damage.trim();
        tag = tag?.trim() ?? "";

        if (tag.length > 0) {
            return `[[${roll} (${formula}[splash])[${damage}] ${tag}]]`;
        } else {
            return `[[${roll} (${formula}[splash])[${damage}]]]`;
        }
    }

    #buildDamageFormula(roll: string, parts: DamagePart[], tag?: string): string {
        tag = tag?.trim() ?? "";

        if (parts.length === 1) {
            const formula = this.#cleanFormula(parts[0].formula);
            const damage = parts[0].damage.trim();

            if (tag.length > 0) {
                return `[[${roll} ${formula}[${damage}] ${tag}]]`;
            } else {
                return `[[${roll} ${formula}[${damage}]]]`;
            }
        } else if (parts.length > 1) {
            const assembled = parts
                .map((p) => {
                    const formula = this.#cleanFormula(p.formula);
                    const damage = p.damage.trim();
                    return `${formula}[${damage}]`;
                })
                .join(",");

            if (tag.length > 0) {
                return `[[${roll} {${assembled}} ${tag}]]`;
            } else {
                return `[[${roll} {${assembled}}]]`;
            }
        } else {
            return "";
        }
    }

    #updateDamageFormula(text: string): string {
        text = text.replace(this.#splashPattern1, (_, roll: string, formula: string, damage: string, tag?: string) => {
            return this.#buildSplashFormula(roll, formula, damage, tag);
        });

        text = text.replace(this.#splashPattern2, (_, roll: string, formula: string, damage: string, tag?: string) => {
            return this.#buildSplashFormula(roll, formula, damage, tag);
        });

        text = text.replace(
            this.#damagePatternSingle,
            (_, roll: string, formula: string, damage: string, tag?: string) => {
                return this.#buildDamageFormula(roll, [{ formula, damage }], tag);
            }
        );

        text = text.replace(
            this.#damagePatternPair,
            (_, roll: string, formula1: string, damage1: string, formula2: string, damage2: string, tag?: string) => {
                return this.#buildDamageFormula(
                    roll,
                    [
                        { formula: formula1, damage: damage1 },
                        { formula: formula2, damage: damage2 },
                    ],
                    tag
                );
            }
        );

        return text;
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

interface DamagePart {
    formula: string;
    damage: string;
}
