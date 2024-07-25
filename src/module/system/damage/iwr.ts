import type { ActorPF2e } from "@actor";
import { Immunity, NON_DAMAGE_WEAKNESSES, Resistance, Weakness } from "@actor/data/iwr.ts";
import type { ResistanceType } from "@actor/types.ts";
import { DEGREE_OF_SUCCESS } from "@system/degree-of-success.ts";
import * as R from "remeda";
import { DamageInstance, DamageRoll } from "./roll.ts";
import type { RedirectedImmunity, RedirectedResistance } from "./types.ts";

/** Apply an actor's IWR applications to an evaluated damage roll's instances */
function applyIWR(actor: ActorPF2e, roll: Rolled<DamageRoll>, rollOptions: Set<string>): IWRApplicationData {
    // Skip the whole exercise if the actor is dead
    if (actor.isDead) {
        return { finalDamage: 0, applications: [], persistent: [] };
    }

    if (!game.pf2e.settings.iwr) {
        return {
            finalDamage: roll.total,
            applications: [],
            persistent: roll.instances.filter(
                (i): i is Rolled<DamageInstance> => i.persistent && !i.options.evaluatePersistent,
            ),
        };
    }

    const { immunities, weaknesses, resistances } = actor.attributes;

    const instances = roll.instances as Rolled<DamageInstance>[];
    const persistent: Rolled<DamageInstance>[] = []; // Persistent damage instances filtered for immunities
    const ignoredResistances =
        roll.options.bypass?.resistance.ignore.map((ir) => new Resistance({ type: ir.type, value: ir.max })) ?? [];
    const irRedirects = {
        immunities: roll.options.bypass?.immunity.redirect ?? [],
        resistances: roll.options.bypass?.resistance.redirect ?? [],
    };

    const nonDamageWeaknesses = weaknesses.filter(
        (w) =>
            NON_DAMAGE_WEAKNESSES.has(w.type) &&
            instances.some((i) => w.test([...i.formalDescription, ...rollOptions])),
    );
    const damageWeaknesses = weaknesses.filter((w) => !nonDamageWeaknesses.includes(w));

    const applications = instances
        .flatMap((instance): IWRApplication[] => {
            const formalDescription = new Set([...instance.formalDescription, ...rollOptions]);

            // If the roll's total was increased to a minimum of 1, treat the first instance as having a total of 1
            const wasIncreased = instance.total <= 0 && typeof roll.options.increasedFrom === "number";
            const isFirst = instances.indexOf(instance) === 0;
            const instanceTotal = wasIncreased && isFirst ? 1 : Math.max(instance.total, 0);

            // Step 0: Inapplicable damage outside the IWR framework
            if (!actor.isAffectedBy(instance.type)) {
                return [{ category: "unaffected", type: instance.type, adjustment: -1 * instanceTotal }];
            }

            // Step 1: Immunities

            // If the target is immune to the entire instance, we're done with it.
            const possibleImmunities = immunities.filter((i) => i.test(formalDescription));
            const immunity = possibleImmunities.find(
                (i) => !hasImmunityRedirection(i, immunities, irRedirects.immunities),
            );
            if (immunity) {
                return [{ category: "immunity", type: immunity.label, adjustment: -1 * instanceTotal }];
            }

            const instanceApplications: IWRApplication[] = [];

            for (const immunity of possibleImmunities) {
                const redirect = irRedirects.immunities.find((ir) =>
                    hasImmunityRedirection(immunity, immunities, [ir]),
                );
                const redirectLabel = redirect ? new Immunity({ type: redirect.to }).typeLabel : "???";
                instanceApplications.push({
                    category: "immunity",
                    type: immunity.typeLabel,
                    adjustment: 0,
                    redirect: redirectLabel,
                });
            }

            // Before getting a manually-adjusted total, check for immunity to critical hits and "undouble"
            // (or untriple) the total.
            const critImmunity = immunities.find((i) => i.type === "critical-hits");
            const isCriticalSuccess = roll.options.degreeOfSuccess === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS;
            const critImmuneTotal = instance.critImmuneTotal;
            const critImmunityApplies = isCriticalSuccess && !!critImmunity && critImmuneTotal < instanceTotal;

            // If the total was undoubled, log it as an immunity application
            if (critImmunityApplies) {
                instanceApplications.push({
                    category: "immunity",
                    type: critImmunity.label,
                    adjustment: -1 * (instanceTotal - critImmuneTotal),
                });
            }

            const precisionImmunity = immunities.find((i) => i.type === "precision");
            const precisionDamage = critImmunityApplies
                ? Math.floor(instance.componentTotal("precision") / 2)
                : instance.componentTotal("precision");
            if (precisionDamage > 0 && precisionImmunity?.test([...formalDescription, "damage:component:precision"])) {
                // If the creature is immune to both critical hits and precision damage, precision immunity will only
                // reduce damage by half the precision damage dealt (with critical-hit immunity effectively reducing
                // the other half).
                const maxReducible = critImmunityApplies ? critImmuneTotal : instanceTotal;
                if (maxReducible > 0) {
                    instanceApplications.push({
                        category: "immunity",
                        type: precisionImmunity.applicationLabel,
                        adjustment: -1 * Math.min(precisionDamage, maxReducible),
                    });
                }
            }

            const afterImmunities = Math.max(
                instanceTotal + instanceApplications.reduce((sum, a) => sum + a.adjustment, 0),
                0,
            );

            // Push applicable persistent damage to a separate list
            if (instance.persistent && !instance.options.evaluatePersistent) {
                persistent.push(instance);
            }

            if (afterImmunities === 0) {
                return instanceApplications;
            }

            // Step 3: Weaknesses
            const mainWeaknesses = damageWeaknesses.filter((w) => w.test(formalDescription));
            const splashDamage = instance.componentTotal("splash");
            const splashWeakness = splashDamage ? weaknesses.find((w) => w.type === "splash-damage") ?? null : null;
            const precisionWeakness = precisionDamage > 0 ? weaknesses.find((r) => r.type === "precision") : null;
            const highestWeakness = [...mainWeaknesses, precisionWeakness, splashWeakness]
                .filter(R.isTruthy)
                .reduce(
                    (highest: Weakness | null, w) =>
                        w && !highest ? w : w && highest && w.value > highest.value ? w : highest,
                    null,
                );

            if (highestWeakness) {
                instanceApplications.push({
                    category: "weakness",
                    type: highestWeakness.applicationLabel,
                    adjustment: highestWeakness.value,
                });
            }
            const afterWeaknesses = afterImmunities + (highestWeakness?.value ?? 0);

            // Step 4: Resistances
            const workingResistanceData = resistances.map(
                (r): WorkingResistanceData => ({
                    type: r.type,
                    label: r.applicationLabel,
                    applicable: r.test(formalDescription),
                    value: r.getDoubledValue(formalDescription),
                    ignored: ignoredResistances.some((ir) => ir.test(formalDescription)),
                }),
            );
            const applicableResistances = workingResistanceData.filter((r) => r.applicable);
            const criticalResistance = resistances.find((r) => r.type === "critical-hits");
            if (criticalResistance && isCriticalSuccess) {
                const maxResistable = instanceTotal - critImmuneTotal;
                if (maxResistable > 0) {
                    applicableResistances.push({
                        type: criticalResistance.type,
                        label: criticalResistance.applicationLabel,
                        applicable: true,
                        value: Math.min(criticalResistance.getDoubledValue(formalDescription), maxResistable),
                        ignored: ignoredResistances.some((ir) => ir.test(formalDescription)),
                    });
                }
            }

            const precisionResistance = ((): WorkingResistanceData | null => {
                const resistance =
                    precisionDamage > 0 && !precisionImmunity ? resistances.find((r) => r.type === "precision") : null;
                return resistance
                    ? {
                          type: resistance.type,
                          label: resistance.applicationLabel,
                          applicable: true,
                          value: Math.min(resistance.getDoubledValue(formalDescription), precisionDamage),
                          ignored: false,
                      }
                    : null;
            })();
            if (precisionResistance) applicableResistances.push(precisionResistance);

            const highestResistance = applicableResistances
                .filter((r) => !r.ignored)
                .reduce(
                    (highest: WorkingResistanceData | null, r) =>
                        (r && !highest) || (r && highest && r.value > highest.value) ? r : highest,
                    null,
                );

            // Get the highest applicable ignored resistance for display in the IWR breakdown
            const highestIgnored = applicableResistances
                .filter((r) => r.ignored)
                .reduce(
                    (highest: { label: string; value: number } | null, r) =>
                        r && !highest ? r : r && highest && r.value > highest.value ? r : highest,
                    null,
                );

            if (highestResistance?.value) {
                const application: ResistanceApplication = {
                    category: "resistance",
                    type: highestResistance.label,
                    adjustment: -1 * Math.min(afterWeaknesses, highestResistance.value),
                    ignored: false,
                };
                // An alternative resistance (or lack thereof) caused by such abilities as the Concussive weapon trait
                const redirectedResistance = getResistanceRedirection({
                    immunities,
                    resistances: workingResistanceData,
                    highest: highestResistance,
                    redirections: irRedirects.resistances,
                });
                if (redirectedResistance) {
                    application.adjustment = -1 * Math.min(afterWeaknesses, redirectedResistance.to?.value ?? 0);
                    application.redirect = new Resistance({
                        type: redirectedResistance.redirect.to,
                        value: 0,
                    }).typeLabel;
                }
                instanceApplications.push(application);
            } else if (highestIgnored) {
                // The target's resistance was ignored: log it but don't decrease damage
                instanceApplications.push({
                    category: "resistance",
                    type: ignoredResistances.find((ir) => ir.test(formalDescription))?.typeLabel ?? "???",
                    adjustment: 0,
                    ignored: true,
                });
            }

            return instanceApplications;
        })
        .concat(
            ...nonDamageWeaknesses.map(
                (w): IWRApplication => ({ category: "weakness", type: w.typeLabel, adjustment: w.value }),
            ),
        )
        .sort((a, b) => {
            if (a.category === b.category) return 0;

            switch (a.category) {
                case "unaffected":
                    return -1;
                case "immunity":
                    return b.type === "unaffected" ? 1 : -1;
                case "weakness":
                    return ["unaffected", "immunity"].includes(b.category) ? 1 : -1;
                default:
                    return 1;
            }
        });

    const adjustment = applications.reduce((sum, a) => sum + a.adjustment, 0);
    const finalDamage = Math.max(roll.total + adjustment, 0);

    return { finalDamage, applications, persistent };
}

function hasImmunityRedirection(
    testImmunity: Immunity,
    immunities: Immunity[],
    redirections: RedirectedImmunity[],
): boolean {
    return redirections.some((r) => r.from === testImmunity.type && !immunities.some((i) => i.type === r.to));
}

/**
 * Find a resistance "redirection" among a list of candidates: that is, one that matches the `highest` resistance type
 * and would result is less damage being resisted.
 */
function getResistanceRedirection({
    immunities,
    resistances,
    highest,
    redirections,
}: {
    immunities: Immunity[];
    resistances: WorkingResistanceData[];
    highest: WorkingResistanceData;
    redirections: RedirectedResistance[];
}): { to: WorkingResistanceData | null; redirect: RedirectedResistance } | null {
    const isImmuneToHighest = immunities.some((i) => i.type === highest.type);
    return redirections
        .filter(
            (rr) =>
                [highest.type, null].includes(rr.from) &&
                rr.to !== highest.type &&
                !immunities.some((i) => i.type === rr.to),
        )
        .reduce((bestMatch: { to: WorkingResistanceData | null; redirect: RedirectedResistance } | null, redirect) => {
            if (bestMatch && !bestMatch.to) return bestMatch;
            const redirectTarget = resistances.find((r) => r.type === redirect.to) ?? null;
            const highestValue = isImmuneToHighest ? Infinity : highest.value;
            const mostReduction = Math.min(highestValue, bestMatch?.to?.value ?? Infinity);
            return !redirectTarget || redirectTarget.value < mostReduction
                ? { to: redirectTarget, redirect }
                : bestMatch;
        }, null);
}

interface IWRApplicationData {
    finalDamage: number;
    applications: IWRApplication[];
    persistent: Rolled<DamageInstance>[];
}

interface UnaffectedApplication {
    category: "unaffected";
    type: string;
    adjustment: number;
}

interface ImmunityApplication {
    category: "immunity";
    type: string;
    adjustment: number;
    redirect?: string;
}

interface WeaknessApplication {
    category: "weakness";
    type: string;
    adjustment: number;
}

interface ResistanceApplication {
    category: "resistance";
    type: string;
    adjustment: number;
    ignored: boolean;
    redirect?: string;
}

/** Post-IWR reductions from various sources (e.g., hardness) */
interface DamageReductionApplication {
    category: "reduction";
    type: string;
    adjustment: number;
}

/** Partially processed resistance data (value is pre-doubled, applicability determined, etc.) */
interface WorkingResistanceData {
    type: ResistanceType;
    label: string;
    applicable: boolean;
    value: number;
    ignored: boolean;
}

type IWRApplication =
    | UnaffectedApplication
    | ImmunityApplication
    | WeaknessApplication
    | ResistanceApplication
    | DamageReductionApplication;

export { applyIWR };
export type { IWRApplication, IWRApplicationData };
