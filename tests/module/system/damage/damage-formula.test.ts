import { DamageFormula } from "../../../../src/module/system/damage/damage-formula";
import { DamageTerm } from "@system/damage/damage-term";

describe("#toString", () => {
    let terms: DamageTerm[];

    function toString() {
        return new DamageFormula(terms).toString();
    }

    function term(data: any) {
        data.damageType ??= "slashing";
        terms.push(new DamageTerm(data));
    }

    beforeEach(() => {
        terms = [];
    });

    it("returns dice + modifier", () => {
        term({ dieSize: "d6", diceNumber: 2, modifier: 3 });
        expect(toString()).toEqual("2d6 + 3");
    });

    it("merges modifiers from different terms", () => {
        term({ modifier: 3 });
        term({ modifier: 4 });
        expect(toString()).toEqual("7");
    });

    it("merges dice from different terms", () => {
        term({ dieSize: "d6", diceNumber: 2 });
        term({ dieSize: "d6", diceNumber: 3 });
        term({ dieSize: "d4", diceNumber: 1 });
        expect(toString()).toEqual("5d6 + 1d4");
    });

    it("adds diceNumber to modifier if dieSize is missing", () => {
        term({ diceNumber: 2 });
        term({ diceNumber: 3 });
        expect(toString()).toEqual("5");
    });

    it("returns empty string when multiplier is 0", () => {
        term({ dieSize: "d6", diceNumber: 2, multiplier: 0 });
        expect(toString()).toEqual("");
    });

    it("returns double formula if multiplier is 2", () => {
        term({ dieSize: "d6", diceNumber: 2, multiplier: 2 });
        term({ dieSize: "d4", diceNumber: 1, multiplier: 2 });
        expect(toString()).toEqual("2 * (2d6 + 1d4)");
    });

    it("returns double formula if multiplier is 2", () => {
        term({ dieSize: "d6", diceNumber: 2, multiplier: 0.5 });
        expect(toString()).toEqual("0.5 * (2d6)");
    });

    it("returns formula with multiple multipliers", () => {
        term({ dieSize: "d6", diceNumber: 2, multiplier: 2 });
        term({ dieSize: "d4", diceNumber: 1, multiplier: 1 });
        expect(toString()).toEqual("2 * (2d6) + 1d4");
    });

    it("returns formula with negative modifiers", () => {
        term({ dieSize: "d6", diceNumber: 1 });
        term({ modifier: -3 });
        expect(toString()).toEqual("1d6 - 3");
    });
});
