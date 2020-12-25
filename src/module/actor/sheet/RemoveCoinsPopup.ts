/* global FormApplication ui */
import { calculateValueOfCurrency, removeCoinsSimple } from '../../item/treasure';

/**
 * @category Other
 */
export class RemoveCoinsPopup extends FormApplication {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = 'remove-coins';
        options.classes = [];
        options.title = 'Remove Coins';
        options.template = 'systems/pf2e/templates/actors/remove-coins.html';
        options.width = "auto";
        return options;
    }

    activateListeners(html) {
        super.activateListeners(html);
    }

    async _updateObject(event: Event, formData: any) {
        const actor = this.object;
        const items = actor.data.items || [];
        const coinsToRemove = {
                pp: formData.pp,
                gp: formData.gp,
                sp: formData.sp,
                cp: formData.cp,
        }
        const actorCoins = calculateValueOfCurrency (items);
        if  (formData.removeByValue) {
            //  Convert actorCoins and coinsToRemove to copper to facilitate comparison
            const actorCoinsCopper = actorCoins.cp + actorCoins.sp * 10 + actorCoins.gp * 100 + actorCoins.pp * 1000;
            let copperToRemove = coinsToRemove.cp + coinsToRemove.sp * 10 + coinsToRemove.gp * 100 + coinsToRemove.pp * 1000;
            //  Error if total is not sufficient, will not be possible to construct a valid new coinsToRemove
            if (copperToRemove > actorCoinsCopper) {
                ui.notifications.warn("Insufficient Coins");
                return;
            }
            //  Build new coinsToRemove now that we know the total is sufficient
            if (actorCoins.pp * 1000 > copperToRemove) {
                const ppToRemove = Math.trunc(copperToRemove / 1000);
                coinsToRemove.pp = ppToRemove;
                copperToRemove -= ppToRemove * 1000;
            } else {
                coinsToRemove.pp = actorCoins.pp;
                copperToRemove -= actorCoins.pp * 1000;
            }
            if (actorCoins.gp * 100 > copperToRemove) {
                const gpToRemove = Math.trunc(copperToRemove / 100);
                coinsToRemove.gp = gpToRemove;
                copperToRemove -= gpToRemove * 100;
            } else {
                coinsToRemove.gp = actorCoins.gp;
                copperToRemove -= actorCoins.gp * 100;
            }
            if (actorCoins.sp * 10 > copperToRemove) {
                const spToRemove = Math.trunc(copperToRemove / 10);
                coinsToRemove.sp = spToRemove;
                copperToRemove -= spToRemove * 10;
            } else {
                coinsToRemove.sp = actorCoins.sp;
                copperToRemove -= actorCoins.sp * 10;
            }
            coinsToRemove.cp = copperToRemove;
        }
        if (coinsToRemove.pp <= actorCoins.pp &&
            coinsToRemove.gp <= actorCoins.gp &&
            coinsToRemove.sp <= actorCoins.sp &&
            coinsToRemove.cp <= actorCoins.cp)
        {
            await removeCoinsSimple(actor,{coins: coinsToRemove});
        } else {
            ui.notifications.warn("Insufficient coins");
        }
    }

    getData() {
        return {
        }
    }
}