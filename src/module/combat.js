/* eslint-disable import/prefer-default-export */
export const initiativeFormula = (combatant) => {
    const { actor } = combatant;
    if (!actor) return '1d20';
    const actorType = actor.data.type;
    const data = actor ? actor.data.data : {};
    let bonus;
    const modifierEnabledInit = data.attributes?.initiative?.totalModifier;
    if (actorType === 'hazard') {
        bonus = data.attributes.stealth.value;
    } else if (modifierEnabledInit !== undefined) {
        bonus = modifierEnabledInit;
    } else {
        bonus = data.attributes.perception.value;
    }

    const parts = ['1d20', bonus || 0];

    //Only show initiative bonuses if they are there. Else it always shows "+ 0" on the roll.
    if (((data.attributes.initiative || {}).circumstance || 0) + ((data.attributes.initiative || {}).status || 0) != 0) {
        parts.push((data.attributes.initiative || {}).circumstance || 0) + ((data.attributes.initiative || {}).status || 0);
    }

    // NPC's are always first in PF2e rules
    if (!actor.isPC) {
        parts.push(0.9);
    }

    return parts.join('+');
};
