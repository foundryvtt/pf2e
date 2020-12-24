/**
 * This file uses JSDoc (see https://jsdoc.app/tags-type.html) to
 * at least somewhat get type safety and prevent easy typing mistakes
 *
 * Rules are implemented as described in https://2e.aonprd.com/Rules.aspx?ID=575
 * including the variant rules for proficiency without level https://2e.aonprd.com/Rules.aspx?ID=1371
 */

/* global ui */
/* global Dialog */

// level without proficiency variant
/** @type {Map<number, number>} */
const xpVariantCreatureDifferences = new Map();
xpVariantCreatureDifferences.set(-7, 9);
xpVariantCreatureDifferences.set(-6, 12);
xpVariantCreatureDifferences.set(-5, 14);
xpVariantCreatureDifferences.set(-4, 18);
xpVariantCreatureDifferences.set(-3, 21);
xpVariantCreatureDifferences.set(-2, 26);
xpVariantCreatureDifferences.set(-1, 32);
xpVariantCreatureDifferences.set(0, 40);
xpVariantCreatureDifferences.set(1, 48);
xpVariantCreatureDifferences.set(2, 60);
xpVariantCreatureDifferences.set(3, 72);
xpVariantCreatureDifferences.set(4, 90);
xpVariantCreatureDifferences.set(5, 108);
xpVariantCreatureDifferences.set(6, 135);
xpVariantCreatureDifferences.set(7, 160);

/** @type {Map<number, number>} */
const xpCreatureDifferences = new Map();
xpCreatureDifferences.set(-4, 10);
xpCreatureDifferences.set(-3, 15);
xpCreatureDifferences.set(-2, 20);
xpCreatureDifferences.set(-1, 30);
xpCreatureDifferences.set(0, 40);
xpCreatureDifferences.set(1, 60);
xpCreatureDifferences.set(2, 80);
xpCreatureDifferences.set(3, 120);
xpCreatureDifferences.set(4, 160);

// for some reason Paizo thought it was a good idea to give 
// simple hazards entirely different and incredibly small xp values
/** @type {Map<number, number>} */
const xpSimpleHazardDifferences = new Map();
xpSimpleHazardDifferences.set(-4, 2);
xpSimpleHazardDifferences.set(-3, 3);
xpSimpleHazardDifferences.set(-2, 4);
xpSimpleHazardDifferences.set(-1, 6);
xpSimpleHazardDifferences.set(0, 8);
xpSimpleHazardDifferences.set(1, 12);
xpSimpleHazardDifferences.set(2, 16);
xpSimpleHazardDifferences.set(3, 24);
xpSimpleHazardDifferences.set(4, 32);

/**
 * @param partyLevel {number}
 * @param entityLevel {number}
 * @param values {Map<number, number>}
 * @returns {number}
 */
function getXPFromMap(partyLevel, entityLevel, values) {
    // add +1 to all levels to account for -1 levels
    const difference = (entityLevel + 1) - (partyLevel + 1);
    const range = Math.floor(values.size / 2);
    const boundedDifference = Math.clamped(difference, 0 - range, range);
    return values.get(boundedDifference);
}

/**
 * @param partyLevel {number}
 * @param npcLevel {number}
 * @returns {number}
 */
function getCreatureXP(partyLevel, npcLevel) {
    if (game.settings.get('pf2e', 'proficiencyVariant') === 'ProficiencyWithoutLevel') {
        return getXPFromMap(partyLevel, npcLevel, xpVariantCreatureDifferences);
    } else {
        return getXPFromMap(partyLevel, npcLevel, xpCreatureDifferences);
    }
}

/**
 * @typedef {{level: number, isComplex: boolean}} HazardLevel
 */

/**
 * @param partyLevel {number}
 * @param hazard {HazardLevel}
 * @returns {number}
 */
function getHazardXp(partyLevel, hazard) {
    if (hazard.isComplex) {
        return getCreatureXP(partyLevel, hazard.level);
    } else {
        return getXPFromMap(partyLevel, hazard.level, xpSimpleHazardDifferences);
    }
}

/**
 * @typedef {{trivial, low, moderate, severe, extreme: number}} EncounterBudgets
 */

/**
 * @param challenge {number}
 * @param budgets {EncounterBudgets}
 * @returns {string}
 */
function getEncounterRating(challenge, budgets) {
    if (challenge < budgets.low) {
        return 'trivial';
    } else if (challenge < budgets.moderate) {
        return 'low';
    } else if (challenge < budgets.severe) {
        return 'moderate';
    } else if (challenge < budgets.extreme) {
        return 'severe';
    } else {
        return 'extreme';
    }
}

/**
 * @typedef {{encounterBudgets: EncounterBudgets, rating: string, xp: number, challenge: number, partySize: number, partyLevel: number, budget: number}} XP
 */

/**
 *
 * @param partyLevel {number}
 * @param partySize {number}
 * @param npcLevels {Array<number>}
 * @param hazards {Array<HazardLevel>}
 * @returns {XP}
 */
function getXP(partyLevel, partySize, npcLevels, hazards) {
    const budget = partySize * 20;
    const creatureChallenge = npcLevels
        .map(level => getCreatureXP(partyLevel, level))
        .reduce((a, b) => a + b, 0);
    const hazardChallenge = hazards
        .map(hazard => getHazardXp(partyLevel, hazard))
        .reduce((a, b) => a + b, 0);
    const challenge = creatureChallenge + hazardChallenge;
    const encounterBudgets = {
        trivial: budget * .5,
        low: budget * .75,
        moderate: budget,
        severe: budget * 1.5,
        extreme: budget * 2,
    };
    const rating = getEncounterRating(challenge, encounterBudgets);
    return {
        partyLevel,
        partySize,
        budget,
        challenge,
        encounterBudgets,
        rating,
        xp: (challenge / partySize) * 4,
    };
}

/**
 * @typedef {{data: {data: {details: {level: number|string|undefined|null, isComplex: boolean}}, type: string}}} Hazard
 */

/**
 * @param actors {Array<Hazard>}
 * @param type {string}
 * @returns {Array<HazardLevel>}
 */
function getHazardLevels(actors, type) {
    return actors
        .filter(a => a.data.type === type)
        .map(a => {
            return {
                level: parseInt(a.data.data.details.level ?? 1, 10),
                isComplex: a.data.data.details.isComplex ?? false,
            };
        });
}

/**
 * @typedef {{data: {data: {details: {level: {value: number|string|undefined|null}}}, type: string}}} Actor
 */

/**
 * @param actors {Array<Actor>}
 * @param type {string}
 * @returns {Array<number>}
 */
function getLevels(actors, type) {
    return actors
        .filter(a => a.data.type === type)
        .map(a => parseInt(a.data.data.details.level.value ?? 1, 10));
}

/**
 * @param xp {XP}
 * @returns {string}
 */
function dialogTemplate(xp) {
    return `
<h2>XP</h2>
<table>
    <tr>
        <th>Party</th>
        <td>PCs: ${xp.partySize} (Lv ${xp.partyLevel})</td>
    </tr>
    <tr>
        <th>Rating</th>
        <td>${xp.rating} (${Math.floor(xp.xp)} XP)</td>
    </tr>
    <tr>
        <th>Total XP</th>
        <td>PCs: ${Math.floor(xp.budget)} XP, NPCs & Hazards: ${Math.floor(xp.challenge)} XP</td>
    </tr>
</table>
<h2>Budgets</h2>
<table>
    <tr>
        <th>Trivial</th>
        <td>${Math.floor(xp.encounterBudgets.trivial)} XP</td>
    </tr>
    <tr>
        <th>Low</th>
        <td>${Math.floor(xp.encounterBudgets.low)} XP</td>
    </tr>
    <tr>
        <th>Moderate</th>
        <td>${Math.floor(xp.encounterBudgets.moderate)} XP</td>
    </tr>
    <tr>
        <th>Severe</th>
        <td>${Math.floor(xp.encounterBudgets.severe)} XP</td>
    </tr>
    <tr>
        <th>Extreme</th>
        <td>${Math.floor(xp.encounterBudgets.extreme)} XP</td>
    </tr>
</table>`;
}

const askLevelPopupTemplate = `
<form>
<div class="form-group">
    <label>Party Size</label>
    <input id="party-size" name="party-size" type="number" value="4">
</div>
<div class="form-group">
    <label>Party level</label>
    <input id="party-level" name="party-level" type="number" value="1">
</div>
</form>
`;

/**
 * @param partyLevel {number}
 * @param partySize {number}
 * @param npcLevels {Array<number>}
 * @param hazardLevels {Array<HazardLevel>}
 */
function showXP(partyLevel, partySize, npcLevels, hazardLevels) {
    const xp = getXP(partyLevel, partySize, npcLevels, hazardLevels);
    new Dialog({
        title: 'XP',
        content: dialogTemplate(xp),
        buttons: {},
    }).render(true);
}

/**
 * @param npcLevels {Array<number>}
 * @param hazardLevels {Array<HazardLevel>}
 */
function askPartyLevelAndSize(npcLevels, hazardLevels) {
    new Dialog({
        title: 'Party Information',
        content: askLevelPopupTemplate,
        buttons: {
            no: {
                icon: '<i class="fas fa-times"></i>',
                label: 'Cancel'
            },
            yes: {
                icon: '<i class="fas fa-calculator"></i>',
                label: 'Calculate XP',
                callback: ($html) => {
                    const partySize = parseInt($html[0].querySelector('[name="party-size"]').value, 10) ?? 1;
                    const partyLevel = parseInt($html[0].querySelector('[name="party-level"]').value, 10) ?? 1;
                    showXP(partyLevel, partySize, npcLevels, hazardLevels);
                }
            },
        },
        default: 'yes'
    }).render(true);
}

function main() {
    const actors = canvas.tokens.controlled
        .map(a => a.actor);

    const npcLevels = getLevels(actors, 'npc');
    const pcLevels = getLevels(actors, 'character');
    const hazardLevels = getHazardLevels(actors, 'hazard');

    if (npcLevels.length === 0 && hazardLevels.length === 0) {
        ui.notifications.error(`You must select at least one npc and/or hazard token and optionally all PC tokens`);
        return;
    }

    if (pcLevels.length === 0) {
        askPartyLevelAndSize(npcLevels, hazardLevels);
    } else {
        showXP(pcLevels[0], pcLevels.length, npcLevels, hazardLevels);
    }
}

main();