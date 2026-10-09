import type { ActorPF2e } from "@actor";
import { Immunity, Resistance } from "@actor/data/iwr.ts";
import type { Rolled } from "@client/dice/_module.d.mts";
import { applyIWRToInput, type IWRApplication, type IWRInput } from "./applied-damage.ts";
import type { DamageInstance, DamageRoll } from "./roll.ts";

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
            persistent: unevaluatedPersistent(roll),
        };
    }

    return applyIWRToInput(toIWRInput(actor, roll), rollOptions);
}

/** The roll fields and actor IWR `applyIWRToInput` reads, with bypass resistances already constructed */
function toIWRInput(actor: ActorPF2e, roll: Rolled<DamageRoll>): IWRInput<DamageInstance> {
    return {
        roll,
        ignoredResistances:
            roll.options.bypass?.resistance.ignore.map((ir) => new Resistance({ type: ir.type, value: ir.max })) ?? [],
        immunities: actor.attributes.immunities,
        weaknesses: actor.attributes.weaknesses,
        resistances: actor.attributes.resistances,
        isAffectedBy: (type) => actor.isAffectedBy(type),
        immunityTypeLabel: (type) => new Immunity({ type }).typeLabel,
        resistanceTypeLabel: (type) => new Resistance({ type, value: 0 }).typeLabel,
    };
}

function unevaluatedPersistent(roll: Rolled<DamageRoll>): DamageInstance[] {
    return roll.instances.filter((instance) => instance.persistent && !instance.options.evaluatePersistent);
}

interface IWRApplicationData {
    finalDamage: number;
    applications: IWRApplication[];
    persistent: DamageInstance[];
}

export { applyIWR };
export type { IWRApplication, IWRApplicationData };
