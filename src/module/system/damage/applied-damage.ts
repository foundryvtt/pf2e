import type { ActorPF2e } from "@actor";
import type { Immunity, Resistance, Weakness } from "@actor/data/iwr.ts";
import type { ApplyDamageParams, ResistanceType } from "@actor/types.ts";
import { DEGREE_OF_SUCCESS } from "@system/degree-of-success.ts";
import { signedInteger, tupleHasValue } from "@util/misc.ts";
import * as R from "remeda";
import type { DamageType, ImmunityRedirect, ResistanceRedirect } from "./types.ts";
import { BASE_DAMAGE_TYPES_TO_CATEGORIES } from "./values.ts";

/** Fields `ActorPF2e#applyDamage` has already defaulted. `notes` stay with the caller. */
type CalculateAppliedDamageParams = Omit<ApplyDamageParams, "notes"> &
    Required<
        Pick<ApplyDamageParams, "breakdown" | "final" | "outcome" | "rollOptions" | "shieldBlockRequest" | "skipIWR">
    >;

/**
 * Damage application for an actor, minus the document updates.
 * A test actor may set `iwr` and `healingReceived` instead of building Foundry IWR or rolling healing dice.
 */
async function calculateAppliedDamage(
    actor: DamageApplicationActor,
    {
        damage,
        token,
        item,
        rollOptions,
        skipIWR,
        shieldBlockRequest,
        breakdown,
        outcome,
        final,
    }: CalculateAppliedDamageParams,
): Promise<AppliedDamage | null> {
    const hitPoints = actor.hitPoints;
    if (!hitPoints) return null;

    const skip = final || skipIWR;
    const blockWithShield = !final && shieldBlockRequest;

    // Round damage and healing (negative values) toward zero
    const result = await (async (): Promise<IWRApplicationData> => {
        if (typeof damage === "number") {
            return { finalDamage: Math.trunc(damage), applications: [], persistent: [] };
        }
        if (skip) {
            return { finalDamage: damage.total, applications: [], persistent: [] };
        }
        if (actor.iwr) {
            return applyIWRToInput({ ...actor.iwr, roll: damage }, rollOptions);
        }
        const { applyIWR } = await import("./iwr.ts");
        return applyIWR(actor, damage, rollOptions);
    })();

    // Healing only when the IWR result is negative, and never for a final total
    const isDamage = result.finalDamage >= 0;
    const { diceAdjustment, modifierAdjustment } = await (async (): Promise<{
        diceAdjustment: number;
        modifierAdjustment: number;
    }> => {
        if (final || isDamage) return { diceAdjustment: 0, modifierAdjustment: 0 };
        if (actor.healingReceived) return actor.healingReceived;

        // Extract Target-specific healing adjustments (unless final)
        // Currently only healing modifiers are implemented
        const critical = outcome === "criticalSuccess";
        const resolvables = ((): Record<string, unknown> => {
            if (item?.isOfType("spell")) return { spell: item };
            if (item?.isOfType("weapon")) return { weapon: item };
            return {};
        })();
        const { extractDamageDice, extractModifiers } = await import("@module/rules/helpers.ts");
        const { applyStackingRules } = await import("@actor/modifiers.ts");
        const damageDice = extractDamageDice(actor.synthetics.damageDice, {
            selectors: ["healing-received"],
            resolvables,
            test: rollOptions,
        }).filter((d) => (d.critical === null || d.critical === critical) && d.predicate.test(rollOptions));
        const modifiers = extractModifiers(actor.synthetics, ["healing-received"], { resolvables }).filter(
            (m) => (m.critical === null || m.critical === critical) && m.predicate.test(rollOptions),
        );

        // Roll any dice damage adjustments and produce a total result
        const rolled = (
            await Promise.all(
                damageDice.map(async (dice) => {
                    const formula = `${dice.diceNumber}${dice.dieSize}[${dice.label}]`;
                    const roll = await new Roll(formula).evaluate();
                    roll._formula = `${dice.diceNumber}${dice.dieSize}`; // remove the label from the main formula
                    await roll.toMessage({
                        flags: { [SYSTEM_ID]: { suppressDamageButtons: true } },
                        flavor: dice.label,
                        speaker: ChatMessage.getSpeaker({ token }),
                    });
                    return roll.total;
                }),
            )
        ).reduce((previous, current) => previous + current, 0);

        // Apply stacking rules just in case even though the context of previously applied modifiers has been lost
        const stacked = applyStackingRules(modifiers ?? []);
        breakdown.push(
            ...damageDice.map((dice) => `${dice.label} ${dice.diceNumber}${dice.dieSize}`),
            ...modifiers.filter((m) => m.enabled).map((m) => `${m.label} ${signedInteger(m.modifier)}`),
        );
        return { diceAdjustment: rolled, modifierAdjustment: stacked };
    })();

    // Damage should never go negative, nor healing positive
    const clamp = isDamage ? Math.max : Math.min;
    // Compute result after adjustments (but before hardness)
    const finalDamage = clamp(0, result.finalDamage - (diceAdjustment + modifierAdjustment));

    // Calculate damage to hit points and shield
    const locPrefix = "PF2E.Actor.ApplyDamage";
    const actorShield = isDamage && actor.isOfType("character", "npc") ? actor.attributes.shield : null;
    const shieldBlock =
        actorShield && blockWithShield
            ? ((): boolean => {
                  if (actorShield.broken) {
                      ui.notifications.warn("PF2E.Actions.RaiseAShield.ShieldIsBroken", {
                          format: { actor: token.name, shield: actorShield.name },
                      });
                      return false;
                  }
                  if (actorShield.destroyed) {
                      ui.notifications.warn("PF2E.Actions.RaiseAShield.ShieldIsDestroyed", {
                          format: { actor: token.name, shield: actorShield.name },
                      });
                      return false;
                  }
                  if (!actorShield.raised) {
                      ui.notifications.warn(`${locPrefix}.ShieldNotRaised`, { format: { actor: token.name } });
                      return false;
                  }
                  return true;
              })()
            : false;

    // The blocking shield may not be the held shield, such as in when the Shield spell is in play
    const blockingShield = actor.heldShield?.id === actorShield?.itemId ? actor.heldShield : null;
    const currentShieldHP = blockingShield ? blockingShield._source.system.hp.value : (actorShield?.hp.value ?? 0);
    const shield = shieldBlock ? { hardness: actorShield?.hardness ?? 0, hp: currentShieldHP } : null;
    const shieldHardness = shield?.hardness ?? 0;
    const damageAbsorbedByShield = finalDamage > 0 ? Math.min(shieldHardness, finalDamage) : 0;
    const shieldDamage = shield ? Math.min(shield.hp, Math.abs(finalDamage) - damageAbsorbedByShield) : 0;

    const damageHasAdamantine = typeof damage !== "number" && !!damage.materials?.has("adamantine");
    const materialGrade =
        item?.isOfType("weapon") && item.system.material.type === "adamantine"
            ? (item.system.material.grade ?? "standard")
            : "standard";
    const baseActorHardness = actor.hardness;

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
            type: _loc(typeLabel),
            adjustment: -1 * damageAbsorbedByActor,
        });
    }

    const sp = actor.isOfType("character") ? actor.attributes.hp.sp : null;
    const staminaVariant = game.pf2e.settings.variants.stamina;
    const thresholds = actor.isOfType("npc") ? actor.system.attributes.hp.thresholds : null;
    const immuneToDeathEffects = actor.attributes.immunities.some((i) => i.type === "death-effects");
    const isUndeadNPC = actor.isOfType("npc") && actor.modeOfBeing === "undead";
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
        isDamage,
        blockingShield,
    };
}

/** Determine actor updates for applying damage/healing across temporary hit points, stamina, and then hit points */
function calculateHealthDelta(args: {
    hp: { max: number; value: number; temp: number };
    sp: Maybe<{ max: number; value: number }>;
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
        if (!sp || !staminaVariant || delta <= 0) return 0;
        const remaining = delta - appliedToTemp;
        const applied = Math.min(sp.value, remaining);
        updates["system.attributes.hp.sp.value"] = Math.max(sp.value - applied, 0);
        return applied;
    })();

    const appliedToHP = ((): number => {
        const remaining = delta - appliedToTemp - appliedToSP;
        updates["system.attributes.hp.value"] = Math.clamp(hp.value - remaining, 0, hp.max);
        return remaining;
    })();
    const totalApplied = appliedToTemp + appliedToSP + appliedToHP;

    return { updates, totalApplied };
}

/** Apply IWR to an evaluated roll described by plain data. Persistent results are those instances. */
function applyIWRToInput<T extends DamageInstanceData>(
    input: IWRInput<T>,
    rollOptions: Set<string>,
): IWRApplicationData<T> {
    const { roll, immunities, weaknesses, resistances, ignoredResistances } = input;

    const instances = roll.instances;
    const persistent: T[] = []; // Persistent damage instances filtered for immunities
    const immunityRedirectsFrom = roll.options.bypass?.immunity.redirect ?? [];
    const resistanceRedirectsFrom = roll.options.bypass?.resistance.redirect ?? [];

    // Don't include persistent damage on initial application
    const immediateInstances = instances.filter((i) => !i.persistent || i.options.evaluatePersistent);
    const applyOnceWeaknesses = weaknesses.filter(
        (w) => w.applyOnce && immediateInstances.some((i) => w.test([...i.formalDescription, ...rollOptions])),
    );
    const damageWeaknesses = weaknesses.filter((w) => !applyOnceWeaknesses.includes(w));

    const applications = instances
        .flatMap((instance): IWRApplication[] => {
            const formalDescription = new Set([...instance.formalDescription, ...rollOptions]);

            // If the roll's total was increased to a minimum of 1, treat the first instance as having a total of 1
            const rawTotal = instance.total ?? 0;
            const wasIncreased = rawTotal <= 0 && typeof roll.options.increasedFrom === "number";
            const isFirst = instances.indexOf(instance) === 0;
            const instanceTotal = wasIncreased && isFirst ? 1 : Math.max(rawTotal, 0);

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
                (i) => !hasImmunityRedirection(i, immunities, immunityRedirectsFrom),
            );
            if (appliedImmunity) {
                return [{ category: "immunity", type: appliedImmunity.label, adjustment: -1 * instanceTotal }];
            }

            const instanceApplications: IWRApplication[] = [];

            const immunityRedirects = applicableImmunities.map((immunity) => ({
                immunity,
                redirect: immunityRedirectsFrom.find((ir) => hasImmunityRedirection(immunity, immunities, [ir])),
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
            const isCriticalSuccess = roll.options.degreeOfSuccess === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS;
            const critImmuneTotal = instance.critImmuneTotal ?? 0;
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
            const precisionTotal = instance.componentTotal("precision");
            const precisionDamage = critImmunityApplies ? Math.floor(precisionTotal / 2) : precisionTotal;
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
                    (highest: WeaknessData | null, w) =>
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
                redirects: resistanceRedirectsFrom,
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
    resistance: ResistanceData;

    /** Whether the resistance is applicable to the damage being dealt */
    applicable: boolean;

    /** The processed resistance value (pre-doubled, applicability determined, etc.) */
    value: number;

    /** Whether the resistance has been ignored */
    ignored: boolean;

    constructor(resistance: ResistanceData, options: { applicable?: boolean; value: number; ignored?: boolean }) {
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
    testImmunity: ImmunityData,
    immunities: ImmunityData[],
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
    immunities: ImmunityData[];
    resistances: WorkingResistanceData[];
    /** The immunity or highest resistance to be applied: a redirect must improve the result to be selected. */
    highest: ImmunityData | WorkingResistanceData | null;
    redirects: ResistanceRedirect[];
}

interface ResistanceRedirection {
    resistance: WorkingResistanceData | null;
    redirect: ResistanceRedirect;
}

type ImmunityData = Pick<Immunity, "type" | "exceptions" | "label" | "typeLabel" | "applicationLabel" | "test">;

type WeaknessData = Pick<
    Weakness,
    "type" | "value" | "applyOnce" | "label" | "typeLabel" | "applicationLabel" | "test"
>;

type ResistanceData = Pick<
    Resistance,
    "type" | "value" | "exceptions" | "label" | "typeLabel" | "applicationLabel" | "test" | "getDoubledValue"
>;

/** The parts of a damage instance IWR reads. A rolled `DamageInstance` satisfies this. */
interface DamageInstanceData {
    type: DamageType;
    total: number | undefined;
    persistent: boolean;
    formalDescription: Set<string>;
    critImmuneTotal: number | undefined;
    options: { evaluatePersistent?: boolean };
    head: { expression: string };
    componentTotal(component: "precision" | "splash"): number;
}

/** The redirect lists IWR reads from `roll.options.bypass`. */
interface Bypass {
    immunity: { redirect: ImmunityRedirect[] };
    resistance: { redirect: ResistanceRedirect[] };
}

/** The parts of a damage roll IWR reads. A rolled `DamageRoll` satisfies this. */
interface DamageRollData<T extends DamageInstanceData = DamageInstanceData> {
    total: number;
    instances: T[];
    options: {
        increasedFrom?: number;
        degreeOfSuccess?: number | null;
        bypass?: Bypass;
    };
}

/** An evaluated damage roll and the target's IWR, with Foundry lookups passed in as callbacks */
interface IWRInput<T extends DamageInstanceData = DamageInstanceData> {
    roll: DamageRollData<T>;
    /** Bypass resistances already constructed. The roll only stores `{ type, max }`. */
    ignoredResistances: ResistanceData[];
    immunities: ImmunityData[];
    weaknesses: WeaknessData[];
    resistances: ResistanceData[];
    isAffectedBy: (type: DamageType) => boolean;
    immunityTypeLabel: (type: Exclude<DamageType, "untyped">) => string;
    resistanceTypeLabel: (type: Exclude<DamageType, "untyped">) => string;
}

/** `ActorPF2e`, plus stand-ins tests set where Foundry would build IWR or roll healing dice. */
interface DamageApplicationActor extends ActorPF2e {
    /** Prepared IWR lists. Unset on a real actor, which goes through `applyIWR`. */
    iwr?: Omit<IWRInput, "roll">;
    /** Already-totaled healing dice and modifiers. Unset on a real actor, which rolls them. */
    healingReceived?: { diceAdjustment: number; modifierAdjustment: number };
}

interface AppliedDamage {
    applications: IWRApplication[];
    persistent: DamageInstanceData[];
    finalDamage: number;
    damageAbsorbedByShield: number;
    shieldDamage: number;
    damageAbsorbedByActor: number;
    updates: Record<string, number>;
    totalApplied: number;
    reachedThreshold: boolean | undefined;
    newThreshold: { hp: number; segments: number } | undefined;
    instantDeath: string | null;
    /** True when the pre-clamp total is zero or positive. */
    isDamage: boolean;
    blockingShield: ActorPF2e["heldShield"];
}

interface IWRApplicationData<T extends DamageInstanceData = DamageInstanceData> {
    finalDamage: number;
    applications: IWRApplication[];
    persistent: T[];
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

export { applyIWRToInput, calculateAppliedDamage };
export type {
    AppliedDamage,
    Bypass,
    DamageApplicationActor,
    DamageInstanceData,
    ImmunityData,
    IWRApplication,
    IWRApplicationData,
    IWRInput,
    ResistanceData,
    WeaknessData,
};
