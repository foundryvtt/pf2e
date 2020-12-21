const xpDifferences = new Map();
xpDifferences.set(-4, 10);
xpDifferences.set(-3, 15);
xpDifferences.set(-2, 20);
xpDifferences.set(-1, 30);
xpDifferences.set(0, 40);
xpDifferences.set(1, 60);
xpDifferences.set(2, 80);
xpDifferences.set(3, 120);
xpDifferences.set(4, 160);

function getCreatureXP(partyLevel, npcLevel) {
    // add +1 to all levels to account for -1 npc levels
    const difference = (npcLevel + 1) - (partyLevel + 1);
    if (difference < -4) {
        return 10;
    } else if (difference > 4) {
        return 160;
    } else {
        return xpDifferences.get(difference);
    }
}

const xp = new Map();
xp.set('trivial', 40);
xp.set('low', 60);
xp.set('moderate', 80);
xp.set('severe', 120);
xp.set('extreme', 160);

function getEncounterRating(challenge, budgets) {
    const allLowerBudgets = Object.entries(budgets)
        .sort((a, b) => a.xp - b.xp)
        .filter(([_, xp]) => xp <= challenge)
        .map(([description]) => description);
    if (allLowerBudgets.length === 0) {
        return 'trivial';
    } else {
        return allLowerBudgets[allLowerBudgets.length - 1];
    }
}

function getXP(partyLevel, partySize, npcLevels) {
    const budget = partySize * 20;
    const challenge = npcLevels
        .map(npcLevel => getCreatureXP(partyLevel, npcLevel))
        .reduce((a, b) => a + b, 0);
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

function getLevels(actors, type) {
    return actors
        .filter(a => a.data.type === type)
        .map(a => parseInt(a.data.data.details.level.value, 10));
}

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
        <td>PCs: ${Math.floor(xp.budget)} XP, NPCs: ${Math.floor(xp.challenge)} XP</td>
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
`

function showXP(partyLevel, partySize, npcLevels) {
    const xp = getXP(partyLevel, partySize, npcLevels);
    new Dialog({
        title: 'XP',
        content: dialogTemplate(xp),
        buttons: {},
    }).render(true);
}

function askPartyLevelAndSize(npcLevels) {
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
                    showXP(partyLevel, partySize, npcLevels);
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

    if (npcLevels.length === 0) {
        ui.notifications.error(`You must select at least one npc token and optionally all PC tokens`);
        return;
    }

    if (pcLevels.length === 0) {
        askPartyLevelAndSize(npcLevels);
    } else {
        showXP(pcLevels[0], pcLevels.length, npcLevels);
    }
}

main();