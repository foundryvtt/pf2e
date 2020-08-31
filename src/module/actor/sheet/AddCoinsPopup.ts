/* global FormApplication */
import { addCoinsSimple } from '../../item/treasure';

export class AddCoinsPopup extends FormApplication {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = 'add-coins';
        options.classes = [];
        options.title = 'Add Coins';
        options.template = 'systems/pf2e/templates/actors/add-coins.html';
        options.width = "auto";
        return options;
    }

    activateListeners(html) {
        super.activateListeners(html);
    }

    async _updateObject(event: Event, formData: any) {
        const actor = this.object;
        addCoinsSimple(actor, {
            coins: {
                pp: formData.pp,
                gp: formData.gp,
                sp: formData.sp,
                cp: formData.cp,
            },
            combineStacks: formData.combineStacks,
        });
    }

    getData() {
        return { }
    }
}