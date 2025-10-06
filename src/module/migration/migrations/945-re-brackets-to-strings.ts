import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Convert bracketed values into resolvable strings */
export class Migration945REBracketsToStrings extends MigrationBase {
    static override version = 0.945;

    #moveDamageDiceValue(rule: Record<string, unknown> & { value: unknown }): void {
        if (rule.key !== "DamageDice" || !R.isPlainObject(rule.value) || !Array.isArray(rule.value.brackets)) return;
        const brackets = rule.value.brackets;
        for (let i = 0; i < brackets.length; i++) {
            const bracket = brackets[i];
            if (R.isPlainObject(bracket) && R.isPlainObject(bracket.value)) {
                const key = Object.keys(bracket.value)[0];
                if (key) {
                    bracket.value = bracket.value[key];
                    rule[key] = rule.value;
                }
            }
        }
        delete rule.value;
    }

    #convertBracket(value: MysteryBracketedValue): string {
        const normalized: BracketedValue = {
            field: String(value.field ?? "actor|level"),
            brackets: value.brackets.map((mysteryBracket) => {
                const value = R.isPlainObject(mysteryBracket.value)
                    ? Object.keys(mysteryBracket.value)[0]
                    : mysteryBracket.value;
                if (typeof value !== "number" && typeof value !== "string") {
                    // No idea what this is
                    return {
                        value: JSON.stringify(value),
                        start: Number(mysteryBracket.start) || undefined,
                        end: Number(mysteryBracket.end) || undefined,
                    };
                }
                const correctedValue =
                    typeof value === "string" ? value.replace(/^\s*(@.+)(-)(\d)\s*$/, "$1$2 $3") : value;
                const bracket: Bracket = { value: correctedValue };
                if ("start" in mysteryBracket) bracket.start = Number(mysteryBracket.start) || 0;
                if ("end" in mysteryBracket) bracket.end = Number(mysteryBracket.end) || 0;
                return bracket;
            }),
        };
        const field =
            normalized.field === "item|system.level.value" ? "@item.level" : `@${normalized.field.replace("|", ".")}`;
        const whens = normalized.brackets.map((bracket) => {
            const { start, end } = bracket;
            const value =
                typeof bracket.value === "number" || (typeof bracket.value === "string" && bracket.value.includes("@"))
                    ? bracket.value
                    : JSON.stringify(bracket.value);
            if (typeof start === "number" && typeof end === "number") {
                return `when(btwn(${field}, ${start}, ${end}), ${value})`;
            }
            if (typeof start === "number") return `when(gte(${field}, ${start}), ${value})`;
            if (typeof end === "number") return `when(lte(${field}, ${end}), ${value})`;
            return value;
        });
        return `match(${whens.join(", ")})`;
    }

    #convertBrackets(outer: Record<string, unknown>): Record<string, unknown> {
        for (const [key, inner] of Object.entries(outer)) {
            if (R.isPlainObject(inner)) {
                if ("brackets" in inner && Array.isArray(inner.brackets)) {
                    outer[key] = this.#convertBracket(inner as MysteryBracketedValue);
                } else outer[key] = this.#convertBrackets(inner);
            } else if (Array.isArray(inner)) {
                // Battle forms
                outer[key] = inner.map((i) => (R.isPlainObject(i) ? this.#convertBrackets(i) : i));
            }
        }
        return outer;
    }

    #convertBattleFormBrackets(rule: RuleElementSource & { overrides?: unknown; value?: unknown; brackets?: object }) {
        if (R.isPlainObject(rule.overrides)) {
            for (const override of R.values(rule.overrides)) {
                if (Array.isArray(override)) {
                    for (const element of override) {
                        override.splice(override.indexOf(element), 1, this.#convertBrackets(element));
                    }
                }
            }
        }
        if (R.isPlainObject(rule.value)) {
            delete rule.value.field;
            if (Array.isArray(rule.value.brackets)) {
                for (const bracket of rule.value.brackets) {
                    if (R.isPlainObject(bracket)) delete bracket.end;
                }
                rule.brackets = rule.value.brackets;
            }
            delete rule.value;
        }
    }

    /** Update path to land base or derived speed in rule elements. */
    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        for (const rule of source.system.rules) {
            if (rule.key === "BattleForm") {
                this.#convertBattleFormBrackets(rule);
                continue;
            }
            if ("value" in rule && R.isPlainObject(rule.value)) this.#moveDamageDiceValue(rule);
            this.#convertBrackets(rule);
        }
    }
}

type MysteryBracketedValue = {
    field?: unknown;
    brackets: { start?: unknown; end?: unknown; value: unknown }[];
};

interface Bracket {
    start?: number;
    end?: number;
    value: string | number | object;
}

interface BracketedValue extends MysteryBracketedValue {
    field: string;
    brackets: Bracket[];
}
