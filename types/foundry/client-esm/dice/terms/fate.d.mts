import { DiceTerm } from "./dice.mjs";

/**
 * Define a three-sided Fate/Fudge dice term that can be used as part of a Roll formula
 * Mathematically behaves like 1d3-2
 */
export class FateDie extends DiceTerm {
    constructor(termData: DiceTermData);

    static override DENOMINATION: "f";

    static override MODIFIERS: {
        r: "reroll";
        rr: "rerollRecursive";
        k: "keep";
        kh: "keep";
        kl: "keep";
        d: "drop";
        dh: "drop";
        dl: "drop";
    };

    override roll({ minimize, maximize }?: { minimize?: boolean; maximize?: boolean }): DiceTermResult;

    override getResultLabel<T extends DiceTermResult>(
        result: DiceTermResult,
    ): T["result"] extends -1 ? "-" : T extends 0 ? "&nbsp;" : T extends 1 ? "+" : never;
}

interface FateDie extends DiceTerm {
    faces: 3;
}
