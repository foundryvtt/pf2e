let toChat = (content, rollString) => {
    let chatData = {
        user: game.user.id,
        content,
        speaker: ChatMessage.getSpeaker(),
    }
    ChatMessage.create(chatData, {})
    if (rollString) {
        let roll = new Roll(rollString).roll();
        chatData = {
            ...chatData,
            flavor: "Treat Wounds Result",
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            roll
          }
        ChatMessage.create(chatData, {})
    }
    
}

const handleCrits = (roll) => roll === 1 ? -10 : (roll === 20 ? 10 : 0);

let rollTreatWounds = (args) => {
    let {DC, bonus, med, name} = args;

    const roll = new Roll(`d20`).roll().total;
    const crit = handleCrits(roll)

    let message = `${name} Treats Wounds at a DC ${DC}... they roll a [[${roll}+${med.value}]] and`;

    if (roll + crit + med.value >= DC+10) {
        toChat(`${message} critically succeed!`, `4d8+${bonus}`);
    } else if (roll+crit + med.value >= DC) {
        toChat(`${message} succeed.`, `2d8+${bonus}`);
    } else if (roll + crit + med.value < DC-10) {
        toChat(`${message} critically fail! The target takes damage.`, '1d8');
    } else if (roll+crit + med.value < DC) {
        toChat(`${message} fail.`);
    }
    
}

let applyChanges = false;
new Dialog({
  title: `Treat Wounds`,
  content: `
    <form>
      <div class="form-group">
        <label>Medicine DC:</label>
        <select id="dc-type" name="dc-type">
          <option value="trained">Trained DC 15</option>
          <option value="expert">Expert DC 20, +10 Healing</option>
          <option value="master">Master DC 30, +30 Healing</option>
          <option value="legendary">Legendary DC 40, +50 Healing</option>
        </select>

        <label>Modifier:</label>
        <input id="modifier" name="modifier" type="number"/>
      </div>
    </form>
    `,
  buttons: {
    yes: {
      icon: "<i class='fas fa-check'></i>",
      label: `Treat Wounds`,
      callback: () => applyChanges = true
    },
    no: {
      icon: "<i class='fas fa-times'></i>",
      label: `Cancel`
    },
  },
  default: "yes",
  close: html => {
    if (applyChanges) {
      for ( let token of canvas.tokens.controlled ) {
        const {med} = token.actor.data.data.skills;
        const {name} = token;
        let prof = html.find('[name="dc-type"]')[0].value || "trained";
        let mod = html.find('[name="modifier"]')[0].value || 0;
        if (prof === 'legendary') {
            if (med.rank >= 4) {
                return rollTreatWounds({DC: 40+mod, bonus: 50, med, name});
            }
            prof = 'master';
        } 
        if (prof === 'master') {
            if (med.rank >= 3) {
                return rollTreatWounds({DC: 30+mod, bonus: 30, med, name});
            }
            prof = 'expert';
        }
        if (prof === 'expert') {
            if (med.rank >= 2) {
                return rollTreatWounds({DC: 20+mod, bonus: 10, med, name});
            }
            prof = 'trained';
        }
        if (prof === 'trained') {
            if (med.rank >= 1) {
                return rollTreatWounds({DC: 15+mod, bonus: 0, med, name});
            }
        }
        toChat(`${name} is not trained in Medicine, and doesn't know how to treat wounds!`);
        return;
      }
    }
  }
}).render(true);