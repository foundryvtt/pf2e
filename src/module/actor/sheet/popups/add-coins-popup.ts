import { addCoins, Coins } from '@item/treasure/helpers';
import { ActorPF2e } from '@actor/base';

interface AddCoinsFormData extends Coins {
    combineStacks: boolean;
}

/**
 * @category Other
 */
export class AddCoinsPopup extends FormApplication<ActorPF2e> {
    static override get defaultOptions() {
        const options = super.defaultOptions;
        options.id = 'add-coins';
        options.classes = [];
        options.title = 'Add Coins';
        options.template = 'systems/pf2e/templates/actors/add-coins.html';
        options.width = 'auto';
        return options;
    }

    override async _updateObject(_event: Event, formData: AddCoinsFormData) {
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
