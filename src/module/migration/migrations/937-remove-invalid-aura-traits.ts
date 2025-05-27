import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { actionTraits, effectTraits } from "@scripts/config/traits.ts";
import { MigrationBase } from "../base.ts";

export class Migration937RemoveInvalidAuraTraits extends MigrationBase {
    static override version = 0.937;

    static #_invalidTraits: Set<string> | null = null;

    /**
     * Computes and returns a list of all invalid traits.
     * Doing it this way avoids us accidentally removing homebrew effect traits.
     */
    static get #invalidTraits(): Set<string> {
        if (this.#_invalidTraits) return this.#_invalidTraits;
        this.#_invalidTraits = new Set(Object.keys(actionTraits).filter((t) => !(t in effectTraits)));
        return this.#invalidTraits;
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        for (const rule of source.system.rules) {
            if (
                !rule ||
                rule.key !== "Aura" ||
                !("traits" in rule) ||
                !Array.isArray(rule.traits) ||
                rule.traits.length === 0
            ) {
                continue;
            }

            const invalidTraits = Migration937RemoveInvalidAuraTraits.#invalidTraits;
            const newTraits = rule.traits.filter((t) => !invalidTraits.has(t));
            if (newTraits.length === 0) {
                delete rule.traits;
            } else if (newTraits.length !== rule.traits.length) {
                rule.traits = newTraits;
            }
        }
    }
}
