import { PredicatePF2e } from "@system/predication.ts";

describe("Predication with string atomics returns correct results", () => {
    test("conjunctions of atomic statements", () => {
        const predicate = new PredicatePF2e("foo", "bar", "baz");
        expect(predicate.test(["foo"])).toEqual(false);
        expect(predicate.test(["foo", "bar"])).toEqual(false);
        expect(predicate.test(["foo", "bar", "baz"])).toEqual(true);
    });

    test("disjunctions of atomic statements", () => {
        const predicate = new PredicatePF2e({ or: ["foo", "bar", "baz"] });
        expect(predicate.test(["foo"])).toEqual(true);
        expect(predicate.test(["foo", "bar"])).toEqual(true);
        expect(predicate.test(["foo", "bar", "baz"])).toEqual(true);
        expect(predicate.test([])).toEqual(false);
    });

    test("joint denials of atomic statements", () => {
        const predicate = new PredicatePF2e({ nor: ["foo", "bar", "baz"] });
        expect(predicate.test(["foo"])).toEqual(false);
        expect(predicate.test(["foo", "bar"])).toEqual(false);
        expect(predicate.test(["foo", "bar", "baz"])).toEqual(false);
        expect(predicate.test([])).toEqual(true);
        expect(predicate.test(["bat"])).toEqual(true);
    });
});

describe("Predication with numeric-comparison atomics returns correct results", () => {
    test("simple greater-than", () => {
        const predicate = new PredicatePF2e({ gt: ["foo", 2] });
        expect(predicate.test(["foo:1"])).toEqual(false);
        expect(predicate.test(["foo:2"])).toEqual(false);
        expect(predicate.test(["foo:3"])).toEqual(true);
        expect(predicate.test(["foo"])).toEqual(false);
        expect(predicate.test([])).toEqual(false);
    });

    test("simple less-than", () => {
        const predicate = new PredicatePF2e({ lt: ["foo", 2] });
        expect(predicate.test(["foo:1"])).toEqual(true);
        expect(predicate.test(["foo:2"])).toEqual(false);
        expect(predicate.test(["foo:3"])).toEqual(false);
        expect(predicate.test(["foo"])).toEqual(false);
        expect(predicate.test([])).toEqual(false);
    });

    test("greater-than, less-than", () => {
        const predicate = new PredicatePF2e({ gt: ["foo", 2] }, { lt: ["bar", 2] });
        expect(predicate.test(["foo:1", "bar:3"])).toEqual(false);
        expect(predicate.test(["foo:2", "bar:2"])).toEqual(false);
        expect(predicate.test(["foo:3", "bar:1"])).toEqual(true);
    });

    test("greater-than-or-equal-to, less-than-or-equal-to", () => {
        const predicate = new PredicatePF2e({ gte: ["foo", 3] }, { lte: ["bar", 3] });
        expect(predicate.test(["foo:1", "bar:4"])).toEqual(false);
        expect(predicate.test(["foo:2", "bar:3"])).toEqual(false);
        expect(predicate.test(["foo:3", "bar:3"])).toEqual(true);
        expect(predicate.test(["foo:3", "bar:2"])).toEqual(true);
        expect(predicate.test(["foo:4", "bar:1"])).toEqual(true);
    });

    test("greater-than with two strings", () => {
        const predicate = new PredicatePF2e({ gt: ["self:level", "target:level"] });
        expect(predicate.test(["self:level:1", "target:level:-1"])).toEqual(true);
        expect(predicate.test(["self:level:1", "target:level:1"])).toEqual(false);
        expect(predicate.test(["self:level:1", "target:level:2"])).toEqual(false);
        expect(predicate.test(["self:level:2", "target:level:1"])).toEqual(true);
    });

    test("less-than-or-equal-to with two strings", () => {
        const predicate = new PredicatePF2e({ lte: ["self:level", "target:level"] });
        expect(predicate.test(["self:level:1", "target:level:1"])).toEqual(true);
        expect(predicate.test(["self:level:1", "target:level:2"])).toEqual(true);
        expect(predicate.test(["self:level:2", "target:level:1"])).toEqual(false);
    });

    test("less-than-or-equal-to without matching value pair", () => {
        const predicate = new PredicatePF2e({ lte: ["self:level", "target:level"] });
        expect(predicate.test([])).toEqual(false);
        expect(predicate.test(["self:level:1"])).toEqual(false);
        expect(predicate.test(["self:level:1", "foo:2"])).toEqual(false);
        expect(predicate.test(["self:level:1", "target:lebel:2"])).toEqual(false);
        expect(predicate.test(["self:level:1", "target:level:2"])).toEqual(true);
    });
});

describe("Predication with conjunction and negation returns correct results", () => {
    test("conjunction operator", () => {
        const predicate = new PredicatePF2e({ and: ["foo", "bar", "baz"] });
        expect(predicate.test(["foo"])).toEqual(false);
        expect(predicate.test(["foo", "bar"])).toEqual(false);
        expect(predicate.test(["foo", "bar", "baz"])).toEqual(true);
        expect(predicate.test(["bar", "baz"])).toEqual(false);
        expect(predicate.test(["baz"])).toEqual(false);
        expect(predicate.test([])).toEqual(false);
    });

    test("negation operator nested in conjunction operator", () => {
        const predicate = new PredicatePF2e({ and: ["foo", "bar", { not: "baz" }] });
        expect(predicate.test(["foo"])).toEqual(false);
        expect(predicate.test(["foo", "bar"])).toEqual(true);
        expect(predicate.test(["foo", "bar", "baz"])).toEqual(false);
        expect(predicate.test(["baz"])).toEqual(false);
        expect(predicate.test([])).toEqual(false);
    });

    test("conjunction operator nested in disjunction operator", () => {
        const predicate = new PredicatePF2e({ or: ["foo", { and: ["bar", "baz"] }] });
        expect(predicate.test(["foo"])).toEqual(true);
        expect(predicate.test(["foo", "bar"])).toEqual(true);
        expect(predicate.test(["foo", "bar", "baz"])).toEqual(true);
        expect(predicate.test(["bar"])).toEqual(false);
        expect(predicate.test(["baz"])).toEqual(false);
        expect(predicate.test([])).toEqual(false);
    });

    test("conjunction and negation operators nested in joint-denial operator", () => {
        const predicate = new PredicatePF2e({ nor: ["foo", { and: ["bar", "baz"] }] });
        expect(predicate.test(["foo"])).toEqual(false);
        expect(predicate.test(["bar"])).toEqual(true);
        expect(predicate.test(["baz"])).toEqual(true);
        expect(predicate.test(["bar", "baz"])).toEqual(false);
        expect(predicate.test(["foo", "bar", "baz"])).toEqual(false);
    });
});

describe("Simple disjunction returns correct results", () => {
    test("single disjunction operator", () => {
        const predicate = new PredicatePF2e({ or: ["foo", "bar", "baz"] });
        expect(predicate.test(["foo"])).toEqual(true);
        expect(predicate.test(["foo", "bar"])).toEqual(true);
        expect(predicate.test(["foo", "bar", "baz"])).toEqual(true);
        expect(predicate.test(["bar", "baz"])).toEqual(true);
        expect(predicate.test(["baz"])).toEqual(true);
        expect(predicate.test([])).toEqual(false);
    });

    test("conjunction of disjunction and negation", () => {
        const predicate = new PredicatePF2e({ and: [{ or: ["foo", "bar", { not: "baz" }] }] });
        expect(predicate.test(["foo"])).toEqual(true);
        expect(predicate.test(["bar", "bar"])).toEqual(true);
        expect(predicate.test(["foo", "bar"])).toEqual(true);
        expect(predicate.test(["foo", "bar", "baz"])).toEqual(true);
        expect(predicate.test(["baz"])).toEqual(false);
        expect(predicate.test(["baz", "bat"])).toEqual(false);
        expect(predicate.test([])).toEqual(true);
    });

    test("disjunction of disjunctions", () => {
        // same as { any: ["foo", "bar", "baz"] };
        const predicate = new PredicatePF2e({ or: ["foo", { or: ["bar", "baz"] }] });
        expect(predicate.test(["foo"])).toEqual(true);
        expect(predicate.test(["foo", "bar"])).toEqual(true);
        expect(predicate.test(["foo", "bar", "baz"])).toEqual(true);
        expect(predicate.test(["bar"])).toEqual(true);
        expect(predicate.test(["baz"])).toEqual(true);
        expect(predicate.test([])).toEqual(false);
    });

    test("joint denial of disjunction", () => {
        // same as { not: ["foo", "bar", "baz"] };
        const predicate = new PredicatePF2e({ nor: [{ or: ["foo", "bar", "baz"] }] });
        expect(predicate.test(["foo"])).toEqual(false);
        expect(predicate.test(["foo", "bar"])).toEqual(false);
        expect(predicate.test(["foo", "bar", "baz"])).toEqual(false);
        expect(predicate.test([])).toEqual(true);
    });
});

describe("Predication with joint denial returns correct results", () => {
    test("simple joint denial", () => {
        const predicate = new PredicatePF2e({ nor: ["foo", "bar", "baz"] });
        expect(predicate.test(["foo"])).toEqual(false);
        expect(predicate.test(["foo", "bar"])).toEqual(false);
        expect(predicate.test(["foo", "bar", "baz"])).toEqual(false);
        expect(predicate.test(["bar", "baz"])).toEqual(false);
        expect(predicate.test(["baz"])).toEqual(false);
        expect(predicate.test([])).toEqual(true);
        expect(predicate.test(["bat"])).toEqual(true);
    });

    test("joint denial with compound operand", () => {
        const predicate = new PredicatePF2e({ nor: ["foo", { and: ["bar", "baz"] }] });
        expect(predicate.test(["foo"])).toEqual(false);
        expect(predicate.test(["foo", "bar"])).toEqual(false);
        expect(predicate.test(["foo", "bar", "baz"])).toEqual(false);
        expect(predicate.test(["bar", "baz"])).toEqual(false);
        expect(predicate.test(["baz"])).toEqual(true);
        expect(predicate.test([])).toEqual(true);
        expect(predicate.test(["bat"])).toEqual(true);
    });
});

describe("Predication with exclusive disjunction returns correct results", () => {
    test("simple exclusive disjunction", () => {
        const predicate = new PredicatePF2e({ xor: ["foo", "bar", "baz"] });
        expect(predicate.test(["foo"])).toEqual(true);
        expect(predicate.test(["foo", "bar"])).toEqual(false);
        expect(predicate.test(["foo", "bar", "baz"])).toEqual(false);
        expect(predicate.test(["bar", "baz"])).toEqual(false);
        expect(predicate.test(["baz"])).toEqual(true);
        expect(predicate.test([])).toEqual(false);
        expect(predicate.test(["bat"])).toEqual(false);
        expect(predicate.test(["bar", "bat"])).toEqual(true);
    });

    test("exclusive disjunction with compound operand", () => {
        const predicate = new PredicatePF2e({ xor: ["foo", { or: ["bar", "baz"] }] });
        expect(predicate.test(["foo"])).toEqual(true);
        expect(predicate.test(["foo", "bar"])).toEqual(false);
        expect(predicate.test(["foo", "bar", "baz"])).toEqual(false);
        expect(predicate.test(["bar", "baz"])).toEqual(true);
        expect(predicate.test(["baz"])).toEqual(true);
        expect(predicate.test([])).toEqual(false);
    });

    test("tautological and contradictory exclusive disjunction", () => {
        const tautology = new PredicatePF2e({ xor: ["foo", { not: "foo" }] });
        expect(tautology.test(["foo"])).toEqual(true);
        expect(tautology.test([])).toEqual(true);
        expect(tautology.test(["bar"])).toEqual(true);

        const contradiction1 = new PredicatePF2e({ xor: ["foo", "foo"] });
        expect(contradiction1.test(["foo"])).toEqual(false);
        expect(contradiction1.test(["bar"])).toEqual(false);
        expect(contradiction1.test([])).toEqual(false);

        const contradiction2 = new PredicatePF2e({ xor: ["foo", { or: ["foo", "foo"] }] });
        expect(contradiction2.test(["foo"])).toEqual(false);
        expect(contradiction2.test(["bar"])).toEqual(false);
        expect(contradiction2.test(["foo", "bar"])).toEqual(false);
        expect(contradiction2.test([])).toEqual(false);
    });
});

describe("Predication with material conditional and negation return correct results", () => {
    test("simple material conditional", () => {
        const predicate = new PredicatePF2e({ if: "foo", then: "bar" });
        expect(predicate.test(["foo"])).toEqual(false);
        expect(predicate.test(["foo", "bar"])).toEqual(true);
        expect(predicate.test(["bar"])).toEqual(true);
        expect(predicate.test(["bar", "baz"])).toEqual(true);
        expect(predicate.test([])).toEqual(true);
    });

    test("material conditional and negation", () => {
        const predicate = new PredicatePF2e({ if: "foo", then: { not: "bar" } });
        expect(predicate.test(["foo"])).toEqual(true);
        expect(predicate.test(["foo", "bar"])).toEqual(false);
        expect(predicate.test(["bar"])).toEqual(true);
        expect(predicate.test(["bar", "baz"])).toEqual(true);
        expect(predicate.test([])).toEqual(true);
    });

    test("dijunction of material conditional and negation", () => {
        const predicate = new PredicatePF2e({
            or: [
                { if: "foo", then: { not: "bar" } },
                { if: "bar", then: { not: "foo" } },
            ],
        });
        expect(predicate.test(["foo"])).toEqual(true);
        expect(predicate.test(["foo", "bar"])).toEqual(false);
        expect(predicate.test(["bar"])).toEqual(true);
        expect(predicate.test(["bar", "baz"])).toEqual(true);
        expect(predicate.test([])).toEqual(true);
    });
});

describe("Tautological propositions pass all predicate tests", () => {
    test("p or not p", () => {
        const predicate = new PredicatePF2e({ or: ["foo", { not: "foo" }] });
        expect(predicate.test(["foo"])).toEqual(true);
        expect(predicate.test([])).toEqual(true);
        expect(predicate.test(["bar"])).toEqual(true);
        expect(predicate.test(["bar", "baz"])).toEqual(true);
        expect(predicate.test([])).toEqual(true);
    });

    test("if p then p", () => {
        const predicate = new PredicatePF2e({ if: "foo", then: "foo" });
        expect(predicate.test(["foo"])).toEqual(true);
        expect(predicate.test([])).toEqual(true);
        expect(predicate.test(["bar"])).toEqual(true);
        expect(predicate.test(["bar", "baz"])).toEqual(true);
        expect(predicate.test([])).toEqual(true);
    });
});

describe("Contradictory propositions fail all predicate tests", () => {
    test("p and not p", () => {
        const predicate = new PredicatePF2e("foo", { not: "foo" });
        expect(predicate.test(["foo"])).toEqual(false);
        expect(predicate.test([])).toEqual(false);
        expect(predicate.test(["bar"])).toEqual(false);
        expect(predicate.test(["bar", "baz"])).toEqual(false);
        expect(predicate.test([])).toEqual(false);
    });

    test("p; if p then not p", () => {
        const predicate = new PredicatePF2e("foo", { if: "foo", then: { not: "foo" } });
        expect(predicate.test(["foo"])).toEqual(false);
        expect(predicate.test([])).toEqual(false);
        expect(predicate.test(["bar"])).toEqual(false);
        expect(predicate.test(["bar", "baz"])).toEqual(false);
        expect(predicate.test([])).toEqual(false);
    });

    test("p; if p then q; if q then not p", () => {
        const predicate = new PredicatePF2e("foo", { if: "foo", then: "bar" }, { if: "bar", then: { not: "foo" } });
        expect(predicate.test(["foo"])).toEqual(false);
        expect(predicate.test([])).toEqual(false);
        expect(predicate.test(["bar"])).toEqual(false);
        expect(predicate.test(["bar", "baz"])).toEqual(false);
        expect(predicate.test([])).toEqual(false);
    });
});
