import { ActorPF2e } from "@actor";
import { ResistanceData, WeaknessData } from "@actor/data/iwr";
import { objectHasKey } from "@util";
import { DamageInstance, DamageRoll } from "./roll";

/** Apply an actor's IWR applications to an evaluated damage roll's instances */
function applyIWR(actor: ActorPF2e, roll: Rolled<DamageRoll>): IWRApplicationData {
    const { immunities, weaknesses, resistances } = actor.attributes;

    const instances = roll.instances as Rolled<DamageInstance>[];
    const damageIsApplicable = {
        good: actor.traits.has("evil"),
        evil: actor.traits.has("good"),
        lawful: actor.traits.has("chaotic"),
        chaotic: actor.traits.has("lawful"),
        positive: !!actor.attributes.hp?.negativeHealing,
        negative: !(actor.modeOfBeing === "construct" || actor.attributes.hp?.negativeHealing),
    };

    const applications = instances
        .flatMap((instance): IWRApplication[] => {
            const { formalDescription, total } = instance;
            const instanceApplications: IWRApplication[] = [];

            if (!game.settings.get("pf2e", "automation.iwr")) return [];

            // Step 1: Inapplicable damage outside the IWR framework
            if (objectHasKey(damageIsApplicable, instance.type) && !damageIsApplicable[instance.type]) {
                return [{ category: "unaffected", type: instance.type, adjustment: -1 * total }];
            }

            // Step 2: Immunities
            const immunity = immunities.find((i) => i.test(formalDescription));
            const hasPrecisionImmunity = immunities.some((i) => i.type === "precision");
            if (immunity) {
                instanceApplications.push({
                    category: "immunity",
                    type: immunity.typeLabel,
                    adjustment: -1 * total,
                });
            } else if (hasPrecisionImmunity) {
                const precisionDamage = instance.partialTotal("precision");
                if (precisionDamage > 0) {
                    instanceApplications.push({
                        category: "immunity",
                        type: "precision",
                        adjustment: -1 * Math.min(total, precisionDamage),
                    });
                }
            }

            const afterImmunities = Math.max(total + instanceApplications.reduce((sum, a) => sum + a.adjustment, 0), 0);
            if (afterImmunities === 0) return instanceApplications;

            // Step 3: Weaknesses
            const mainWeaknesses = weaknesses.filter((w) => w.test(formalDescription));
            const splashDamage = instance.partialTotal("splash");
            const splashWeakness = splashDamage ? weaknesses.find((w) => w.type === "splash-damage") ?? null : null;
            const highestWeakness = [...mainWeaknesses, splashWeakness].reduce(
                (highest: WeaknessData | null, w) =>
                    w && !highest ? w : w && highest && w.value > highest.value ? w : highest,
                null
            );

            if (highestWeakness) {
                instanceApplications.push({
                    category: "weakness",
                    type: highestWeakness.typeLabel,
                    adjustment: highestWeakness.value,
                });
            }
            const afterWeaknesses = afterImmunities + (highestWeakness?.value ?? 0);

            // Step 4: Resistances
            const mainResistances = resistances.filter((r) => r.test(formalDescription));

            const highestResistance = mainResistances.reduce(
                (highest: ResistanceData | null, w) =>
                    w && !highest ? w : w && highest && w.value > highest.value ? w : highest,
                null
            );

            if (highestResistance && highestResistance.value) {
                instanceApplications.push({
                    category: "resistance",
                    type: highestResistance.typeLabel,
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
    const finalDamage = roll.total + adjustment;

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
