/* global FormApplication ui */
import { addCoinsSimple, calculateValueOfCurrency, removeCoinsSimple } from '../../item/treasure';

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
        options.width = 'auto';
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
        };
        const coinsToAdd = {
            pp: 0,
            gp: 0,
            sp: 0,
            cp: 0,
        };
        const actorCoins = calculateValueOfCurrency(items);
        if (formData.removeByValue) {
            //  Convert actorCoins and coinsToRemove to copper to facilitate comparison
            const actorCoinsCopper = actorCoins.cp + actorCoins.sp * 10 + actorCoins.gp * 100 + actorCoins.pp * 1000;
            let valueToRemoveInCopper =
                coinsToRemove.cp + coinsToRemove.sp * 10 + coinsToRemove.gp * 100 + coinsToRemove.pp * 1000;
            //  Error if total is not sufficient, will not be possible to construct a valid new coinsToRemove
            if (valueToRemoveInCopper > actorCoinsCopper) {
                ui.notifications.warn('Insufficient Coins');
                return;
            }
            let coinsBroken = false;
            //  Choose quantities of each coin to remove from smallest to largest to ensure we don't end in a situation where we need to break a coin that has already been "removed"
            if (valueToRemoveInCopper % 10 > actorCoins.cp) {
                coinsToAdd.cp = 10;
                coinsToRemove.cp = valueToRemoveInCopper % 10;
                valueToRemoveInCopper += 10 - coinsToRemove.cp;
                coinsBroken = true;
            } else {
                coinsToRemove.cp = valueToRemoveInCopper % 10; //  remove the units that other coins can't handle first
                valueToRemoveInCopper -= coinsToRemove.cp;
                actorCoins.cp -= coinsToRemove.cp;
                const extraCopper = Math.min(valueToRemoveInCopper / 10, Math.trunc(actorCoins.cp / 10)) * 10;
                coinsToRemove.cp += extraCopper;
                valueToRemoveInCopper -= extraCopper;
            }

            if ((valueToRemoveInCopper / 10) % 10 > actorCoins.sp) {
                coinsToAdd.sp = 10;
                coinsToRemove.sp = (valueToRemoveInCopper / 10) % 10;
                valueToRemoveInCopper += 100 - coinsToRemove.sp * 10;
                coinsBroken = true;
            } else {
                coinsToRemove.sp = (valueToRemoveInCopper / 10) % 10; //  remove the units that other coins can't handle first
                valueToRemoveInCopper -= coinsToRemove.sp * 10;
                actorCoins.sp -= coinsToRemove.sp;
                const extraSilver = Math.min(valueToRemoveInCopper / 100, Math.trunc(actorCoins.sp / 10)) * 10;
                coinsToRemove.sp += extraSilver;
                valueToRemoveInCopper -= extraSilver * 10;
            }

            if ((valueToRemoveInCopper / 100) % 10 > actorCoins.gp) {
                coinsToAdd.gp = 10;
                coinsToRemove.gp = (valueToRemoveInCopper / 100) % 10;
                valueToRemoveInCopper += 1000 - coinsToRemove.gp * 100;
                coinsBroken = true;
            } else {
                coinsToRemove.gp = (valueToRemoveInCopper / 100) % 10; //  remove the units that other coins can't handle first
                valueToRemoveInCopper -= coinsToRemove.gp * 100;
                actorCoins.gp -= coinsToRemove.gp;
                const extraGold = Math.min(valueToRemoveInCopper / 1000, Math.trunc(actorCoins.gp / 10)) * 10;
                coinsToRemove.gp += extraGold;
                valueToRemoveInCopper -= extraGold * 100;
            }

            coinsToRemove.pp = valueToRemoveInCopper / 1000;

            if (coinsBroken) {
                await addCoinsSimple(actor, { coins: coinsToAdd });
            }
            removeCoinsSimple(actor, { coins: coinsToRemove });
        } else if (
            coinsToRemove.pp <= actorCoins.pp &&
            coinsToRemove.gp <= actorCoins.gp &&
            coinsToRemove.sp <= actorCoins.sp &&
            coinsToRemove.cp <= actorCoins.cp
        ) {
            removeCoinsSimple(actor, { coins: coinsToRemove });
        } else {
            ui.notifications.warn('Insufficient coins');
        }
    }

    getData() {
        return {};
    }
}
