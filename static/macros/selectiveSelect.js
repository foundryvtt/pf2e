async function selectOnly(selectChoice)
{
    let release=false;
    for (const token of canvas.tokens.controlled) {
        switch(selectChoice){
            case "playersOnly":
                if(!token.actor.hasPlayerOwner)
                    release=true;
                break;
            case "nonHostiles":
                if(token.data.disposition<0)
                    release=true;
                break;
            case "hostiles":
                if(token.data.disposition>=0)
                    release=true;
                break;
            case "NPCs":
                if(token.actor.hasPlayerOwner)
                    release=true;
        }
        if(release)
            token.release();
        release=false;
    }
}
let applyChanges=false;
new Dialog({
  title: `Selective Select`,
  content: `
    <form>
      <div class="form-group">
        <select id="select-type" name="select-type">
            <option value="playersOnly">Player Controlled Only</option>
            <option value="nonHostiles">Non Hostiles</option>
            <option value="hostiles">Hostiles</option>
            <option value="NPCs">NPCs Only</option>
        </select>
      </div>
    </form>
    `,
  buttons: {
    yes: {
      icon: "<i class='fas fa-check'></i>",
      label: `Apply Changes`,
      callback: () => applyChanges = true
    },
    no: {
      icon: "<i class='fas fa-times'></i>",
      label: `Cancel Changes`
    },
  },
  default: "yes",
  close: html => {
      if (applyChanges) {
            let applyType = html.find('[name="select-type"]')[0].value || null;
            if(applyType) 
                selectOnly(applyType);
        }
    }
}).render(true);