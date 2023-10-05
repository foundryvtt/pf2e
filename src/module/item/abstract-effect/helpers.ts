import { DurationData } from "./data.ts";
import type { AbstractEffectPF2e } from "./document.ts";
import { DURATION_UNITS } from "./values.ts";

export function calculateRemainingDuration(
    effect: AbstractEffectPF2e,
    durationData: DurationData | { unit: "unlimited" }
): { expired: boolean; remaining: number } {
    if (durationData.unit === "encounter") {
        const isExpired = effect.system.expired;
        return { expired: !!isExpired, remaining: isExpired ? 0 : Infinity };
    } else if (durationData.unit === "unlimited" || !("start" in effect.system)) {
        return { expired: false, remaining: Infinity };
    }

    const start = effect.system.start.value;
    const { combatant } = game.combat ?? {};
    const { unit, expiry } = durationData;

    const duration = durationData.value * (DURATION_UNITS[durationData.unit] ?? 0);

    // Prevent effects that expire at end of current turn from expiring immediately outside of encounters
    const addend = !combatant && duration === 0 && unit === "rounds" && expiry === "turn-end" ? 1 : 0;
    const remaining = start + duration + addend - game.time.worldTime;
    const result = { remaining, expired: remaining <= 0 };

    if (remaining === 0 && combatant?.actor) {
        const startInitiative = effect.system.start.initiative ?? 0;
        const currentInitiative = combatant.initiative ?? 0;

        // A familiar won't be represented in the encounter tracker: use the master in its place
        const fightyActor = effect.actor?.isOfType("familiar") ? effect.actor.master ?? effect.actor : effect.actor;
        const isEffectTurnStart =
            startInitiative === currentInitiative && combatant.actor === (effect.origin ?? fightyActor);

        result.expired = isEffectTurnStart ? expiry === "turn-start" : currentInitiative < startInitiative;
    }

    return result;
}
