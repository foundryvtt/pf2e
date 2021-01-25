async function setInitSkill(skillname)
{
    canvas.tokens.controlled.forEach(async function(changetoken){
        if(changetoken.actor.data.type!="character"){
            let skillval=changetoken.actor.data.data.skills[skillname].totalModifier;
            await changetoken.actor.update({
            'data.attributes.initiative.ability':skillname,
            'data.attributes.initiative.totalModifier':skillval
            });    
        }else{
            await changetoken.actor.update({
            'data.attributes.initiative.ability':skillname
            });
        }
    });
}

let applyChanges=false;
new Dialog({
  title: `Set Initiative Skill`,
  content: `
    <form>
      <div class="form-group">
        <select id="init-skill" name="init-skill">
            <option value="perception" selected="">Perception</option>
            <option value="acr">Acrobatics</option>
            <option value="arc">Arcana</option>
            <option value="ath">Athletics</option>
            <option value="cra">Crafting</option>
            <option value="dec">Deception</option>
            <option value="dip">Diplomacy</option>
            <option value="itm">Intimidation</option>
            <option value="med">Medicine</option>
            <option value="nat">Nature</option>
            <option value="occ">Occultism</option>
            <option value="prf">Performance</option>
            <option value="rel">Religion</option>
            <option value="soc">Society</option>
            <option value="ste">Stealth</option>
            <option value="sur">Survival</option>
            <option value="thi">Thievery</option>
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
        let skillchoice = html.find('[name="init-skill"]')[0].value || "perception";
        setInitSkill(skillchoice);
        }
    }
}).render(true);