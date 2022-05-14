import { Coins } from "@item/physical/data";
import { ActorPF2e } from "../../base";

interface PopupFormData extends Coins {
    removeByValue: boolean;
}

/**
 * @category Other
 */
export class RemoveCoinsPopup extends FormApplication<ActorPF2e> {
    static override get defaultOptions() {
        const options = super.defaultOptions;
        options.id = "remove-coins";
        options.classes = [];
        options.title = "Remove Coins";
        options.template = "systems/pf2e/templates/actors/remove-coins.html";
        options.width = "auto";
        return options;
    }

    override async _updateObject(_event: Event, formData: Record<string, unknown> & PopupFormData) {
        const actor = this.object;
        const coinsToRemove = {
            pp: formData.pp,
            gp: formData.gp,
            sp: formData.sp,
            cp: formData.cp,
        };

        if (!(await actor.removeCoins(coinsToRemove, { byValue: formData.removeByValue }))) {
            ui.notifications.warn("PF2E.ErrorMessage.NotEnoughCoins", { localize: true });
        }
    }
}
