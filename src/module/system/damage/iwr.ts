import { ActorPF2e } from "@actor";
import { ResistanceData, WeaknessData } from "@actor/data/iwr";
import { ConditionPF2e, ConditionSource } from "@item";
import { DEGREE_OF_SUCCESS } from "@system/degree-of-success";
import { DamageInstance, DamageRoll } from "./roll";

/** Apply an actor's IWR applications to an evaluated damage roll's instances */
function applyIWR(actor: ActorPF2e, roll: Rolled<DamageRoll>, rollOptions: Set<string>): IWRApplicationData {
    // Skip the whole exercise if the actor is dead
    if (actor.isDead) {
        return { finalDamage: 0, applications: [], persistent: [] };
    }

    if (!game.settings.get("pf2e", "automation.iwr")) {
        return {
            finalDamage: roll.total,
            applications: [],
            persistent: roll.instances.filter((i) => i.persistent && !i.options.evaluatePersistent),
        };
    }

    const { immunities, weaknesses, resistances } = actor.attributes;

    const instances = roll.instances as Rolled<DamageInstance>[];
    const persistent: Rolled<DamageInstance>[] = []; // Persistent damage instances filtered for immunities
    const ignoredResistances = (roll.options.ignoredResistances ?? []).map(
        (ir) => new ResistanceData({ type: ir.type, value: ir.max ?? Infinity })
    );

    const applications = instances
        .flatMap((instance): IWRApplication[] => {
            const formalDescription = new Set([...instance.formalDescription, ...rollOptions]);

            // Step 0: Inapplicable damage outside the IWR framework
            if (!actor.isAffectedBy(instance.type)) {
                return [{ category: "unaffected", type: instance.type, adjustment: -1 * instance.total }];
            }

            // Step 1: Immunities

            // If the target is immune to the entire instance, we're done with it.
            const immunity = immunities.find((i) => i.test(formalDescription));
            if (immunity) {
                return [{ category: "immunity", type: immunity.label, adjustment: -1 * instance.total }];
            }

            // Before getting a manually-adjusted total, check for immunity to critical hits and "undouble"
            // (or untriple) the total.
            const critImmunity = immunities.find((i) => i.type === "critical-hits");
            const isCriticalSuccess = roll.options.degreeOfSuccess === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS;
            const critImmunityApplies =
                isCriticalSuccess && !!critImmunity?.test([...formalDescription, "damage:component:critical"]);
            const critImmuneTotal =
                critImmunityApplies && roll.options.degreeOfSuccess === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS
                    ? instance.critImmuneTotal
                    : instance.total;

            const instanceApplications: IWRApplication[] = [];

            // If the total was undoubled, log it as an immunity application
            if (critImmunity && critImmuneTotal < instance.total) {
                instanceApplications.push({
                    category: "immunity",
                    type: critImmunity.label,
                    adjustment: -1 * (instance.total - critImmuneTotal),
                });
            }

            const precisionImmunity = immunities.find((i) => i.type === "precision");
            const precisionDamage = Math.min(instance.componentTotal("precision"), critImmuneTotal);

            if (precisionDamage > 0 && precisionImmunity?.test([...formalDescription, "damage:component:precision"])) {
                // If the creature is immune to both critical hits and precision damage, precision immunity will only
                // reduce damage by half the precision damage dealt (with critical-hit immunity effectively reducing
                // the other half).
                const adjustedPrecisionDamage = critImmunityApplies ? Math.floor(precisionDamage / 2) : precisionDamage;
                const adjustment = -1 * Math.min(critImmuneTotal, adjustedPrecisionDamage);
                instanceApplications.push({
                    category: "immunity",
                    type: precisionImmunity.applicationLabel,
                    adjustment,
                });
            }

            const afterImmunities = Math.max(
                instance.total + instanceApplications.reduce((sum, a) => sum + a.adjustment, 0),
                0
            );

            if (instance.persistent && !instance.options.evaluatePersistent) {
                persistent.push(instance);
            }

            if (afterImmunities === 0) {
                return instanceApplications;
            }

            // Step 3: Weaknesses
            const mainWeaknesses = weaknesses.filter((w) => w.test(formalDescription));
            const splashDamage = instance.componentTotal("splash");
            const splashWeakness = splashDamage ? weaknesses.find((w) => w.type === "splash-damage") ?? null : null;
            const highestWeakness = [...mainWeaknesses, splashWeakness].reduce(
                (highest: WeaknessData | null, w) =>
                    w && !highest ? w : w && highest && w.value > highest.value ? w : highest,
                null
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
            const applicableResistances = resistances
                .filter((r) => r.test(formalDescription))
                .map((r): { label: string; value: number; ignored: boolean } => ({
                    label: r.applicationLabel,
                    value: r.getDoubledValue(formalDescription),
                    ignored: ignoredResistances.some((ir) => ir.test(formalDescription)),
                }));
            const highestResistance = applicableResistances
                .filter((r) => !r.ignored)
                .reduce(
                    (highest: { label: string; value: number } | null, r) =>
                        (r && !highest) || (r && highest && r.value > highest.value) ? r : highest,
                    null
                );

            // Get the highest applicable ignored resistance for display in the IWR breakdown
            const highestIgnored = applicableResistances
                .filter((r) => r.ignored)
                .reduce(
                    (highest: { label: string; value: number } | null, r) =>
                        r && !highest ? r : r && highest && r.value > highest.value ? r : highest,
                    null
                );

            if (highestResistance?.value) {
                instanceApplications.push({
                    category: "resistance",
                    type: highestResistance.label,
                    adjustment: -1 * Math.min(afterWeaknesses, highestResistance.value),
                    ignored: false,
                });
            } else if (highestIgnored) {
                // The target's resistance was ignored: log it but don't decrease damage
                instanceApplications.push({
                    category: "resistance",
                    type: ignoredResistances.find((ir) => ir.test(formalDescription))!.typeLabel,
                    adjustment: 0,
                    ignored: true,
                });
            }

            return instanceApplications;
        })
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

/** Get the theoretic maximum damage for an instance of persistent damage after applying IWR */
async function maxPersistentAfterIWR(
    actor: ActorPF2e,
    data: ConditionSource,
    rollOptions: Set<string>
): Promise<number> {
    const { damage, damageType } = new ConditionPF2e(data, { ready: true }).system.persistent!;
    const roll = await new DamageRoll(
        `${damage.maximumValue}[${damageType}]`,
        {},
        { evaluatePersistent: true } // In case of bleed damage
    ).evaluate({ async: true });
    return applyIWR(actor, roll, rollOptions).finalDamage;
}

interface IWRApplicationData {
    finalDamage: number;
    applications: IWRApplication[];
    persistent: DamageInstance[];
}

interface UnafectedApplication {
    category: "unaffected";
    type: string;
    adjustment: number;
}

interface ImmunityApplication {
    category: "immunity";
    type: string;
    adjustment: number;
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
}

type IWRApplication = UnafectedApplication | ImmunityApplication | WeaknessApplication | ResistanceApplication;

export { IWRApplication, IWRApplicationData, applyIWR, maxPersistentAfterIWR };
