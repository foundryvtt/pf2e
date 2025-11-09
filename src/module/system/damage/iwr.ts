import type { ActorPF2e } from "@actor";
import { Immunity, Resistance, Weakness } from "@actor/data/iwr.ts";
import { ResistanceType } from "@actor/types.ts";
import type { Rolled } from "@client/dice/_module.d.mts";
import { DEGREE_OF_SUCCESS } from "@system/degree-of-success.ts";
import { tupleHasValue } from "@util";
import * as R from "remeda";
import { DamageCategorization } from "./helpers.ts";
import { DamageInstance, DamageRoll } from "./roll.ts";
import type { DamageType, ImmunityRedirect, ResistanceRedirect } from "./types.ts";

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

    const applyOnceWeaknesses = weaknesses.filter(
        (w) => w.applyOnce && instances.some((i) => w.test([...i.formalDescription, ...rollOptions])),
    );
    const damageWeaknesses = weaknesses.filter((w) => !applyOnceWeaknesses.includes(w));

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
            const applicableImmunities = immunities.filter(
                // Handle critical hits separately (see below)
                (i) => i.type !== "critical-hits" && i.test(formalDescription),
            );
            const appliedImmunity = applicableImmunities.find(
                (i) => !hasImmunityRedirection(i, immunities, irRedirects.immunities),
            );
            if (appliedImmunity) {
                return [{ category: "immunity", type: appliedImmunity.label, adjustment: -1 * instanceTotal }];
            }

            const instanceApplications: IWRApplication[] = [];

            let redirectedFromImmunity: DamageType | null = null;
            for (const immunity of applicableImmunities) {
                const redirect = irRedirects.immunities.find((ir) =>
                    hasImmunityRedirection(immunity, immunities, [ir]),
                );
                const redirectLabel = redirect ? new Immunity({ type: redirect.to }).typeLabel : "???";
                if (redirect) redirectedFromImmunity = redirect.to;
                instanceApplications.push({
                    category: "immunity",
                    type: immunity.typeLabel,
                    adjustment: 0,
                    redirect: redirectLabel,
                });
            }

            // Before getting a manually-adjusted total, check for immunity to critical hits and "undouble"
            // (or untriple) the total.
            const critImmunity = immunities.find((i) => i.type === "critical-hits" && i.test(formalDescription));
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
            const splashWeakness = splashDamage ? (weaknesses.find((w) => w.type === "splash-damage") ?? null) : null;
            const precisionWeakness =
                precisionDamage > 0
                    ? weaknesses.find(
                          (r) => r.type === "precision" && r.test([...formalDescription, "damage:component:precision"]),
                      )
                    : null;
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
                (r) =>
                    new WorkingResistanceData(r, {
                        applicable:
                            r.test(formalDescription) &&
                            !applicableImmunities.some(
                                (i) => i.type === r.type && i.exceptions.every((e) => tupleHasValue(r.exceptions, e)),
                            ),
                        value: r.getDoubledValue(formalDescription),
                        ignored: ignoredResistances.some((ir) => ir.test(formalDescription)),
                    }),
            );
            const applicableResistances = workingResistanceData.filter((r) => r.applicable);
            const criticalResistance = resistances.find((r) => r.type === "critical-hits");
            if (criticalResistance && isCriticalSuccess) {
                const maxResistable = instanceTotal - critImmuneTotal;
                if (maxResistable > 0) {
                    applicableResistances.push(
                        new WorkingResistanceData(criticalResistance, {
                            value: Math.min(criticalResistance.getDoubledValue(formalDescription), maxResistable),
                            ignored: ignoredResistances.some((ir) => ir.test(formalDescription)),
                        }),
                    );
                }
            }

            const precisionResistance = ((): WorkingResistanceData | null => {
                const resistance =
                    precisionDamage > 0 && !precisionImmunity
                        ? resistances.find(
                              (r) =>
                                  r.type === "precision" &&
                                  r.test([...formalDescription, "damage:component:precision"]),
                          )
                        : null;
                return resistance
                    ? new WorkingResistanceData(resistance, {
                          value: Math.min(resistance.getDoubledValue(formalDescription), precisionDamage),
                      })
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
                        r && (!highest || (highest && r.value > highest.value)) ? r : highest,
                    null,
                );
            // An alternative resistance (or lack thereof) caused by such abilities as the Concussive weapon trait
            const resistanceRedirect = getResistanceRedirection({
                immunities,
                resistances: workingResistanceData,
                highest: applicableImmunities.at(0) ?? highestResistance,
                redirects: irRedirects.resistances,
            });

            const finalResistance = highestResistance ?? resistanceRedirect?.resistance;
            if (finalResistance?.value) {
                const application: ResistanceApplication = {
                    category: "resistance",
                    type: finalResistance.label,
                    adjustment: -1 * Math.min(afterWeaknesses, finalResistance.value),
                    ignored: false,
                };
                if (resistanceRedirect) {
                    application.adjustment = -1 * Math.min(afterWeaknesses, resistanceRedirect.resistance?.value ?? 0);
                    if (resistanceRedirect.redirect.to !== redirectedFromImmunity) {
                        application.redirect = new Resistance({
                            type: resistanceRedirect.redirect.to,
                            value: 0,
                        }).typeLabel;
                    }
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
            ...applyOnceWeaknesses.map(
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

/** A helper class for keeping track of working data alongside a resistance */
class WorkingResistanceData {
    /** The source resistance */
    resistance: Resistance;

    /** Whether the resistance is applicable to the damage being dealt */
    applicable: boolean;

    /** The processed resistance value (pre-doubled, applicability determined, etc.) */
    value: number;

    /** Whether the resistance has been ignored */
    ignored: boolean;

    constructor(resistance: Resistance, options: { applicable?: boolean; value: number; ignored?: boolean }) {
        this.resistance = resistance;
        this.applicable = options.applicable ?? true;
        this.value = options.value;
        this.ignored = options.ignored ?? false;
    }

    get type(): ResistanceType {
        return this.resistance.type;
    }

    get label(): string {
        return this.resistance.applicationLabel;
    }
}

function hasImmunityRedirection(
    testImmunity: Immunity,
    immunities: Immunity[],
    redirections: ImmunityRedirect[],
): boolean {
    return redirections.some((redirect) => {
        const categoryFrom = DamageCategorization.fromDamageType(redirect.from);
        const categoryTo = DamageCategorization.fromDamageType(redirect.to);
        return (
            testImmunity.test([`damage:type:${redirect.from}`, `damage:category:${categoryFrom}`]) &&
            !immunities.some((i) => i.test([`damage:type:${redirect.to}`, `damage:category:${categoryTo}`]))
        );
    });
}

/**
 * Find a resistance "redirection" among a list of candidates: that is, one that matches the `highest` resistance type
 * and would result is less damage being resisted.
 */
function getResistanceRedirection(params: GetResistanceRedirectionParams): ResistanceRedirection | null {
    const { immunities, resistances, highest, redirects } = params;
    if (!highest) return null;
    const createDefinition = (type: DamageType) => [
        `damage:type:${type}`,
        `damage:category:${DamageCategorization.fromDamageType(type)}`,
    ];
    const applicableRedirects = redirects.filter((redirect) => {
        const toDefinition = createDefinition(redirect.to);
        return (
            // ... and the highest IR type
            redirect.from === highest.type &&
            // It does not redirect to the highest resistance ...
            redirect.to !== highest.type &&
            // ... or to an immunity
            !immunities.some((i) => i.test(toDefinition))
        );
    });
    const highestValue = highest instanceof Immunity ? Infinity : highest.value;
    return applicableRedirects.reduce(
        (bestMatch: { redirect: ResistanceRedirect; resistance: WorkingResistanceData | null } | null, redirect) => {
            if (bestMatch && !bestMatch.resistance) return bestMatch;
            const toDefinition = createDefinition(redirect.to);
            const redirectTarget = resistances.find((r) => !r.ignored && r.resistance.test(toDefinition)) ?? null;
            const redirectReduction = redirectTarget?.value ?? 0;
            const mostReduction = Math.min(highestValue, bestMatch?.resistance?.value ?? Infinity);
            return redirectReduction < mostReduction ? { redirect, resistance: redirectTarget } : bestMatch;
        },
        null,
    );
}

interface GetResistanceRedirectionParams {
    immunities: Immunity[];
    resistances: WorkingResistanceData[];
    /** The immunity or highest resistance to be applied: a redirect must improve the result to be selected. */
    highest: Immunity | WorkingResistanceData | null;
    redirects: ResistanceRedirect[];
}

interface ResistanceRedirection {
    resistance: WorkingResistanceData | null;
    redirect: ResistanceRedirect;
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

type IWRApplication =
    | UnaffectedApplication
    | ImmunityApplication
    | WeaknessApplication
    | ResistanceApplication
    | DamageReductionApplication;

export { applyIWR };
export type { IWRApplication, IWRApplicationData };
