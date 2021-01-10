import { calculateValueOfCurrency, attemptToRemoveCoinsByValue, removeCoinsSimple } from '../../item/treasure';

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
        const coinsToRemove = {
            pp: formData.pp,
            gp: formData.gp,
            sp: formData.sp,
            cp: formData.cp,
        };
        if (formData.removeByValue) {
            if (!(await attemptToRemoveCoinsByValue({ actor, coinsToRemove }))) {
                ui.notifications.warn('Insufficient coins');
            }
        } else {
            const actorCoins = calculateValueOfCurrency(actor.data.items || []);
            if (
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
    }

    getData() {
        return {};
    }
}
