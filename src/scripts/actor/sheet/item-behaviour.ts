// @ts-nocheck

/* *************************************************************************************
 *
 *   Document that contains the hooks that implement certain feats.
 *
 ************************************************************************************* */

Hooks.on('preCreateOwnedItem', (actor, item) => {
    actor.itemBehaviour(item);
});
Hooks.on('preUpdateOwnedItem', (actor, item, itemUpdate) => {
    if (itemUpdate.name) {
        actor.itemBehaviour(item, false);
        actor.itemBehaviour(itemUpdate);
    }
});
Hooks.on('preDeleteOwnedItem', (actor, item) => {
    actor.itemBehaviour(item, false);
});

/* *************************************************************************************
 *   The hooks call the methods below.
 ************************************************************************************* */
Actor.prototype.itemBehaviour = async function itemBehaviour(item: ItemData, create = true) {
    if (item.name === 'Toughness') this.itemFeatToughness(create);
    else if (item.name === 'Mountain’s Stoutness' || item.name === "Mountain's Stoutness")
        this.itemFeatMountainsstoutness(create);
};

Actor.prototype.itemFeatToughness = async function itemFeatToughness(create = true) {
    if (create) {
        let recoveryMod = getProperty(this.data.data.attributes, 'dying.recoveryMod') || 0;
        const levelBonusHp = parseInt(getProperty(this.data.data.attributes, 'levelbonushp') || 0, 10);
        recoveryMod = recoveryMod === -1 ? -4 : -1; // rework if there are more ways then Toughness & Mountain's Stoutness to affect recovery DC

        console.log('PF2e | Applying Feat effect: Toughness');
        ui.notifications.info(
            'Applied Toughness: your maximum HP is increased by your level and your recovery roll DC has decreased',
        );
        await this.update({
            'data.attributes.dying.recoveryMod': recoveryMod,
            'data.attributes.levelbonushp': levelBonusHp + 1,
        });
    } else {
        let recoveryMod = getProperty(this.data.data.attributes, 'dying.recoveryMod') || 0;
        const levelBonusHp = parseInt(getProperty(this.data.data.attributes, 'levelbonushp') || 1, 10);
        recoveryMod = recoveryMod === -4 ? -1 : 0; // rework if there are more ways then Toughness & Mountain's Stoutness to affect recovery DC

        console.log('PF2e | Removing Feat effect: Toughness');
        ui.notifications.info(
            'Removed Toughness: your maximum HP is decreased by your level and your recovery roll DC has increased',
        );
        await this.update({
            'data.attributes.dying.recoveryMod': recoveryMod,
            'data.attributes.levelbonushp': levelBonusHp - 1,
        });
    }
};
Actor.prototype.itemFeatMountainsstoutness = async function itemFeatMountainsstoutness(create = true) {
    if (create) {
        let recoveryMod = getProperty(this.data.data.attributes, 'dying.recoveryMod') || 0;
        const levelBonusHp = parseInt(getProperty(this.data.data.attributes, 'levelbonushp') || 0, 10);
        recoveryMod = recoveryMod === -1 ? -4 : -1; // rework if there are more ways then Toughness & Mountain's Stoutness to affect recovery DC

        console.log('PF2e | Applying Feat effect: Mountain’s Stoutness');
        ui.notifications.info(
            'Applied Mountain’s Stoutness: your maximum HP is increased by your level and your recovery roll DC has decreased',
        );
        await this.update({
            'data.attributes.dying.recoveryMod': recoveryMod,
            'data.attributes.levelbonushp': levelBonusHp + 1,
        });
    } else {
        let recoveryMod = getProperty(this.data.data.attributes, 'dying.recoveryMod') || 0;
        const levelBonusHp = parseInt(getProperty(this.data.data.attributes, 'levelbonushp') || 1, 10);
        recoveryMod = recoveryMod === -4 ? -1 : 0; // rework if there are more ways then Toughness & Mountain's Stoutness to affect recovery DC

        console.log('PF2e | Removing Feat effect: Mountain’s Stoutness');
        ui.notifications.info(
            'Removed Mountain’s Stoutness: your maximum HP is decreased by your level and your recovery roll DC has increased',
        );
        await this.update({
            'data.attributes.dying.recoveryMod': recoveryMod,
            'data.attributes.levelbonushp': levelBonusHp - 1,
        });
    }
};
