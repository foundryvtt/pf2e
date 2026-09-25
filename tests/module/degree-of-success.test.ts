import type { ActorPF2e } from "@actor";
import {
    DEGREE_ADJUSTMENT_AMOUNTS,
    DegreeOfSuccess,
    DegreeOfSuccessAdjustment,
    extractDegreeOfSuccessAdjustments,
    getIncapacitationAdjustment,
} from "@system/degree-of-success.ts";

describe("test degree of success rules", () => {
    test("normal degrees of success", () => {
        expect(new DegreeOfSuccess({ dieValue: 10, modifier: 21 }, 21).value).toBe(DegreeOfSuccess.CRITICAL_SUCCESS);
        expect(new DegreeOfSuccess({ dieValue: 10, modifier: 11 }, 21).value).toBe(DegreeOfSuccess.SUCCESS);
        expect(new DegreeOfSuccess({ dieValue: 10, modifier: 10 }, 21).value).toBe(DegreeOfSuccess.FAILURE);
        expect(new DegreeOfSuccess({ dieValue: 10, modifier: 1 }, 21).value).toBe(DegreeOfSuccess.CRITICAL_FAILURE);
    });

    test("1 should make it one degree worse", () => {
        expect(new DegreeOfSuccess({ dieValue: 1, modifier: 20 }, 10).value).toBe(DegreeOfSuccess.SUCCESS);
        expect(new DegreeOfSuccess({ dieValue: 1, modifier: 20 }, 21).value).toBe(DegreeOfSuccess.FAILURE);
        expect(new DegreeOfSuccess({ dieValue: 1, modifier: 19 }, 21).value).toBe(DegreeOfSuccess.CRITICAL_FAILURE);
        expect(new DegreeOfSuccess({ dieValue: 1, modifier: 10 }, 21).value).toBe(DegreeOfSuccess.CRITICAL_FAILURE);
    });

    test("20 should make it one degree better", () => {
        expect(new DegreeOfSuccess({ dieValue: 20, modifier: 21 }, 31).value).toBe(DegreeOfSuccess.CRITICAL_SUCCESS);
        expect(new DegreeOfSuccess({ dieValue: 20, modifier: 11 }, 31).value).toBe(DegreeOfSuccess.CRITICAL_SUCCESS);
        expect(new DegreeOfSuccess({ dieValue: 20, modifier: 10 }, 31).value).toBe(DegreeOfSuccess.SUCCESS);
        expect(new DegreeOfSuccess({ dieValue: 20, modifier: 1 }, 31).value).toBe(DegreeOfSuccess.FAILURE);
    });
});

describe("degree adjustments interact with natural 20s and each other", () => {
    const toSuccess = { label: "test", amount: DEGREE_ADJUSTMENT_AMOUNTS.TO_SUCCESS };

    test("per-outcome to-success leaves a natural-20 critical success intact", () => {
        const adjustments = { failure: toSuccess, criticalFailure: toSuccess };
        expect(new DegreeOfSuccess({ dieValue: 20, modifier: 5 }, 30, adjustments).value).toBe(DegreeOfSuccess.SUCCESS);
        expect(new DegreeOfSuccess({ dieValue: 20, modifier: 1 }, 30, adjustments).value).toBe(DegreeOfSuccess.SUCCESS);
        expect(new DegreeOfSuccess({ dieValue: 20, modifier: 10 }, 20, adjustments).value).toBe(
            DegreeOfSuccess.CRITICAL_SUCCESS,
        );
    });

    test("all: to-success downgrades a natural-20 critical success", () => {
        expect(new DegreeOfSuccess({ dieValue: 20, modifier: 10 }, 20, { all: toSuccess }).value).toBe(
            DegreeOfSuccess.SUCCESS,
        );
    });

    test("an all key beats a specific-outcome key", () => {
        const worse = { label: "test", amount: DEGREE_ADJUSTMENT_AMOUNTS.LOWER };
        const better = { label: "test", amount: DEGREE_ADJUSTMENT_AMOUNTS.INCREASE };
        const degree = new DegreeOfSuccess({ dieValue: 10, modifier: 10 }, 20, { success: better, all: worse });
        expect(degree.value).toBe(DegreeOfSuccess.FAILURE);
        expect(degree.adjustment?.amount).toBe(DEGREE_ADJUSTMENT_AMOUNTS.LOWER);
    });
});

describe("incapacitation trait adjustment", () => {
    test("higher-level target saves one degree better", () => {
        const adjustment = getIncapacitationAdjustment({
            checkType: "saving-throw",
            effectLevel: 6,
            selfLevel: 7,
            targetLevel: null,
        });
        expect(adjustment?.adjustments.all?.amount).toBe(DEGREE_ADJUSTMENT_AMOUNTS.INCREASE);
        expect(adjustment?.adjustments.all?.label).toBe("PF2E.TraitIncapacitation");
    });

    test("equal-level target saves normally", () => {
        expect(
            getIncapacitationAdjustment({ checkType: "saving-throw", effectLevel: 6, selfLevel: 6, targetLevel: null }),
        ).toBeNull();
    });

    test("checks against a higher-level target get one degree worse", () => {
        for (const checkType of ["attack-roll", "spell-attack-roll", "skill-check"]) {
            const adjustment = getIncapacitationAdjustment({ checkType, effectLevel: 6, selfLevel: 3, targetLevel: 7 });
            expect(adjustment?.adjustments.all?.amount).toBe(DEGREE_ADJUSTMENT_AMOUNTS.LOWER);
        }
        expect(
            getIncapacitationAdjustment({ checkType: "attack-roll", effectLevel: 6, selfLevel: 3, targetLevel: 6 }),
        ).toBeNull();
        expect(
            getIncapacitationAdjustment({
                checkType: "perception-check",
                effectLevel: 6,
                selfLevel: 3,
                targetLevel: 7,
            }),
        ).toBeNull();
    });
});

function fakeActor(data: {
    self?: Record<string, DegreeOfSuccessAdjustment[]>;
    origin?: Record<string, DegreeOfSuccessAdjustment[]>;
    target?: Record<string, DegreeOfSuccessAdjustment[]>;
    options?: string[];
    copied?: string[];
}): ActorPF2e {
    const copied = Object.fromEntries((data.copied ?? []).map((o) => [o, true]));
    return {
        _source: { flags: { pf2e: { rollOptions: { all: copied } } } },
        synthetics: {
            degreeOfSuccessAdjustments: data.self ?? {},
            opposingDegreeOfSuccessAdjustments: { origin: data.origin ?? {}, target: data.target ?? {} },
        },
        getRollOptions: (domains: string[]) => [...(data.options ?? []), ...domains.map((d) => `domain:${d}`)],
    } as unknown as ActorPF2e;
}

const better: DegreeOfSuccessAdjustment = {
    slug: "better",
    adjustments: { all: { label: "better", amount: DEGREE_ADJUSTMENT_AMOUNTS.INCREASE } },
};
const worse: DegreeOfSuccessAdjustment = {
    slug: "worse",
    adjustments: { all: { label: "worse", amount: DEGREE_ADJUSTMENT_AMOUNTS.LOWER } },
};

describe("extractDegreeOfSuccessAdjustments", () => {
    test("the roller's own adjustments are collected across domains, opposing buckets ignored", () => {
        const self = fakeActor({ self: { "attack-roll": [better] }, origin: { "attack-roll": [worse] } });
        const result = extractDegreeOfSuccessAdjustments({ selfRole: "origin", self, domains: ["all", "attack-roll"] });
        expect(result).toEqual([better]);
    });

    test("the opposer's self-side adjustments never apply to checks against it", () => {
        const self = fakeActor({});
        const opposer = fakeActor({ self: { "attack-roll": [worse] } });
        expect(
            extractDegreeOfSuccessAdjustments({ selfRole: "origin", self, opposer, domains: ["attack-roll"] }),
        ).toEqual([]);
    });

    test("opposer adjustments come last and carry the opposer's perspective options", () => {
        const self = fakeActor({ self: { "attack-roll": [better] } });
        const opposer = fakeActor({
            origin: { "attack-roll": [worse] },
            options: ["self:trait:undead", "origin:trait:elf"],
        });
        const result = extractDegreeOfSuccessAdjustments({
            selfRole: "origin",
            self,
            opposer,
            domains: ["attack-roll", "attack-roll"],
            options: ["self:trait:elf", "target:trait:undead", "item:trait:agile", "check:type:attack-roll"],
        });
        expect(result.map((a) => a.slug)).toEqual(["better", "worse"]);
        expect(result[0].options).toBeUndefined();
        const options = result[1].options;
        expect(options).toBeInstanceOf(Set);
        expect(options).toContain("self:trait:undead");
        expect(options).toContain("origin:trait:elf");
        expect(options).toContain("domain:attack-roll");
        expect(options).toContain("item:trait:agile");
        expect(options).toContain("check:type:attack-roll");
        expect(options).not.toContain("self:trait:elf");
        expect(options).not.toContain("target:trait:undead");
    });

    test("perspective options copied from the roller into the opposer clone are dropped", () => {
        const opposer = fakeActor({
            origin: { "attack-roll": [worse] },
            options: ["self:action:slug:strike", "self:trait:humanoid", "self:mark:prey", "origin:enemy", "melee"],
            copied: ["self:action:slug:strike", "self:mark:prey", "origin:enemy", "melee"],
        });
        const [, opposerEntry] = extractDegreeOfSuccessAdjustments({
            selfRole: "origin",
            self: fakeActor({ self: { "attack-roll": [better] } }),
            opposer,
            domains: ["attack-roll"],
            options: ["self:action:slug:strike", "self:trait:humanoid", "target:mark:prey", "melee"],
        });
        const options = opposerEntry.options;
        // Copied from the roller and prefixed: wrong perspective
        expect(options).not.toContain("self:action:slug:strike");
        // The opposer's own option, even though the roller has the same one
        expect(options).toContain("self:trait:humanoid");
        // Copied by the roll context from the opposer's perspective, absent from the roller's set
        expect(options).toContain("self:mark:prey");
        expect(options).toContain("origin:enemy");
        // Unprefixed options are perspective-neutral
        expect(options).toContain("melee");
    });

    test("an opposer's adjustments apply only to a roller in the matching role", () => {
        const opposer = fakeActor({ origin: { "saving-throw": [better] }, target: { "saving-throw": [worse] } });
        const self = fakeActor({});
        const asTarget = extractDegreeOfSuccessAdjustments({
            self,
            selfRole: "target",
            opposer,
            domains: ["saving-throw"],
        });
        expect(asTarget.map((a) => a.slug)).toEqual(["worse"]);
        const asOrigin = extractDegreeOfSuccessAdjustments({
            self,
            selfRole: "origin",
            opposer,
            domains: ["saving-throw"],
        });
        expect(asOrigin.map((a) => a.slug)).toEqual(["better"]);
    });
});
