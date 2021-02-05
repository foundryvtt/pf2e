let applyChanges = false;
const compendiumName="pf2e.conditionitems";
const conditionCompendium = game.packs.get(compendiumName);
let conditionList=[];

async function getConditionList(){
    if(conditionList.length<=0){
        let compendiumEntries = await conditionCompendium.getContent();
        console.log(compendiumEntries);
            for(let count=0;count<compendiumEntries.length;count++){
                conditionList.push({"UUID": "Compendium."+compendiumName+"."+compendiumEntries[count]._id,"Name": compendiumEntries[count].name});
            }
        }
    return conditionList;
}

async function optionList() {
    let optionlist='';
    const list=await getConditionList();
    console.log(list);
    for(let count=0;count<list.length;count++){
        optionlist+='<option value="' + count + '">'+ list[count].Name + '</option>';
    }
    console.log(optionlist);
    return optionlist;
}

async function applyCondition(conditionId, applytype)
{
    let conditionItem=conditionList[conditionId];
    const item = await fromUuid(conditionItem.UUID);
    for (const token of canvas.tokens.controlled) {
        let existing = token.actor.items.filter(i => i.type === item.type).find(e => e.name === item.name);
        if(applytype=="subtractive" && existing){ 
            if(existing.data.data.value.isValued && existing.data.data.value.value>1){
                const update = duplicate(existing);
                update.data.value.value--;
                await token.actor.updateEmbeddedEntity('OwnedItem', update);
            }
            else{
                await token.actor.deleteOwnedItem(existing._id);
            }
        }
        else if(existing && applytype=="additive" && existing.data.data.value.isValued){
                const update = duplicate(existing);
                update.data.value.value++;
                await token.actor.updateEmbeddedEntity('OwnedItem', update);
        } else if(!existing && applytype=="additive") {
            const newCondition = PF2eConditionManager.getCondition(conditionItem.Name);
            newCondition.data.sources.hud = !0,
            await PF2eConditionManager.addConditionToToken(newCondition, token);
        }
        await PF2eConditionManager.processConditions(token);
    }
}

new Dialog({
  title: `Apply Condition`,
  content: `
    <form>
      <div class="form-group-stacked">
        <label>Condition:</label>
        <select id="conditionChoice" name="conditionChoice">` + (await optionList()) + `
        </select><div class="form-group">
        <input type="radio" id="additive" name="applyType" value="additive" checked="true"/>
        <label for="additive">Add/Increment</label><BR/>
        <input type="radio" id="subtractive" name="applyType" value="subtractive"/>
        <label for="subtractive">Remove/Decrement</label>
        </div>
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
          var applytype="additive";
        let conditionid = html.find('[name="conditionChoice"]')[0].value;
        const radios=html.find('[name="applyType"]');
        for(var count=0;count<radios.length;count++){
            if(radios[count].checked){
                applytype=radios[count].value;
                break;
            }
        }
        applyCondition(conditionid,applytype);
    }
  }
}).render(true);
