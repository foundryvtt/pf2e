function CheckFeat(slug) {
    if (token.actor.items.find((i) => i.data.data.slug === slug && i.type === 'feat')) {
        return true;
    }
    return false;
}
const rollTreatWounds = async ({ DC, bonus, med, riskysurgery }) => {
    const options = actor.getRollOptions(['all', 'skill-check', 'medicine']);

    options.push('treat wounds');
    options.push('action:treat-wounds');

    const dc = {
        value: DC,
    };
    if (riskysurgery) {
        dc.modifiers = {
            success: 'one-degree-better',
        };
    }

    med.roll({
        dc: dc,
        event: event,
        options: options,
        callback: (roll) => {
            let healFormula, successLabel;
            const magicHands = CheckFeat('magic-hands');

            const bonusString = bonus > 0 ? `+ ${bonus}` : '';
            if (roll.data.degreeOfSuccess === 3) {
                healFormula = magicHands ? `32${bonusString}` : `4d8${bonusString}`;
                successLabel = 'Critical Success';
            } else if (roll.data.degreeOfSuccess === 2) {
                healFormula = magicHands ? `16${bonusString}` : `2d8${bonusString}`;
                successLabel = 'Success';
            } else if (roll.data.degreeOfSuccess === 1) {
                successLabel = 'Failure';
            } else if (roll.data.degreeOfSuccess === 0) {
                healFormula = '1d8';
                successLabel = 'Critical Failure';
            }
            if (riskysurgery) {
                healFormula = roll.data.degreeOfSuccess > 1 ? `${healFormula}-1d8` : healFormula ? `2d8` : `1d8`;
            }
            if (healFormula !== undefined) {
                const healRoll = new Roll(healFormula).roll();
                const rollType = roll.data.degreeOfSuccess > 1 ? 'Healing' : 'Damage';
                ChatMessage.create(
                    {
                        user: game.user.id,
                        type: CHAT_MESSAGE_TYPES.ROLL,
                        flavor: `<strong>${rollType} Roll: Treat Wounds</strong> (${successLabel})`,
                        roll: healRoll,
                        speaker: ChatMessage.getSpeaker(),
                    },
                    {},
                );
            }
        },
    });
};

function applyChanges($html) {
    for (const token of canvas.tokens.controlled) {
        var { med } = token.actor.data.data.skills;
        const { name } = token;
        const mod = parseInt($html.find('[name="modifier"]').val()) || 0;
        const requestedProf = parseInt($html.find('[name="dc-type"]')[0].value) || 1;
        const riskysurgery = $html.find('[name="risky_surgery_bool"]')[0]?.checked;
        const skill = $html.find('[name="skill"]')[0]?.value;
        if (skill === 'cra') {
            med = token.actor.data.data.skills['cra'];
        }
        const usedProf = requestedProf <= med.rank ? requestedProf : med.rank;
        if (skill === 'nat') {
            med = token.actor.data.data.skills['nat'];
        }
        const medicBonus = CheckFeat('medic-dedication') ? (usedProf - 1) * 5 : 0;
        const roll = [
            () => ui.notifications.warn(`${name} is not trained in Medicine and doesn't know how to treat wounds.`),
            () => rollTreatWounds({ DC: 15 + mod, bonus: 0 + medicBonus, med, riskysurgery }),
            () => rollTreatWounds({ DC: 20 + mod, bonus: 10 + medicBonus, med, riskysurgery }),
            () => rollTreatWounds({ DC: 30 + mod, bonus: 30 + medicBonus, med, riskysurgery }),
            () => rollTreatWounds({ DC: 40 + mod, bonus: 50 + medicBonus, med, riskysurgery }),
        ][usedProf];

        roll();
    }
}

if (token === undefined) {
    ui.notifications.warn('No token is selected.');
} else {
    const chirurgeon = CheckFeat('chirurgeon')
    const naturalMedicine = CheckFeat('natural-medicine')
    const dialog = new Dialog({
        title: 'Treat Wounds',
        content: `
<div>Select a target DC. Remember that you can't attempt a heal above your proficiency. Attempting to do so will downgrade the DC and amount healed to the highest you're capable of.</div>
<hr/>
<form>
${
    chirurgeon || naturalMedicine
        ? `
<div class="form-group">
<label>Treat Wounds Skill:</label>

<select id="skill" name="skill">
<option value="med">Medicine</option>

${
    chirurgeon
        ? `<option value="cra">Crafting</option>`
        : ``
}
${
    naturalMedicine
        ? `<option value="nat">Nature</option>`
        : ``
}
` : ``
}
</select>
</div>
<div class="form-group">
<label>Medicine DC:</label>
<select id="dc-type" name="dc-type">
<option value="1">Trained DC 15</option>
<option value="2">Expert DC 20, +10 Healing</option>
<option value="3">Master DC 30, +30 Healing</option>
<option value="4">Legendary DC 40, +50 Healing</option>
</select>
</div>
<div class="form-group">
<label>DC Modifier:</label>
<input id="modifier" name="modifier" type="number"/>
</div>
${
    CheckFeat('risky-surgery')
        ? `<div class="form-group">
<label>Risky Surgery</label>
<input type="checkbox" id="risky_surgery_bool" name="risky_surgery_bool"></input>
</div>`
        : ``
}
</form>
`,
        buttons: {
            yes: {
                icon: `<i class="fas fa-hand-holding-medical"></i>`,
                label: 'Treat Wounds',
                callback: applyChanges,
            },
            no: {
                icon: `<i class="fas fa-times"></i>`,
                label: 'Cancel',
            },
        },
        default: 'yes',
    });
    dialog.render(true);
}
