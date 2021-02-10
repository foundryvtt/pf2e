import { addCoins, Coins } from '@item/treasure';
import { PF2EActor } from '@actor/actor';

interface AddCoinsFormData extends Coins {
    combineStacks: boolean;
}

/**
 * @category Other
 */
export class AddCoinsPopup extends FormApplication<PF2EActor> {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = 'add-coins';
        options.classes = [];
        options.title = 'Add Coins';
        options.template = 'systems/pf2e/templates/actors/add-coins.html';
        options.width = 'auto';
        return options;
    }

    async _updateObject(_event: Event, formData: AddCoinsFormData) {
        const actor = this.object;
        addCoins(actor, {
            coins: {
                pp: formData.pp,
                gp: formData.gp,
                sp: formData.sp,
                cp: formData.cp,
            },
            combineStacks: formData.combineStacks,
        });
    }
}
