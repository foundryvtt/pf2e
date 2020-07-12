let toChat = (content) => {
    let chatData = {
        user: game.user.id,
        content,
        speaker: ChatMessage.getSpeaker(),
    }
    ChatMessage.create(chatData, {})
}

let applyChanges = false;
new Dialog({
  title: `Rest`,
  content: `
    <div>Rest for the night?</div>
    `,
  buttons: {
    yes: {
      icon: "<i class='fas fa-check'></i>",
      label: `Rest`,
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
            const {name} = token;
            console.log(token);
            const spellcastingEntries = token.actor.data.items.filter(i => i.type === "spellcastingEntry" && i.name !== "Scrolls");
            const {sp, hp} = token.actor.data.data.attributes;
            const {abilities} = token.actor.data.data;
            const {level, keyability} = token.actor.data.data.details;
            const hpRestored = Math.max(abilities.con.mod,1)*level.value;

            toChat(`${name} goes to bed. ${hpRestored} HP restored. SP fully restored. Resolve points refreshed. `);
            token.actor.update({
                'data.attributes.hp.value': Math.clamped(0, hp.value+hpRestored, hp.max),
                'data.attributes.sp.value': sp.max,
                'data.attributes.resolve.value': abilities[keyability.value].mod
            });
           
        }
      }
    }
}).render(true);