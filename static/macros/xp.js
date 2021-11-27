/**
 * @typedef {{data: {data: {details: {level: number|string|undefined|null, isComplex: boolean}}, type: string}}} Hazard
 */

/**
 * @param actors {Array<Hazard>}
 * @param type {string}
 * @returns {Array<HazardLevel>}
 */
function getHazardLevels(actors) {
    return actors.filter((a) => a.data.type === "hazard");
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
    return actors.filter((a) => a.data.type === type).map((a) => parseInt(a.data.data.details.level.value ?? "1", 10));
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
        <th>${game.i18n.localize("PF2E.Encounter.Budget.PartySize")}</th>
        <td>${xp.partySize}</td>
    </tr>
    <tr>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.PartyLevel")}</th>
        <td>${xp.partyLevel}</td>
    </tr>
    <tr>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.Threat")}</th>
        <td>${game.i18n.localize("PF2E.Encounter.Budget.Threats."+xp.rating)} (${xp.totalXP} XP)</td>
    </tr>
    <tr>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.Reward")}</th>
        <td>${xp.ratingXP} XP</td>
    </tr>
</table>
<h2>${game.i18n.localize("PF2E.Encounter.Budget.EncounterBudget")}</h2>
<table>
    <tr>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.Threat")}</th>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.XPBudget")}</th>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.Reward")}</th>
    </tr>
    <tr>
        <td>${game.i18n.localize("PF2E.Encounter.Budget.Threats.trivial")}</td>
        <td>${xp.encounterBudgets.trivial} XP</td>
        <td>40 XP</td>
    </tr>
    <tr>
        <td>${game.i18n.localize("PF2E.Encounter.Budget.Threats.low")}</td>
        <td>${xp.encounterBudgets.low} XP</td>
        <td>60 XP</td>
    </tr>
    <tr>
        <td>${game.i18n.localize("PF2E.Encounter.Budget.Threats.moderate")}</td>
        <td>${xp.encounterBudgets.moderate} XP</td>
        <td>80 XP</td>
    </tr>
    <tr>
        <td>${game.i18n.localize("PF2E.Encounter.Budget.Threats.severe")}</td>
        <td>${xp.encounterBudgets.severe} XP</td>
        <td>120 XP</td>
    </tr>
    <tr>
        <td>${game.i18n.localize("PF2E.Encounter.Budget.Threats.extreme")}</td>
        <td>${xp.encounterBudgets.extreme} XP</td>
        <td>160 XP</td>
    </tr>
</table>`;
}

const askLevelPopupTemplate = () => {
    const partySize = parseInt(localStorage.getItem("xpMacroPartySize") ?? 4, 10);
    const partyLevel = parseInt(localStorage.getItem("xpMacroPartyLevel") ?? 1, 10);
    return `
    <form>
    <div class="form-group">
        <label>${game.i18n.localize("PF2E.Encounter.Budget.PartySize")}</label>
        <input id="party-size" name="party-size" type="number" value="${partySize}">
    </div>
    <div class="form-group">
        <label>${game.i18n.localize("PF2E.Encounter.Budget.PartyLevel")}</label>
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
        proficiencyWithoutLevel: game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel",
    });
    new Dialog({
        title: "XP",
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
        title: "Party Information",
        content: askLevelPopupTemplate,
        buttons: {
            no: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel",
            },
            yes: {
                icon: '<i class="fas fa-calculator"></i>',
                label: "Calculate XP",
                callback: ($html) => {
                    const partySize = parseInt($html[0].querySelector('[name="party-size"]').value, 10) ?? 1;
                    const partyLevel = parseInt($html[0].querySelector('[name="party-level"]').value, 10) ?? 1;
                    // persist for future uses
                    localStorage.setItem("xpMacroPartySize", partySize);
                    localStorage.setItem("xpMacroPartyLevel", partyLevel);
                    showXP(partyLevel, partySize, npcLevels, hazardLevels);
                },
            },
        },
        default: "yes",
    }).render(true);
}

function main() {
    const actors = canvas.tokens.controlled.map((a) => a.actor);
    const npcLevels = getLevels(actors, "npc");
    const pcLevels = getLevels(actors, "character");
    const hazardLevels = getHazardLevels(actors);
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
