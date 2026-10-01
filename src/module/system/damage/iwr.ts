import type { Immunity, Resistance, Weakness } from "@actor/data/iwr.ts";
import type { ResistanceType } from "@actor/types.ts";
import type { PreciousMaterialGrade } from "@item/physical/types.ts";
import { DEGREE_OF_SUCCESS } from "@system/degree-of-success.ts";
import { tupleHasValue } from "@util/misc.ts";
import * as R from "remeda";
import type { DamageType, ImmunityRedirect, ResistanceRedirect } from "./types.ts";
import { BASE_DAMAGE_TYPES_TO_CATEGORIES } from "./values.ts";

/** Resolve IWR (unless already resolved), then post-IWR adjustments, shield, hardness, and hit points */
function calculateAppliedDamage(params: CalculateAppliedDamageParams): AppliedDamage {
    const {
        rollOptions,
        isDamage,
        final,
        diceAdjustment,
        modifierAdjustment,
        shield,
        baseActorHardness,
        damageHasAdamantine,
        materialGrade,
        hitPoints,
        sp,
        staminaVariant,
        thresholds,
        immuneToDeathEffects,
        isUndeadNPC,
    } = params;
    const result = "finalDamage" in params.result ? params.result : applyIWR(params.result, rollOptions);

    // Damage should never go negative, nor healing positive
    const clamp = isDamage ? Math.max : Math.min;
    // Compute result after adjustments (but before hardness)
    const finalDamage = clamp(0, result.finalDamage - (diceAdjustment + modifierAdjustment));

    const shieldHardness = shield?.hardness ?? 0;
    const damageAbsorbedByShield = finalDamage > 0 ? Math.min(shieldHardness, finalDamage) : 0;
    const shieldDamage = shield ? Math.min(shield.hp, Math.abs(finalDamage) - damageAbsorbedByShield) : 0;

    // Reduce damage by actor hardness
    const effectiveActorHardness = ((): number => {
        if (final) return 0;

        // "[Adamantine weapons] treat any object they hit as if it had half as much Hardness as usual, unless the
        // object's Hardness is greater than that of the adamantine weapon."
        // Hardness values for thin adamantine items (inclusive of weapons):
        const itemHardness = {
            low: 0, // low-grade adamantine doesn't exist
            standard: 10,
            high: 13,
        }[materialGrade];
        return damageHasAdamantine && itemHardness >= baseActorHardness
            ? Math.floor(baseActorHardness / 2)
            : baseActorHardness;
    })();

    // Include actor-hardness absorption in list of damage modifications
    const damageAbsorbedByActor =
        finalDamage > 0 ? Math.min(finalDamage - damageAbsorbedByShield, effectiveActorHardness) : 0;
    if (damageAbsorbedByActor > 0) {
        const typeLabel =
            effectiveActorHardness === baseActorHardness ? "PF2E.Damage.Hardness.Full" : "PF2E.Damage.Hardness.Half";
        result.applications.push({
            category: "reduction",
            type: typeLabel,
            adjustment: -1 * damageAbsorbedByActor,
        });
    }

    const damageResult = calculateHealthDelta({
        hp: hitPoints,
        sp,
        staminaVariant,
        delta: finalDamage - damageAbsorbedByShield - damageAbsorbedByActor,
    });

    // Test troop thresholds. If reached, print a message with remaining thresholds later
    const currentThreshold = thresholds?.findLast((t) => t.hp >= hitPoints.value);
    const newThreshold = thresholds?.findLast((t) => t.hp >= damageResult.updates["system.attributes.hp.value"]);
    const reachedThreshold = newThreshold && currentThreshold && currentThreshold.segments !== newThreshold.segments;

    const staminaMax = sp?.max ?? 0;
    const instantDeath = ((): string | null => {
        if (damageResult.totalApplied <= 0 || damageResult.updates["system.attributes.hp.value"] !== 0) {
            return null;
        }
        return rollOptions.has("item:trait:death") && !immuneToDeathEffects
            ? "death-effect"
            : rollOptions.has("item:type:spell") && rollOptions.has("item:slug:disintegrate")
              ? "fine-powder"
              : isUndeadNPC
                ? "destroyed"
                : damageResult.totalApplied >= (hitPoints.max + staminaMax) * 2
                  ? "massive-damage"
                  : null;
    })();

    return {
        ...damageResult,
        applications: result.applications,
        persistent: result.persistent,
        finalDamage,
        damageAbsorbedByShield,
        shieldDamage,
        damageAbsorbedByActor,
        reachedThreshold,
        newThreshold,
        instantDeath,
    };
}

/** Determine actor updates for applying damage/healing across temporary hit points, stamina, and then hit points */
function calculateHealthDelta(args: {
    hp: { max: number; value: number; temp: number };
    sp?: Maybe<{ max: number; value: number }>;
    staminaVariant: boolean;
    delta: number;
}) {
    const updates: Record<string, number> = {};
    const { hp, sp, staminaVariant, delta } = args;
    if (hp.max === 0) return { updates, totalApplied: 0 };

    const appliedToTemp = ((): number => {
        if (!hp.temp || delta <= 0) return 0;
        const applied = Math.min(hp.temp, delta);
        updates["system.attributes.hp.temp"] = Math.max(hp.temp - applied, 0);

        return applied;
    })();

    const appliedToSP = ((): number => {
        const staminaEnabled = !!sp && staminaVariant;
        if (!staminaEnabled || delta <= 0) return 0;
        const remaining = delta - appliedToTemp;
        const applied = Math.min(sp.value, remaining);
        updates["system.attributes.hp.sp.value"] = Math.max(sp.value - applied, 0);
        return applied;
    })();

    const appliedToHP = ((): number => {
        const remaining = delta - appliedToTemp - appliedToSP;
        updates["system.attributes.hp.value"] = Math.min(Math.max(hp.value - remaining, 0), hp.max);
        return remaining;
    })();
    const totalApplied = appliedToTemp + appliedToSP + appliedToHP;

    return { updates, totalApplied };
}

/** Apply an actor's IWR applications to an evaluated damage roll's instances */
function applyIWR(input: IWRInput, rollOptions: Set<string>): IWRApplicationData {
    const { roll, immunities, weaknesses, resistances } = input;

    const instances = roll.instances;
    const persistent: PersistentDamage[] = []; // Persistent damage instances filtered for immunities
    const { ignoredResistances, irRedirects } = roll;

    // Don't include persistent damage on initial application
    const immediateInstances = instances.filter((i) => !i.persistent || i.evaluatePersistent);
    const applyOnceWeaknesses = weaknesses.filter(
        (w) => w.applyOnce && immediateInstances.some((i) => w.test([...i.formalDescription, ...rollOptions])),
    );
    const damageWeaknesses = weaknesses.filter((w) => !applyOnceWeaknesses.includes(w));

    const applications = instances
        .flatMap((instance): IWRApplication[] => {
            const formalDescription = new Set([...instance.formalDescription, ...rollOptions]);

            // If the roll's total was increased to a minimum of 1, treat the first instance as having a total of 1
            const wasIncreased = instance.total <= 0 && typeof roll.increasedFrom === "number";
            const isFirst = instances.indexOf(instance) === 0;
            const instanceTotal = wasIncreased && isFirst ? 1 : Math.max(instance.total, 0);

            // Step 0: Inapplicable damage outside the IWR framework
            if (!input.isAffectedBy(instance.type)) {
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

            const immunityRedirects = applicableImmunities.map((immunity) => ({
                immunity,
                redirect: irRedirects.immunities.find((ir) => hasImmunityRedirection(immunity, immunities, [ir])),
            }));
            for (const { immunity, redirect } of immunityRedirects) {
                const redirectLabel = redirect ? input.immunityTypeLabel(redirect.to) : "???";
                instanceApplications.push({
                    category: "immunity",
                    type: immunity.typeLabel,
                    adjustment: 0,
                    redirect: redirectLabel,
                });
            }
            const redirectedFromImmunity = immunityRedirects.findLast((r) => r.redirect)?.redirect?.to ?? null;

            // Before getting a manually-adjusted total, check for immunity to critical hits and "undouble"
            // (or untriple) the total.
            const critImmunity = immunities.find((i) => i.type === "critical-hits" && i.test(formalDescription));
            const isCriticalSuccess = roll.degreeOfSuccess === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS;
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
            const precisionDamage = critImmunityApplies ? Math.floor(instance.precision / 2) : instance.precision;
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
            if (instance.persistent && !instance.evaluatePersistent && instance.expression !== null) {
                persistent.push({ type: instance.type, expression: instance.expression });
            }

            if (afterImmunities === 0) {
                return instanceApplications;
            }

            // Step 3: Weaknesses
            const mainWeaknesses = damageWeaknesses.filter((w) => w.test(formalDescription));
            const splashDamage = instance.splash;
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
                    (highest: WeaknessRecord | null, w) =>
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
                        application.redirect = input.resistanceTypeLabel(resistanceRedirect.redirect.to);
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
            ...applyOnceWeaknesses.map((w): IWRApplication => ({
                category: "weakness",
                type: w.typeLabel,
                adjustment: w.value,
            })),
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
    resistance: ResistanceRecord;

    /** Whether the resistance is applicable to the damage being dealt */
    applicable: boolean;

    /** The processed resistance value (pre-doubled, applicability determined, etc.) */
    value: number;

    /** Whether the resistance has been ignored */
    ignored: boolean;

    constructor(resistance: ResistanceRecord, options: { applicable?: boolean; value: number; ignored?: boolean }) {
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
    testImmunity: ImmunityRecord,
    immunities: ImmunityRecord[],
    redirections: ImmunityRedirect[],
): boolean {
    return redirections.some((redirect) => {
        const categoryFrom = BASE_DAMAGE_TYPES_TO_CATEGORIES[redirect.from];
        const categoryTo = BASE_DAMAGE_TYPES_TO_CATEGORIES[redirect.to];
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
        `damage:category:${BASE_DAMAGE_TYPES_TO_CATEGORIES[type]}`,
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
    const highestValue = highest instanceof WorkingResistanceData ? highest.value : Infinity;
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
    immunities: ImmunityRecord[];
    resistances: WorkingResistanceData[];
    /** The immunity or highest resistance to be applied: a redirect must improve the result to be selected. */
    highest: ImmunityRecord | WorkingResistanceData | null;
    redirects: ResistanceRedirect[];
}

interface ResistanceRedirection {
    resistance: WorkingResistanceData | null;
    redirect: ResistanceRedirect;
}

type ImmunityRecord = Pick<Immunity, "type" | "exceptions" | "label" | "typeLabel" | "applicationLabel" | "test">;

type WeaknessRecord = Pick<
    Weakness,
    "type" | "value" | "applyOnce" | "label" | "typeLabel" | "applicationLabel" | "test"
>;

type ResistanceRecord = Pick<
    Resistance,
    "type" | "value" | "exceptions" | "label" | "typeLabel" | "applicationLabel" | "test" | "getDoubledValue"
>;

interface DamageInstanceSnapshot {
    type: DamageType;
    total: number;
    persistent: boolean;
    evaluatePersistent: boolean;
    formalDescription: Set<string>;
    critImmuneTotal: number;
    precision: number;
    splash: number;
    /** The formula of unevaluated persistent damage */
    expression: string | null;
}

interface DamageRollSnapshot {
    total: number;
    instances: DamageInstanceSnapshot[];
    increasedFrom?: number;
    degreeOfSuccess?: number | null;
    ignoredResistances: ResistanceRecord[];
    irRedirects: { immunities: ImmunityRedirect[]; resistances: ResistanceRedirect[] };
}

/** An evaluated damage roll and the target's IWR, with Foundry lookups passed in as callbacks */
interface IWRInput {
    roll: DamageRollSnapshot;
    immunities: ImmunityRecord[];
    weaknesses: WeaknessRecord[];
    resistances: ResistanceRecord[];
    isAffectedBy: (type: DamageType) => boolean;
    immunityTypeLabel: (type: Exclude<DamageType, "untyped">) => string;
    resistanceTypeLabel: (type: Exclude<DamageType, "untyped">) => string;
}

interface CalculateAppliedDamageParams {
    result: IWRApplicationData | IWRInput;
    rollOptions: Set<string>;
    isDamage: boolean;
    final: boolean;
    diceAdjustment: number;
    modifierAdjustment: number;
    /** The shield blocking this damage, if Shield Block is in effect */
    shield: { hardness: number; hp: number } | null;
    baseActorHardness: number;
    damageHasAdamantine: boolean;
    materialGrade: PreciousMaterialGrade;
    hitPoints: { max: number; value: number; temp: number };
    sp?: Maybe<{ max: number; value: number }>;
    staminaVariant: boolean;
    thresholds: { hp: number; segments: number }[] | null;
    immuneToDeathEffects: boolean;
    isUndeadNPC: boolean;
}

interface AppliedDamage {
    applications: IWRApplication[];
    persistent: PersistentDamage[];
    finalDamage: number;
    damageAbsorbedByShield: number;
    shieldDamage: number;
    damageAbsorbedByActor: number;
    updates: Record<string, number>;
    totalApplied: number;
    reachedThreshold: boolean | undefined;
    newThreshold: { hp: number; segments: number } | undefined;
    instantDeath: string | null;
}

interface PersistentDamage {
    type: DamageType;
    expression: string;
}

interface IWRApplicationData {
    finalDamage: number;
    applications: IWRApplication[];
    persistent: PersistentDamage[];
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

export { calculateAppliedDamage };
export type { IWRApplication, IWRApplicationData, IWRInput };
