import { ActorPF2e } from "@actor";
import { ResistanceData, WeaknessData } from "@actor/data/iwr";
import { DEGREE_OF_SUCCESS } from "@system/degree-of-success";
import { DamageInstance, DamageRoll } from "./roll";

/** Apply an actor's IWR applications to an evaluated damage roll's instances */
function applyIWR(actor: ActorPF2e, roll: Rolled<DamageRoll>): IWRApplicationData {
    const { immunities, weaknesses, resistances } = actor.attributes;

    const instances = roll.instances as Rolled<DamageInstance>[];

    const applications = instances
        .flatMap((instance): IWRApplication[] => {
            const { formalDescription } = instance;

            // Step 0: Before getting a manually-adjusted total, check for immunity to critical hits and "undouble"
            // (or untriple) the total
            const critImmunity = immunities.find((i) => i.type === "critical-hits");
            const isCriticalSuccess = roll.options.degreeOfSuccess === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS;
            const critImmunityApplies =
                isCriticalSuccess && !!critImmunity?.test([...formalDescription, "damage:component:critical"]);
            const total =
                critImmunityApplies && roll.options.degreeOfSuccess === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS
                    ? instance.critImmuneTotal!
                    : instance.total;

            const instanceApplications: IWRApplication[] = [];

            if (!game.settings.get("pf2e", "automation.iwr")) return [];

            // Step 1: Inapplicable damage outside the IWR framework
            if (!actor.isAffectedBy(instance.type)) {
                return [{ category: "unaffected", type: instance.type, adjustment: -1 * total }];
            }

            // Step 2: Immunities

            // If the total was undoubled, log it as an immunity application
            if (critImmunity && total < instance.total) {
                instanceApplications.push({
                    category: "immunity",
                    type: critImmunity.label,
                    adjustment: -1 * (instance.total - total),
                });
            }

            const immunity = immunities.find((i) => i.test(formalDescription));
            const precisionImmunity = immunities.find((i) => i.type === "precision");
            const precisionDamage = instance.componentTotal("precision");

            if (immunity) {
                return [{ category: "immunity", type: immunity.label, adjustment: -1 * total }];
            } else if (
                precisionDamage > 0 &&
                precisionImmunity?.test([...formalDescription, "damage:component:precision"])
            ) {
                // If the creature is immune to both critical hits and precision damage, precision immunity will only
                // reduce damage by half the precision damage dealt (with critical-hit immunity effectively reducing
                // the other half).
                const adjustedPrecisionDamage = critImmunityApplies ? Math.floor(precisionDamage / 2) : precisionDamage;
                const adjustment = -1 * Math.min(total, adjustedPrecisionDamage);
                instanceApplications.push({
                    category: "immunity",
                    type: precisionImmunity.label,
                    adjustment,
                });
            }

            const afterImmunities = Math.max(total + instanceApplications.reduce((sum, a) => sum + a.adjustment, 0), 0);
            if (afterImmunities === 0) return instanceApplications;

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
                    type: highestWeakness.label,
                    adjustment: highestWeakness.value,
                });
            }
            const afterWeaknesses = afterImmunities + (highestWeakness?.value ?? 0);

            // Step 4: Resistances
            const applicableResistances = resistances.filter((r) => r.test(formalDescription));
            const highestResistance = applicableResistances.reduce(
                (highest: ResistanceData | null, w) =>
                    w && !highest ? w : w && highest && w.value > highest.value ? w : highest,
                null
            );

            if (highestResistance?.value) {
                instanceApplications.push({
                    category: "resistance",
                    type: highestResistance.label,
                    adjustment: -1 * Math.min(afterWeaknesses, highestResistance.value),
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

    return { finalDamage, applications };
}

interface IWRApplicationData {
    finalDamage: number;
    applications: IWRApplication[];
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
}

type IWRApplication = UnafectedApplication | ImmunityApplication | WeaknessApplication | ResistanceApplication;

export { IWRApplication, IWRApplicationData, applyIWR };
