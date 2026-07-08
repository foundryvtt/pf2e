import type { SaveType } from "@actor/types.ts";
import type { Statistic } from "@system/statistic/statistic.ts";
import { tupleHasValue } from "@util";
import type { CreaturePF2e } from "./document.ts";

/** A record of saving throws with convenience getters for derived data */
export class CreatureSaves {
    constructor(saves: Record<SaveType, Statistic<CreaturePF2e>>) {
        this.fortitude = saves.fortitude;
        this.reflex = saves.reflex;
        this.will = saves.will;
    }

    readonly fortitude: Statistic<CreaturePF2e>;

    readonly reflex: Statistic<CreaturePF2e>;

    readonly will: Statistic<CreaturePF2e>;

    /**
     * The highest saving throw factoring in only attribute modifier and proficiency bonus (or base in the case of NPCS)
     */
    get baseHighest(): Statistic {
        return [this.fortitude, this.reflex, this.will].reduce((highest, candidate) => {
            const candidateBase = this.#getBaseValue(candidate);
            const highestBase = this.#getBaseValue(highest);
            return candidateBase > highestBase ? candidate : highest;
        });
    }

    /**
     * The highest saving throw factoring in only attribute modifier and proficiency bonus (or base in the case of NPCS)
     */
    get baseLowest(): Statistic {
        return [this.fortitude, this.reflex, this.will].reduce((lowest, candidate) => {
            const candidateBase = this.#getBaseValue(candidate);
            const lowestBase = this.#getBaseValue(lowest);
            return candidateBase < lowestBase ? candidate : lowest;
        });
    }

    /**
     * Get the "base" value of a saving-throw statistic, or the sum of attribute modifier and proficiency bonus (or just
     * the "base"-slugged modifier in the case of NPCS).
     */
    #getBaseValue(statistic: Statistic): number {
        const baseTypes = ["ability", "proficiency"] as const;
        return statistic.modifiers.reduce(
            (b, m) => (tupleHasValue(baseTypes, m.type) || m.slug === "base" ? b + m.value : b),
            0,
        );
    }
}
