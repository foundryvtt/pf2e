const rollTreatWounds = async ({DC, bonus, med, name}) => {
  const options = actor.getRollOptions([
    "all",
    "skill-check",
    "medicine",
  ]);

  options.push('treat wounds');
  options.push('action:treat-wounds');

  med.roll(event, options, (roll) => {
    const baseRoll = roll.terms[0].results[0].result;
    const crit = baseRoll === 1  ?
                   -1 :
                 baseRoll === 20 ?
                   1 : 0;

    const success = roll.total >= DC + 10 ?
                      2 :
                    roll.total >= DC      ?
                      1 :
                    roll.total <= DC - 10 ?
                     -1 : 0;

    let healFormula, successLabel;

    const bonusString = bonus > 0 ? `+ ${bonus}` : "";
    if (success + crit > 1) {
      healFormula = `4d8${bonusString}`;
      successLabel = "Critical Success";
    } else if (success + crit === 1) {
      healFormula = `2d8${bonusString}`;
      successLabel = "Success";
    } else if (success + crit < 0) {
      healFormula = "1d8";
      successLabel = "Critical Failure";
    }
    if (healFormula !== undefined) {
      const healRoll = new Roll(healFormula).roll();
      const rollType = success > 0 ? "Healing" : "Damage";
      ChatMessage.create({
        user: game.user.id,
        type: CHAT_MESSAGE_TYPES.ROLL,
        flavor: `<strong>${rollType} Roll: Treat Wounds</strong> (${successLabel})`,
        roll: healRoll,
        speaker: ChatMessage.getSpeaker()
      }, { });
    }
  })
};


const applyChanges = ($html) => {
  for (const token of canvas.tokens.controlled) {
    const {med} = token.actor.data.data.skills;
    const {name} = token;
    const mod = parseInt($html.find('[name="modifier"]').val()) || 0;
    const requestedProf = parseInt($html.find('[name="dc-type"]')[0].value) || 1;
    const usedProf = requestedProf <= med.rank ? requestedProf : med.rank;
    const roll = [
      () => ui.notifications.warn(`${name} is not trained in Medicine and doesn't know how to treat wounds.`),
      () => rollTreatWounds({DC: 15 + mod, bonus: 0, med, name}),
      () => rollTreatWounds({DC: 20 + mod, bonus: 10, med, name}),
      () => rollTreatWounds({DC: 30 + mod, bonus: 30, med, name}),
      () => rollTreatWounds({DC: 40 + mod, bonus: 50, med, name})
    ][usedProf];

    roll();
  }
};

if (token === undefined) {
  ui.notifications.warn("No token is selected.");
} else {
  const dialog = new Dialog({
    title: "Treat Wounds",
    content: `
<div>Select a target DC. Remember that you can't attempt a heal above your proficiency. Attempting to do so will downgrade the DC and amount healed to the highest you're capable of.</div>
<hr/>
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
<div class="form-group">
<label>DC Modifier:</label>
<input id="modifier" name="modifier" type="number"/>
</div>
</form>
`,
    buttons: {
      yes: {
        icon: `<i class="fas fa-hand-holding-medical"></i>`,
        label: "Treat Wounds",
        callback: applyChanges
      },
      no: {
        icon: `<i class="fas fa-times"></i>`,
        label: "Cancel"
      },
    },
    default: "yes"
  });
  dialog.render(true);
}