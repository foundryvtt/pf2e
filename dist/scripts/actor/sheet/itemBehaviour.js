/***************************************************************************************
 * 
 *   Document that contains the hooks that implement certain feats.
 * 
 ***************************************************************************************/

Hooks.on("preCreateOwnedItem", (actor, actorId, item) => {
    actor.itemBehaviour(item);
});

Hooks.on("preUpdateOwnedItem", (actor, actorId, item) => {
    if (actor.getOwnedItem(item._id).data.name.trim() == item.name.trim()) return;

    // Removing old item effect
    actor.itemBehaviour(actor.getOwnedItem(item._id).data, false); 
    // applying new item effect
    actor.itemBehaviour(item); 
});

Hooks.on("preDeleteOwnedItem", (actor, actorId, item) => {
    actor.itemBehaviour(actor.getOwnedItem(item).data, false); 
});

Actor.prototype.itemBehaviour = async function(item, create=true) {
    if (item.name == 'Diehard') this.itemFeatDiehard(create);
}
Actor.prototype.itemFeatDiehard = async function(create=true) {
    if (create) {
        console.log('PF2e | Applying Feat effect: Diehard');
        await this.update({
            // # Only use this if there are also other methods that affect when you die from the Dying condition.
        //    'data.attributes.dying.max': this.data.data.attributes.dying.max + 1
            // # This is saver
            'data.attributes.dying.max': 5
        });
    } else {
        console.log('PF2e | Removing Feat effect: Diehard');
        if( this.data.data.attributes.dying.value > 4 ) this.data.data.attributes.dying.value = 4;
        await this.update({
            // # Only use this if there are also other methods that affect when you die from the Dying condition.
        //     'data.attributes.dying.max': this.data.data.attributes.dying.max - 1
            // # This is saver
            'data.attributes.dying.max': 4,
            'data.attributes.dying.value': this.data.data.attributes.dying.value
        });
    }
}