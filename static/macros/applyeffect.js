let applyChanges = false;
const compendiumName="pf2e.spell-effects";
const effectCompendium = game.packs.get(compendiumName);
let effectList=[];

function getEffectList(){
    if(effectList.length<=0){
        for(let count=0;count<effectCompendium.index.length;count++){
            if(effectCompendium.index[count].name.indexOf('Spell Effect:')!=-1)
                effectList.push({"UUID": "Compendium."+compendiumName+"."+effectCompendium.index[count]._id,"Name": effectCompendium.index[count].name});
        }
    }
    return effectList;
}

function optionList() {
    let optionlist='';
    const list=getEffectList();
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
        await token.actor.createOwnedItem(item);
        }
    }
}

new Dialog({
  title: `Apply Effect`,
  content: `
    <form>
      <div class="form-group">
        <label>Effect:</label>
        <select id="effectChoice" name="effectChoice">` + optionList() + `
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