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
        .filter((a) => a.data.type === type)
        .map((a) => {
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
    return actors.filter((a) => a.data.type === type).map((a) => parseInt(a.data.data.details.level.value ?? '1', 10));
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
        <td>${xp.rating} (${xp.xpPerPlayer} XP)</td>
    </tr>
    <tr>
        <th>Total XP</th>
        <td>PCs: ${xp.encounterBudgets.moderate} XP, NPCs & Hazards: ${xp.totalXP} XP</td>
    </tr>
</table>
<h2>Budgets</h2>
<table>
    <tr>
        <th>Trivial</th>
        <td>${xp.encounterBudgets.trivial} XP</td>
    </tr>
    <tr>
        <th>Low</th>
        <td>${xp.encounterBudgets.low} XP</td>
    </tr>
    <tr>
        <th>Moderate</th>
        <td>${xp.encounterBudgets.moderate} XP</td>
    </tr>
    <tr>
        <th>Severe</th>
        <td>${xp.encounterBudgets.severe} XP</td>
    </tr>
    <tr>
        <th>Extreme</th>
        <td>${xp.encounterBudgets.extreme} XP</td>
    </tr>
</table>`;
}

const askLevelPopupTemplate = () => {
    const partySize = parseInt(localStorage.getItem('xpMacroPartySize') ?? 4, 10);
    const partyLevel = parseInt(localStorage.getItem('xpMacroPartyLevel') ?? 1, 10);
    return `
    <form>
    <div class="form-group">
        <label>Party Size</label>
        <input id="party-size" name="party-size" type="number" value="${partySize}">
    </div>
    <div class="form-group">
        <label>Party level</label>
        <input id="party-level" name="party-level" type="number" value="${partyLevel}">
    </div>
    </form>
    `;
};

/**
 * @param partyLevel {number}
 * @param partySize {number}
 * @param npcLevels {Array<number>}
 * @param hazardLevels {Array<HazardLevel>}
 */
function showXP(partyLevel, partySize, npcLevels, hazardLevels) {
    const xp = game.pf2e.gm.calculateXP(partyLevel, partySize, npcLevels, hazardLevels, {
        proficiencyWithoutLevel: game.settings.get('pf2e', 'proficiencyVariant') === 'ProficiencyWithoutLevel',
    });
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
                label: 'Cancel',
            },
            yes: {
                icon: '<i class="fas fa-calculator"></i>',
                label: 'Calculate XP',
                callback: ($html) => {
                    const partySize = parseInt($html[0].querySelector('[name="party-size"]').value, 10) ?? 1;
                    const partyLevel = parseInt($html[0].querySelector('[name="party-level"]').value, 10) ?? 1;
                    // persist for future uses
                    localStorage.setItem('xpMacroPartySize', partySize);
                    localStorage.setItem('xpMacroPartyLevel', partyLevel);
                    showXP(partyLevel, partySize, npcLevels, hazardLevels);
                },
            },
        },
        default: 'yes',
    }).render(true);
}

function main() {
    const actors = canvas.tokens.controlled.map((a) => a.actor);

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
