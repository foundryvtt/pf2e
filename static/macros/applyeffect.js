let applyChanges = false;
const compendiumName="pf2e.spell-effects";
const effectCompendium = game.packs.get(compendiumName);
let effectList=[];

async function getEffectList(){
    if(effectList.length<=0){
        let effects = await effectCompendium.getContent();
        for(let count=0;count<effects.length;count++){
            if(effects[count].name.indexOf('Spell Effect:')!=-1)
                effectList.push({"UUID": "Compendium."+compendiumName+"."+effects[count]._id,"Name": effects[count].name});
        }
    }
    return effectList;
}
async function optionList() {
    let optionlist='';
    const list=await getEffectList();
    for(let count=0;count<list.length;count++){
        optionlist+='<option value="' + count + '">'+ list[count].Name + '</option>';
    }
    return optionlist;
}

async function applyEffect(effectItem)
{
    const item = await fromUuid(effectItem.UUID);
    for (const token of canvas.tokens.controlled) {
        let existing = token.actor.items.filter(i => i.type === item.type).find(e => e.name === item.name);
        if (existing) {
            await token.actor.deleteOwnedItem(existing._id);
        } else {
            let owneditemdata = await token.actor.createOwnedItem(item);
            owneditemdata.data.start.value=game.time.worldTime;
        }
    }
}

new Dialog({
  title: `Apply Effect`,
  content: `
    <form>
      <div class="form-group">
        <label>Effect:</label>
        <select id="effectChoice" name="effectChoice">` + (await optionList()) + `
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
        let effectid = html.find('[name="effectChoice"]')[0].value;
        let effectItem=getEffectList()[effectid];
        //console.log(effectItem);
        applyEffect(effectItem);

    }
  }
}).render(true);
