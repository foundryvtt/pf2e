import { DEGREE_OF_SUCCESS } from "@system/degree-of-success.ts";
import {
    bypass,
    calculate,
    concussive,
    immunity,
    instance,
    iwr,
    persistentInstance,
    resistance,
    weakness,
} from "./fixtures.ts";

describe("applied damage calculation", () => {
    describe("unaffected and immunities", () => {
        test("damage type the target is unaffected by is removed before weaknesses", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("vitality", 10)],
                    weaknesses: [weakness("vitality", 5)],
                    isAffectedBy: (type) => type !== "vitality",
                }),
            });

            expect(damage.applications).toEqual([{ category: "unaffected", type: "vitality", adjustment: -10 }]);
            expect(damage.finalDamage).toBe(0);
            expect(damage.updates["system.attributes.hp.value"]).toBe(30);
            expect(damage.totalApplied).toBe(0);
        });

        test("full immunity skips weaknesses and drops persistent damage of that type", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("fire", 10), persistentInstance("fire", "1d6")],
                    immunities: [immunity("fire")],
                    weaknesses: [weakness("fire", 5)],
                }),
            });

            expect(damage.applications).toEqual([
                { category: "immunity", type: "fire", adjustment: -10 },
                // The persistent instance's total is 0, so its immunity row is -1 * 0
                { category: "immunity", type: "fire", adjustment: -0 },
            ]);
            expect(damage.persistent).toEqual([]);
            expect(damage.finalDamage).toBe(0);
            expect(damage.updates["system.attributes.hp.value"]).toBe(30);
        });

        test("immunity to one instance leaves the other instance's weakness in place", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 8), instance("fire", 6)],
                    immunities: [immunity("fire")],
                    weaknesses: [weakness("slashing", 3)],
                }),
            });

            expect(damage.applications).toEqual([
                { category: "immunity", type: "fire", adjustment: -6 },
                { category: "weakness", type: "slashing", adjustment: 3 },
            ]);
            expect(damage.finalDamage).toBe(11);
            expect(damage.updates["system.attributes.hp.value"]).toBe(19);
            expect(damage.totalApplied).toBe(11);
        });
    });

    describe("persistent damage", () => {
        test("persistent damage is kept even when resistance negates the rest of the instance type", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("fire", 5), persistentInstance("fire", "1d6")],
                    resistances: [resistance("fire", 10)],
                }),
            });

            expect(damage.applications).toEqual([
                { category: "resistance", type: "fire", adjustment: -5, ignored: false },
            ]);
            expect(damage.persistent).toEqual([{ type: "fire", expression: "1d6" }]);
            expect(damage.finalDamage).toBe(0);
        });

        test("persistent-damage immunity drops only the persistent instance", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("fire", 5), persistentInstance("fire", "1d6")],
                    immunities: [immunity("persistent-damage")],
                }),
            });

            expect(damage.applications).toEqual([{ category: "immunity", type: "persistent-damage", adjustment: -0 }]);
            expect(damage.persistent).toEqual([]);
            expect(damage.finalDamage).toBe(5);
        });

        test("evaluated persistent damage goes through IWR and is not recorded again", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("fire", 4, { persistent: true, evaluatePersistent: true })],
                    resistances: [resistance("fire", 2)],
                }),
            });

            expect(damage.applications).toEqual([
                { category: "resistance", type: "fire", adjustment: -2, ignored: false },
            ]);
            expect(damage.persistent).toEqual([]);
            expect(damage.finalDamage).toBe(2);
        });
    });

    describe("weaknesses", () => {
        test("only the highest matching weakness applies", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 10)],
                    weaknesses: [weakness("slashing", 3), weakness("physical", 6)],
                }),
            });

            expect(damage.applications).toEqual([{ category: "weakness", type: "physical", adjustment: 6 }]);
            expect(damage.finalDamage).toBe(16);
        });

        test("precision and splash weaknesses compete with the main weakness instead of stacking", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 10, { precision: 4, splash: 2 })],
                    weaknesses: [weakness("slashing", 3), weakness("precision", 5), weakness("splash-damage", 2)],
                }),
            });

            expect(damage.applications).toEqual([{ category: "weakness", type: "precision", adjustment: 5 }]);
            expect(damage.finalDamage).toBe(15);
        });

        test("splash weakness needs splash damage", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 10)],
                    weaknesses: [weakness("splash-damage", 5)],
                }),
            });

            expect(damage.applications).toEqual([]);
            expect(damage.finalDamage).toBe(10);
        });

        test("precision weakness needs precision damage", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 10)],
                    weaknesses: [weakness("precision", 5)],
                }),
            });

            expect(damage.applications).toEqual([]);
            expect(damage.finalDamage).toBe(10);
        });

        test("precision weakness with a matching exception does not apply", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 10, { precision: 4 })],
                    weaknesses: [
                        weakness("precision", 5, {
                            test: (statements) =>
                                [...statements].includes("damage:component:precision") &&
                                ![...statements].includes("item:rune:property:ghost-touch"),
                        }),
                    ],
                }),
                rollOptions: new Set(["item:rune:property:ghost-touch"]),
            });

            expect(damage.applications).toEqual([]);
            expect(damage.finalDamage).toBe(10);
        });

        test("apply-once weakness adds one row for the whole roll", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("bludgeoning", 4), instance("cold", 3)],
                    weaknesses: [weakness("water", 5, { applyOnce: true })],
                }),
                rollOptions: new Set(["item:trait:water"]),
            });

            expect(damage.applications).toEqual([{ category: "weakness", type: "water", adjustment: 5 }]);
            expect(damage.finalDamage).toBe(12);
        });

        test("apply-once weakness is not triggered by unevaluated persistent damage alone", () => {
            const damage = calculate({
                result: iwr({
                    instances: [persistentInstance("fire", "1d6")],
                    weaknesses: [weakness("holy", 5, { applyOnce: true })],
                }),
                rollOptions: new Set(["item:trait:holy"]),
            });

            expect(damage.applications).toEqual([]);
            expect(damage.persistent).toEqual([{ type: "fire", expression: "1d6" }]);
            expect(damage.finalDamage).toBe(0);
        });

        test("apply-once weakness is triggered by evaluated persistent damage", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("fire", 4, { persistent: true, evaluatePersistent: true })],
                    weaknesses: [weakness("holy", 5, { applyOnce: true })],
                }),
                rollOptions: new Set(["item:trait:holy"]),
            });

            expect(damage.applications).toEqual([{ category: "weakness", type: "holy", adjustment: 5 }]);
            expect(damage.finalDamage).toBe(9);
        });
    });

    describe("critical hits", () => {
        test("critical-hits immunity undoes the doubling without being a full immunity", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 20, { critImmuneTotal: 10 })],
                    roll: { degreeOfSuccess: DEGREE_OF_SUCCESS.CRITICAL_SUCCESS },
                    immunities: [immunity("critical-hits")],
                    weaknesses: [weakness("slashing", 5)],
                }),
                rollOptions: new Set(["check:outcome:critical-success"]),
            });

            expect(damage.applications).toEqual([
                { category: "immunity", type: "critical-hits", adjustment: -10 },
                { category: "weakness", type: "slashing", adjustment: 5 },
            ]);
            expect(damage.finalDamage).toBe(15);
        });

        test("critical-hits immunity with a matching exception removes nothing", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 20, { critImmuneTotal: 10 })],
                    roll: { degreeOfSuccess: DEGREE_OF_SUCCESS.CRITICAL_SUCCESS },
                    immunities: [
                        immunity("critical-hits", {
                            test: (statements) =>
                                [...statements].includes("check:outcome:critical-success") &&
                                ![...statements].includes("item:rune:property:ghost-touch"),
                        }),
                    ],
                }),
                rollOptions: new Set(["check:outcome:critical-success", "item:rune:property:ghost-touch"]),
            });

            expect(damage.applications).toEqual([]);
            expect(damage.finalDamage).toBe(20);
        });

        test("on a normal success, critical-hits immunity and resistance do nothing", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 10)],
                    roll: { degreeOfSuccess: DEGREE_OF_SUCCESS.SUCCESS },
                    immunities: [immunity("critical-hits")],
                    resistances: [resistance("critical-hits", 5)],
                }),
                rollOptions: new Set(["check:outcome:success"]),
            });

            expect(damage.applications).toEqual([]);
            expect(damage.finalDamage).toBe(10);
        });

        test("precision immunity removes all precision damage when critical-hits immunity does not apply", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 20, { critImmuneTotal: 10, precision: 6 })],
                    roll: { degreeOfSuccess: DEGREE_OF_SUCCESS.CRITICAL_SUCCESS },
                    immunities: [immunity("precision")],
                }),
                rollOptions: new Set(["check:outcome:critical-success"]),
            });

            expect(damage.applications).toEqual([{ category: "immunity", type: "precision", adjustment: -6 }]);
            expect(damage.finalDamage).toBe(14);
        });

        test("precision immunity removes half the precision damage after critical-hits immunity", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 20, { critImmuneTotal: 10, precision: 6 })],
                    roll: { degreeOfSuccess: DEGREE_OF_SUCCESS.CRITICAL_SUCCESS },
                    immunities: [immunity("critical-hits"), immunity("precision")],
                }),
                rollOptions: new Set(["check:outcome:critical-success"]),
            });

            expect(damage.applications).toEqual([
                { category: "immunity", type: "critical-hits", adjustment: -10 },
                { category: "immunity", type: "precision", adjustment: -3 },
            ]);
            expect(damage.finalDamage).toBe(7);
        });

        test("critical-hits resistance reduces a critical hit", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 20, { critImmuneTotal: 10 })],
                    roll: { degreeOfSuccess: DEGREE_OF_SUCCESS.CRITICAL_SUCCESS },
                    resistances: [resistance("critical-hits", 5)],
                }),
                rollOptions: new Set(["check:outcome:critical-success"]),
            });

            expect(damage.applications).toEqual([
                { category: "resistance", type: "critical-hits", adjustment: -5, ignored: false },
            ]);
            expect(damage.finalDamage).toBe(15);
        });

        test("critical-hits resistance larger than the doubled part is not capped", () => {
            // Bug: The resistance also matches through the roll's outcome option, uncapped, and the larger value wins
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 20, { critImmuneTotal: 10 })],
                    roll: { degreeOfSuccess: DEGREE_OF_SUCCESS.CRITICAL_SUCCESS },
                    resistances: [resistance("critical-hits", 15)],
                }),
                rollOptions: new Set(["check:outcome:critical-success"]),
            });

            expect(damage.applications).toEqual([
                { category: "resistance", type: "critical-hits", adjustment: -15, ignored: false },
            ]);
            expect(damage.finalDamage).toBe(5);
        });
    });

    describe("resistances", () => {
        test("only the highest matching resistance applies", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 10)],
                    resistances: [resistance("slashing", 3), resistance("physical", 6)],
                }),
            });

            expect(damage.applications).toEqual([
                { category: "resistance", type: "physical", adjustment: -6, ignored: false },
            ]);
            expect(damage.finalDamage).toBe(4);
        });

        test("resistance is capped at remaining damage after weaknesses", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 4)],
                    weaknesses: [weakness("slashing", 2)],
                    resistances: [resistance("slashing", 10)],
                }),
            });

            expect(damage.applications).toEqual([
                { category: "weakness", type: "slashing", adjustment: 2 },
                { category: "resistance", type: "slashing", adjustment: -6, ignored: false },
            ]);
            expect(damage.finalDamage).toBe(0);
        });

        test("doubled-against uses getDoubledValue", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("fire", 12)],
                    resistances: [resistance("fire", 5, { getDoubledValue: () => 10 })],
                }),
            });

            expect(damage.applications).toEqual([
                { category: "resistance", type: "fire", adjustment: -10, ignored: false },
            ]);
            expect(damage.finalDamage).toBe(2);
        });

        test("all-damage resistance applies to each instance", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 8), instance("fire", 6)],
                    resistances: [resistance("all-damage", 5)],
                }),
            });

            expect(damage.applications).toEqual([
                { category: "resistance", type: "all-damage", adjustment: -5, ignored: false },
                { category: "resistance", type: "all-damage", adjustment: -5, ignored: false },
            ]);
            expect(damage.finalDamage).toBe(4);
        });

        test("physical resistance applies to bleed", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("bleed", 8)],
                    resistances: [resistance("physical", 5)],
                }),
            });

            expect(damage.applications).toEqual([
                { category: "resistance", type: "physical", adjustment: -5, ignored: false },
            ]);
            expect(damage.finalDamage).toBe(3);
        });

        test("precision resistance is capped at the precision amount", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 10, { precision: 4 })],
                    resistances: [resistance("precision", 10)],
                }),
            });

            expect(damage.applications).toEqual([
                { category: "resistance", type: "precision", adjustment: -4, ignored: false },
            ]);
            expect(damage.finalDamage).toBe(6);
        });

        test("precision resistance is skipped when precision immunity applies", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 10, { precision: 4 })],
                    immunities: [immunity("precision")],
                    resistances: [resistance("precision", 5)],
                }),
            });

            expect(damage.applications).toEqual([{ category: "immunity", type: "precision", adjustment: -4 }]);
            expect(damage.finalDamage).toBe(6);
        });

        test("precision resistance with a matching exception does not apply", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 10, { precision: 4 })],
                    resistances: [
                        resistance("precision", 5, {
                            test: (statements) =>
                                [...statements].includes("damage:component:precision") &&
                                ![...statements].includes("item:rune:property:ghost-touch"),
                        }),
                    ],
                }),
                rollOptions: new Set(["item:rune:property:ghost-touch"]),
            });

            expect(damage.applications).toEqual([]);
            expect(damage.finalDamage).toBe(10);
        });

        test("ignored resistance is logged and does not reduce damage", () => {
            const ignored = resistance("fire", 5);
            const damage = calculate({
                result: iwr({
                    instances: [instance("fire", 10)],
                    resistances: [ignored],
                    roll: { ignoredResistances: [ignored] },
                }),
            });

            expect(damage.applications).toEqual([
                { category: "resistance", type: "fire", adjustment: 0, ignored: true },
            ]);
            expect(damage.finalDamage).toBe(10);
        });

        test("ignoring a resistance on one instance does not ignore another instance", () => {
            const ignored = resistance("fire", 10);
            const damage = calculate({
                result: iwr({
                    instances: [instance("fire", 12), instance("slashing", 8)],
                    resistances: [ignored, resistance("slashing", 3)],
                    roll: { ignoredResistances: [ignored] },
                }),
            });

            expect(damage.applications).toEqual([
                { category: "resistance", type: "fire", adjustment: 0, ignored: true },
                { category: "resistance", type: "slashing", adjustment: -3, ignored: false },
            ]);
            expect(damage.finalDamage).toBe(17);
        });

        test("roll options can make a resistance apply", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 10)],
                    resistances: [resistance("holy", 5)],
                }),
                rollOptions: new Set(["item:trait:holy"]),
            });

            expect(damage.applications).toEqual([
                { category: "resistance", type: "holy", adjustment: -5, ignored: false },
            ]);
            expect(damage.finalDamage).toBe(5);
        });

        test("material on the instance can make a resistance apply", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 10, { materials: ["silver"] })],
                    resistances: [resistance("silver", 5)],
                }),
            });

            expect(damage.applications).toEqual([
                { category: "resistance", type: "silver", adjustment: -5, ignored: false },
            ]);
            expect(damage.finalDamage).toBe(5);
        });
    });

    describe("concussive and redirects", () => {
        test("piercing resistance is skipped when there is no bludgeoning resistance", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("piercing", 10)],
                    resistances: [resistance("piercing", 5)],
                    roll: { irRedirects: concussive() },
                }),
            });

            expect(damage.applications).toEqual([
                {
                    category: "resistance",
                    type: "piercing",
                    adjustment: -0,
                    ignored: false,
                    redirect: "bludgeoning",
                },
            ]);
            expect(damage.finalDamage).toBe(10);
        });

        test("redirects to a lower bludgeoning resistance", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("piercing", 10)],
                    resistances: [resistance("piercing", 5), resistance("bludgeoning", 3)],
                    roll: { irRedirects: concussive() },
                }),
            });

            expect(damage.applications).toEqual([
                {
                    category: "resistance",
                    type: "piercing",
                    adjustment: -3,
                    ignored: false,
                    redirect: "bludgeoning",
                },
            ]);
            expect(damage.finalDamage).toBe(7);
        });

        test("does not redirect to a higher bludgeoning resistance", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("piercing", 10)],
                    resistances: [resistance("piercing", 5), resistance("bludgeoning", 10)],
                    roll: { irRedirects: concussive() },
                }),
            });

            expect(damage.applications).toEqual([
                { category: "resistance", type: "piercing", adjustment: -5, ignored: false },
            ]);
            expect(damage.finalDamage).toBe(5);
        });

        test("does not redirect physical resistance", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("piercing", 10)],
                    resistances: [resistance("physical", 5)],
                    roll: { irRedirects: concussive() },
                }),
            });

            expect(damage.applications).toEqual([
                { category: "resistance", type: "physical", adjustment: -5, ignored: false },
            ]);
            expect(damage.finalDamage).toBe(5);
        });

        test("does not redirect to a type the target is immune to", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("piercing", 10)],
                    immunities: [immunity("bludgeoning")],
                    resistances: [resistance("piercing", 5)],
                    roll: { irRedirects: concussive() },
                }),
            });

            expect(damage.applications).toEqual([
                { category: "resistance", type: "piercing", adjustment: -5, ignored: false },
            ]);
            expect(damage.finalDamage).toBe(5);
        });

        test("resistance matching a redirected immunity does not apply", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("piercing", 10)],
                    immunities: [immunity("piercing")],
                    resistances: [resistance("piercing", 5)],
                    roll: { irRedirects: { immunities: [{ from: "piercing", to: "bludgeoning" }], resistances: [] } },
                }),
            });

            expect(damage.applications).toEqual([
                { category: "immunity", type: "piercing", adjustment: 0, redirect: "bludgeoning" },
            ]);
            expect(damage.finalDamage).toBe(10);
        });

        test("immunity redirect still applies a lower resistance to the new type", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("piercing", 10)],
                    immunities: [immunity("piercing")],
                    resistances: [resistance("piercing", 5), resistance("bludgeoning", 3)],
                    roll: { irRedirects: concussive() },
                }),
            });

            expect(damage.applications).toEqual([
                { category: "immunity", type: "piercing", adjustment: 0, redirect: "bludgeoning" },
                { category: "resistance", type: "bludgeoning", adjustment: -3, ignored: false },
            ]);
            expect(damage.finalDamage).toBe(7);
        });

        test("redirect target is chosen by testing the resistance, not its type", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("piercing", 10)],
                    resistances: [
                        resistance("piercing", 5),
                        resistance("bludgeoning", 3, {
                            test: (statements) =>
                                [...statements].includes("damage:type:bludgeoning") &&
                                ![...statements].includes("damage:category:physical"),
                        }),
                    ],
                    roll: { irRedirects: concussive() },
                }),
            });

            expect(damage.applications).toEqual([
                {
                    category: "resistance",
                    type: "piercing",
                    adjustment: -0,
                    ignored: false,
                    redirect: "bludgeoning",
                },
            ]);
            expect(damage.finalDamage).toBe(10);
        });
    });

    describe("totals and ordering", () => {
        test("roll raised to a minimum of 1 counts only its first instance as 1", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 0), instance("fire", 0)],
                    roll: { total: 1, increasedFrom: -3 },
                    weaknesses: [weakness("slashing", 2), weakness("fire", 2)],
                }),
            });

            expect(damage.applications).toEqual([{ category: "weakness", type: "slashing", adjustment: 2 }]);
            expect(damage.finalDamage).toBe(3);
            expect(damage.updates["system.attributes.hp.value"]).toBe(27);
        });

        test("finalDamage uses the roll total, not the sum of instance totals", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 10), instance("fire", 10)],
                    resistances: [resistance("slashing", 5)],
                    roll: { total: 15 },
                }),
            });

            expect(damage.applications).toEqual([
                { category: "resistance", type: "slashing", adjustment: -5, ignored: false },
            ]);
            expect(damage.finalDamage).toBe(10);
        });

        test("application rows sort by category, with hardness last", () => {
            // Potential Bug: applyIWR's application sort puts immunity before unaffected on a mixed roll.
            // The immunity branch compares `b.type === "unaffected"` (a damage-type label) instead of
            // `b.category`, so the match never succeeds and immunity always sorts first.
            const damage = calculate({
                result: iwr({
                    instances: [instance("vitality", 10), instance("fire", 10), instance("slashing", 10)],
                    immunities: [immunity("fire")],
                    weaknesses: [weakness("slashing", 5)],
                    resistances: [resistance("slashing", 3)],
                    isAffectedBy: (type) => type !== "vitality",
                }),
                baseActorHardness: 4,
            });

            expect(damage.applications).toEqual([
                { category: "immunity", type: "fire", adjustment: -10 },
                { category: "unaffected", type: "vitality", adjustment: -10 },
                { category: "weakness", type: "slashing", adjustment: 5 },
                { category: "resistance", type: "slashing", adjustment: -3, ignored: false },
                { category: "reduction", type: "PF2E.Damage.Hardness.Full", adjustment: -4 },
            ]);
            expect(damage.finalDamage).toBe(12);
        });
    });

    describe("healing", () => {
        test("stays negative and healing dice and modifiers add to it", () => {
            const damage = calculate({
                result: bypass(-10),
                diceAdjustment: 3,
                modifierAdjustment: 5,
                hitPoints: { max: 30, value: 10, temp: 0 },
            });

            expect(damage.finalDamage).toBe(-18);
            expect(damage.updates).toEqual({ "system.attributes.hp.value": 28 });
            expect(damage.totalApplied).toBe(-18);
        });

        test("a healing penalty cannot flip healing into damage", () => {
            const damage = calculate({
                result: bypass(-10),
                modifierAdjustment: -20,
            });

            expect(damage.finalDamage).toBe(0);
            expect(damage.updates).toEqual({ "system.attributes.hp.value": 30 });
            expect(damage.totalApplied).toBe(0);
        });

        test("skips temp HP and stamina, caps at max HP, and keeps the full negative totalApplied", () => {
            const damage = calculate({
                result: bypass(-20),
                hitPoints: { max: 30, value: 25, temp: 4 },
                sp: { max: 10, value: 8 },
                staminaVariant: true,
            });

            expect(damage.finalDamage).toBe(-20);
            expect(damage.updates).toEqual({ "system.attributes.hp.value": 30 });
            expect(damage.totalApplied).toBe(-20);
        });
    });

    describe("hit points", () => {
        test("applies to temp HP, then stamina, then HP, and totalApplied includes overflow past 0", () => {
            const damage = calculate({
                result: bypass(20),
                hitPoints: { max: 30, value: 10, temp: 3 },
                sp: { max: 10, value: 5 },
                staminaVariant: true,
            });

            expect(damage.updates).toEqual({
                "system.attributes.hp.temp": 0,
                "system.attributes.hp.sp.value": 0,
                "system.attributes.hp.value": 0,
            });
            expect(damage.totalApplied).toBe(20);
        });

        test("does not spend stamina unless the variant is on", () => {
            const damage = calculate({
                result: bypass(8),
                hitPoints: { max: 30, value: 10, temp: 0 },
                sp: { max: 10, value: 5 },
                staminaVariant: false,
            });

            expect(damage.updates).toEqual({ "system.attributes.hp.value": 2 });
            expect(damage.totalApplied).toBe(8);
        });

        test("max HP 0 writes no updates, applies 0, and does not trigger instant death", () => {
            const damage = calculate({
                result: bypass(50),
                hitPoints: { max: 0, value: 0, temp: 5 },
                rollOptions: new Set(["item:trait:death"]),
            });

            expect(damage.updates).toEqual({});
            expect(damage.totalApplied).toBe(0);
            expect(damage.instantDeath).toBeNull();
        });

        test("zero damage leaves HP unchanged and applies 0", () => {
            const damage = calculate({ result: bypass(0) });

            expect(damage.updates).toEqual({ "system.attributes.hp.value": 30 });
            expect(damage.totalApplied).toBe(0);
            expect(damage.instantDeath).toBeNull();
        });
    });

    describe("shield and hardness", () => {
        test("shield hardness absorbs first and the shield takes the rest, capped at its HP", () => {
            const damage = calculate({
                result: bypass(10),
                shield: { hardness: 3, hp: 4 },
            });

            expect(damage.damageAbsorbedByShield).toBe(3);
            expect(damage.shieldDamage).toBe(4);
            expect(damage.updates).toEqual({ "system.attributes.hp.value": 23 });
            expect(damage.totalApplied).toBe(7);
        });

        test("a 0-HP shield takes no damage", () => {
            const damage = calculate({
                result: bypass(10),
                shield: { hardness: 3, hp: 0 },
            });

            expect(damage.damageAbsorbedByShield).toBe(3);
            expect(damage.shieldDamage).toBe(0);
            expect(damage.updates).toEqual({ "system.attributes.hp.value": 23 });
        });

        test("no shield block absorbs nothing", () => {
            const damage = calculate({
                result: bypass(10),
                shield: null,
            });

            expect(damage.damageAbsorbedByShield).toBe(0);
            expect(damage.shieldDamage).toBe(0);
            expect(damage.updates).toEqual({ "system.attributes.hp.value": 20 });
        });

        test("actor hardness absorbs what remains after the shield and logs a Full row", () => {
            const damage = calculate({
                result: bypass(20),
                shield: { hardness: 5, hp: 10 },
                baseActorHardness: 4,
            });

            expect(damage.damageAbsorbedByShield).toBe(5);
            expect(damage.shieldDamage).toBe(10);
            expect(damage.damageAbsorbedByActor).toBe(4);
            expect(damage.applications).toEqual([
                { category: "reduction", type: "PF2E.Damage.Hardness.Full", adjustment: -4 },
            ]);
            expect(damage.updates).toEqual({ "system.attributes.hp.value": 19 });
        });

        test("hardness applies to remaining damage after IWR, not the pre-IWR total", () => {
            const damage = calculate({
                result: iwr({
                    instances: [instance("slashing", 20)],
                    resistances: [resistance("slashing", 5)],
                }),
                baseActorHardness: 4,
            });

            expect(damage.finalDamage).toBe(15);
            expect(damage.damageAbsorbedByActor).toBe(4);
            expect(damage.applications).toEqual([
                { category: "resistance", type: "slashing", adjustment: -5, ignored: false },
                { category: "reduction", type: "PF2E.Damage.Hardness.Full", adjustment: -4 },
            ]);
            expect(damage.updates).toEqual({ "system.attributes.hp.value": 19 });
            expect(damage.totalApplied).toBe(11);
        });

        test("adamantine halves hardness when the weapon grade meets the target's hardness", () => {
            const damage = calculate({
                result: bypass(20),
                baseActorHardness: 10,
                damageHasAdamantine: true,
                materialGrade: "standard",
            });

            expect(damage.damageAbsorbedByActor).toBe(5);
            expect(damage.applications).toEqual([
                { category: "reduction", type: "PF2E.Damage.Hardness.Half", adjustment: -5 },
            ]);
        });

        test("adamantine does not halve hardness above the weapon grade", () => {
            const damage = calculate({
                result: bypass(20),
                baseActorHardness: 14,
                damageHasAdamantine: true,
                materialGrade: "standard",
            });

            expect(damage.damageAbsorbedByActor).toBe(14);
            expect(damage.applications).toEqual([
                { category: "reduction", type: "PF2E.Damage.Hardness.Full", adjustment: -14 },
            ]);
        });

        test("low-grade adamantine has hardness 0 and does not halve", () => {
            const damage = calculate({
                result: bypass(20),
                baseActorHardness: 10,
                damageHasAdamantine: true,
                materialGrade: "low",
            });

            expect(damage.damageAbsorbedByActor).toBe(10);
            expect(damage.applications).toEqual([
                { category: "reduction", type: "PF2E.Damage.Hardness.Full", adjustment: -10 },
            ]);
        });

        test("final application skips actor hardness", () => {
            const damage = calculate({
                result: bypass(20),
                baseActorHardness: 10,
                final: true,
            });

            expect(damage.damageAbsorbedByActor).toBe(0);
            expect(damage.applications).toEqual([]);
            expect(damage.updates).toEqual({ "system.attributes.hp.value": 10 });
        });
    });

    describe("troop thresholds", () => {
        const troopThresholds = [
            { hp: 30, segments: 4 },
            { hp: 20, segments: 3 },
            { hp: 10, segments: 2 },
        ];

        test("reports a crossing only when the segment band changes", () => {
            const damage = calculate({
                result: bypass(12),
                hitPoints: { max: 30, value: 25, temp: 0 },
                thresholds: troopThresholds,
            });

            expect(damage.updates["system.attributes.hp.value"]).toBe(13);
            expect(damage.reachedThreshold).toBe(true);
            expect(damage.newThreshold).toEqual({ hp: 20, segments: 3 });
        });

        test("does not report a hit that stays in the same band", () => {
            const damage = calculate({
                result: bypass(4),
                hitPoints: { max: 30, value: 25, temp: 0 },
                thresholds: troopThresholds,
            });

            expect(damage.updates["system.attributes.hp.value"]).toBe(21);
            expect(damage.reachedThreshold).toBe(false);
            expect(damage.newThreshold).toEqual({ hp: 30, segments: 4 });
        });
    });

    describe("instant death", () => {
        test("requires damage applied and HP ending at 0", () => {
            const leftover = calculate({
                result: bypass(10),
                rollOptions: new Set(["item:trait:death"]),
            });
            expect(leftover.updates["system.attributes.hp.value"]).toBe(20);
            expect(leftover.instantDeath).toBeNull();

            const atZero = calculate({ result: bypass(30) });
            expect(atZero.updates["system.attributes.hp.value"]).toBe(0);
            expect(atZero.totalApplied).toBe(30);
            expect(atZero.instantDeath).toBeNull();
        });

        test("death effects win unless the target is immune", () => {
            const death = calculate({
                result: bypass(30),
                rollOptions: new Set(["item:trait:death"]),
            });
            expect(death.instantDeath).toBe("death-effect");

            const immune = calculate({
                result: bypass(30),
                rollOptions: new Set(["item:trait:death"]),
                immuneToDeathEffects: true,
            });
            expect(immune.instantDeath).toBeNull();
        });

        test("disintegrate reduces the target to fine powder", () => {
            const damage = calculate({
                result: bypass(30),
                rollOptions: new Set(["item:type:spell", "item:slug:disintegrate"]),
            });

            expect(damage.instantDeath).toBe("fine-powder");
        });

        test("an undead NPC is destroyed", () => {
            const damage = calculate({
                result: bypass(30),
                isUndeadNPC: true,
            });

            expect(damage.instantDeath).toBe("destroyed");
        });

        test("massive damage is twice max HP plus max stamina", () => {
            const damage = calculate({
                result: bypass(25),
                hitPoints: { max: 10, value: 10, temp: 0 },
                sp: { max: 5, value: 5 },
                staminaVariant: true,
            });

            expect(damage.updates["system.attributes.hp.value"]).toBe(0);
            expect(damage.totalApplied).toBe(25);
            expect(damage.instantDeath).toBeNull();

            const massive = calculate({
                result: bypass(30),
                hitPoints: { max: 10, value: 10, temp: 0 },
                sp: { max: 5, value: 5 },
                staminaVariant: true,
            });
            expect(massive.instantDeath).toBe("massive-damage");
        });

        test("death effects beat disintegrate, and undead destruction beats massive damage", () => {
            const death = calculate({
                result: bypass(30),
                rollOptions: new Set(["item:trait:death", "item:type:spell", "item:slug:disintegrate"]),
            });
            expect(death.instantDeath).toBe("death-effect");

            const undead = calculate({
                result: bypass(60),
                isUndeadNPC: true,
            });
            expect(undead.instantDeath).toBe("destroyed");
        });
    });
});
