function CheckFeat(slug) {
    if (token.actor.items.find((i) => i.data.data.slug === slug && i.type === "feat")) {
        return true;
    }
    return false;
}
const rollTreatWounds = async ({ DC, bonus, med, riskysurgery, mortalhealing }) => {
    const options = actor.getRollOptions(["all", "skill-check", "medicine"]);
    options.push("treat wounds");
    options.push("action:treat-wounds");
    const dc = {
        value: DC,
        visibility: "all",
    };
    if (riskysurgery || mortalhealing) {
        dc.modifiers = {
            success: "one-degree-better",
        };
    }
    if (riskysurgery) {
        options.push("risky-surgery");
    }
    med.roll({
        dc: dc,
        event: event,
        options: options,
        callback: (roll) => {
            let healFormula, successLabel;
            const magicHands = CheckFeat("magic-hands");
            const bonusString = bonus > 0 ? `+ ${bonus}` : "";
            if (roll.data.degreeOfSuccess === 3) {
                healFormula = magicHands ? `32${bonusString}` : `4d8${bonusString}`;
                successLabel = "Critical Success";
            } else if (roll.data.degreeOfSuccess === 2) {
                healFormula = magicHands ? `16${bonusString}` : `2d8${bonusString}`;
                successLabel = "Success";
            } else if (roll.data.degreeOfSuccess === 1) {
                successLabel = "Failure";
            } else if (roll.data.degreeOfSuccess === 0) {
                healFormula = "1d8";
                successLabel = "Critical Failure";
            }
            if (riskysurgery) {
                ChatMessage.create({
                    user: game.user.id,
                    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                    flavor: `<strong>Damage Roll: Risky Surgery</strong>`,
                    roll: new Roll("{1d8}[slashing]").roll(),
                    speaker: ChatMessage.getSpeaker(),
                });
            }
            if (healFormula !== undefined) {
                const healRoll = new Roll(`{${healFormula}}[healing]`).roll();
                const rollType = roll.data.degreeOfSuccess > 1 ? "Healing" : "Damage";
                ChatMessage.create({
                    user: game.user.id,
                    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                    flavor: `<strong>${rollType} Roll: Treat Wounds</strong> (${successLabel})`,
                    roll: healRoll,
                    speaker: ChatMessage.getSpeaker(),
                });
            }
        },
    });
};
async function applyChanges($html) {
    for (const token of canvas.tokens.controlled) {
        var med = token.actor.data.data.skills.med;
        if (!med) {
            ui.notifications.warn(`Token ${token.name} does not have the medicine skill`);
            continue;
        }
        const { name } = token;
        const mod = parseInt($html.find('[name="modifier"]').val()) || 0;
        const requestedProf = parseInt($html.find('[name="dc-type"]')[0].value) || 1;
        const riskysurgery = $html.find('[name="risky_surgery_bool"]')[0]?.checked;
        const mortalhealing = $html.find('[name="mortal_healing_bool"]')[0]?.checked;
        const skill = $html.find('[name="skill"]')[0]?.value;
        // Handle Rule Interpretation
        if (game.user.isGM) {
            await game.settings.set(
                "pf2e",
                "RAI.TreatWoundsAltSkills",
                $html.find('[name="strict_rules"]')[0]?.checked
            );
        }
        var usedProf = 0;
        if (game.settings.get("pf2e", "RAI.TreatWoundsAltSkills")) {
            if (skill === "cra") {
                med = token.actor.data.data.skills["cra"];
            }
            if (skill === "nat") {
                med = token.actor.data.data.skills["nat"];
            }
            usedProf = requestedProf <= med.rank ? requestedProf : med.rank;
        } else {
            usedProf = requestedProf <= med.rank ? requestedProf : med.rank;
            if (skill === "cra") {
                med = token.actor.data.data.skills["cra"];
            }
            if (skill === "nat") {
                med = token.actor.data.data.skills["nat"];
                if (usedProf === 0) {
                    usedProf = 1;
                }
            }
        }
        const medicBonus = CheckFeat("medic-dedication") ? (usedProf - 1) * 5 : 0;
        const roll = [
            () => ui.notifications.warn(`${name} is not trained in Medicine and doesn't know how to treat wounds.`),
            () => rollTreatWounds({ DC: 15 + mod, bonus: 0 + medicBonus, med, riskysurgery, mortalhealing }),
            () => rollTreatWounds({ DC: 20 + mod, bonus: 10 + medicBonus, med, riskysurgery, mortalhealing }),
            () => rollTreatWounds({ DC: 30 + mod, bonus: 30 + medicBonus, med, riskysurgery, mortalhealing }),
            () => rollTreatWounds({ DC: 40 + mod, bonus: 50 + medicBonus, med, riskysurgery, mortalhealing }),
        ][usedProf];
        roll();
    }
}
if (token === undefined) {
    ui.notifications.warn("No token is selected.");
} else {
    const chirurgeon = CheckFeat("chirurgeon");
    const naturalMedicine = CheckFeat("natural-medicine");
    const dialog = new Dialog({
        title: "Treat Wounds",
        content: `
<div>Select a target DC. Remember that you can't attempt a heal above your proficiency. Attempting to do so will downgrade the DC and amount healed to the highest you're capable of.</div>
<hr/>
${
    chirurgeon || naturalMedicine
        ? `
<form>
<div class="form-group">
<label>Treat Wounds Skill:</label>
<select id="skill" name="skill">
<option value="med">Medicine</option>
${chirurgeon ? `<option value="cra">Crafting</option>` : ``}
${naturalMedicine ? `<option value="nat">Nature</option>` : ``}
</select>
</div>
</form>
`
        : ``
}
<form>
<div class="form-group">
<label>Medicine DC:</label>
<select id="dc-type" name="dc-type">
<option value="1">Trained DC 15</option>
<option value="2">Expert DC 20, +10 Healing</option>
<option value="3">Master DC 30, +30 Healing</option>
<option value="4">Legendary DC 40, +50 Healing</option>
</select>
</div>
</form>
<form>
<div class="form-group">
<label>DC Modifier:</label>
<input id="modifier" name="modifier" type="number"/>
</div>
</form>
${
    CheckFeat("risky-surgery")
        ? `<form><div class="form-group">
<label>Risky Surgery</label>
<input type="checkbox" id="risky_surgery_bool" name="risky_surgery_bool"></input>
</div></form>`
        : ``
}
${
    CheckFeat("mortal-healing")
        ? `<form><div class="form-group">
<label>Mortal Healing</label>
<input type="checkbox" id="mortal_healing_bool" name="mortal_healing_bool" checked></input>
</div></form>`
        : ``
}
${
    game.user.isGM
        ? `<form><div class="form-group">
<label>Allow higher DC from alternate skills?</label>
<input type="checkbox" id="strict_rules" name="strict_rules"` +
          (game.settings.get("pf2e", "RAI.TreatWoundsAltSkills") ? ` checked` : ``) +
          `></input>
</div></form>`
        : ``
}
</form>
`,
        buttons: {
            yes: {
                icon: `<i class="fas fa-hand-holding-medical"></i>`,
                label: "Treat Wounds",
                callback: applyChanges,
            },
            no: {
                icon: `<i class="fas fa-times"></i>`,
                label: "Cancel",
            },
        },
        default: "yes",
    });
    dialog.render(true);
}
