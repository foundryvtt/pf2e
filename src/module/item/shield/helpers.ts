import type { ActorPF2e } from "@actor";
import { RUNE_DATA } from "@item/physical/index.ts";
import type { ShieldPF2e } from "./document.ts";

function applyReinforcingRune(shield: ShieldPF2e): void {
    const reinforcingRuneData = RUNE_DATA.shield.reinforcing;
    const reinforcingRune = shield.system.runes.reinforcing;
    const adjustFromRune = (property: "hardness" | "maxHP", base: number): number => {
        const additionalFromRune = reinforcingRune ? reinforcingRuneData[reinforcingRune]?.[property] : null;
        const sumFromRune = base + (additionalFromRune?.increase ?? 0);
        return additionalFromRune && sumFromRune > additionalFromRune.max
            ? Math.max(base, additionalFromRune.max)
            : sumFromRune;
    };
    shield.system.hp.max = adjustFromRune("maxHP", shield.system.hp.max);
    shield.system.hardness = adjustFromRune("hardness", shield.system.hardness);
}

function setActorShieldData(shield: ShieldPF2e<ActorPF2e>): void {
    const { actor } = shield;
    const isEquippedShield = shield.isEquipped && actor.heldShield === shield;
    if (!isEquippedShield || !actor.isOfType("character", "npc")) {
        return;
    }
    const { attributes } = actor.system;
    if (![shield.id, null].includes(attributes.shield.itemId)) {
        return;
    }

    const { hitPoints } = shield;
    attributes.shield = {
        itemId: shield.id,
        name: shield.name,
        ac: shield.acBonus,
        hp: hitPoints,
        hardness: shield.hardness,
        brokenThreshold: hitPoints.brokenThreshold,
        raised: shield.isRaised,
        broken: shield.isBroken,
        destroyed: shield.isDestroyed,
        icon: shield.img,
    };
    actor.rollOptions.all["self:shield:equipped"] = true;
    if (shield.isDestroyed) {
        actor.rollOptions.all["self:shield:destroyed"] = true;
    } else if (shield.isBroken) {
        actor.rollOptions.all["self:shield:broken"] = true;
    }
}

export { applyReinforcingRune, setActorShieldData };
