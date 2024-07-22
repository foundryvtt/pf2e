import type { DiceTerm } from "./dice-term.d.ts";

/** Define a two-sided coin term that can be used as part of a Roll formula */
export class Coin extends DiceTerm<CoinData> {
    constructor(termData: CoinData);

    static override DENOMINATION: "c";

    static override MODIFIERS: {
        c: "call";
    };

    override roll({ minimize, maximize }?: { minimize?: boolean; maximize?: boolean }): DiceTermResult;

    override getResultLabel(result: object): string;

    override getResultCSS(result: object): string[];

    /* -------------------------------------------- */
    /*  Term Modifiers                              */
    /* -------------------------------------------- */

    /**
     * Call the result of the coin flip, marking any coins that matched the called target as a success
     * 3dcc1      Flip 3 coins and treat "heads" as successes
     * 2dcc0      Flip 2 coins and treat "tails" as successes
     * @param modifier The matched modifier query
     */
    call(modifier: string): void;
}

declare global {
    interface CoinData extends DiceTermData {
        faces: 2;
    }
}
